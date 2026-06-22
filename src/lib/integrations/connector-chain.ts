/**
 * Connector "client pipeline" chain (ADR-0112, epic #1141 unit E2). A per-client connector
 * advances through a 4-step pipeline before its external units appear on account pages:
 *
 *   1. credential — a secret is custodied so the connector can authenticate (ADR-0036).
 *   2. ingestion  — the collector has pulled the source into bronze at least once.
 *   3. discovery  — distinct client units (companies / tenants / sites) are visible to map.
 *   4. mapping    — those units are linked to Imperion accounts (manual `entity_xref` spine).
 *
 * (Step 5, the bronze→silver merge, lives in the Pipeline / LocalPipeline planes — it links
 * out from the connector card, it is not a status icon here.)
 *
 * This module is the PURE derivation of each step's status from the signals the connections
 * page already holds; the card renders the result as a row of status icons. It is deliberately
 * honest about the unknown — a connector whose bronze isn't wired yet shows discovery/mapping
 * as `pending`, never a false green. Most connectors are deploy-dormant until their credential
 * lands (CLAUDE.md §6), so a green chain must mean real progress.
 *
 * PURE / edge-safe: no pg, no node:*, no env — unit-tested directly (mirrors
 * `connector-manifest.ts` / `client-mapping.ts`).
 */
import type { ConnectorStatus } from "@/types";

/**
 * The connectors that map onto a *client* (account) and therefore carry the chain + the
 * "Edit client mappings" affordance. System/company-scope connectors (qbo, meta, docusign,
 * apollo, …) are one credential serving the whole org — they are deliberately omitted.
 * Superset of today's rendered manifests: pax8/myitprocess/quotemanager/televy/unifi join the
 * manifest registry later, but listing them here keeps the gate stable as they land (E3/F).
 */
export const CLIENT_SCOPED_CONNECTORS: ReadonlySet<string> = new Set([
  "m365",
  "autotask",
  "itglue",
  "pax8",
  "myitprocess",
  "quotemanager",
  "televy",
  "darkwebid",
  "unifi",
]);

/** Whether a connector maps onto a client account (renders the chain + Edit button). */
export function isClientScopedConnector(key: string): boolean {
  return CLIENT_SCOPED_CONNECTORS.has(key);
}

export type ChainStepKey = "credential" | "ingestion" | "discovery" | "mapping";

/** done = complete · active = in progress · pending = not started · blocked = errored/stuck. */
export type ChainStepStatus = "done" | "active" | "pending" | "blocked";

/** One rendered step: its identity, lucide icon, derived status, and a short non-secret tooltip. */
export interface ConnectorChainStep {
  key: ChainStepKey;
  label: string;
  icon: string;
  status: ChainStepStatus;
  detail: string;
}

/**
 * The signals the connections page can supply per connector. `unitsDiscovered`/`unitsMapped`
 * are `null` when the source isn't wired yet (no adapter / no bronze whitelist) — that is
 * "unknown", distinct from a known zero.
 */
export interface ConnectorChainSignals {
  /** A credential is custodied (company-credential ref present, or the instance is enabled). */
  hasCredential: boolean;
  /** `connector_instance` lifecycle status, or null when never enabled. */
  instanceStatus: ConnectorStatus | null;
  /** ISO timestamp of the last completed sync, or null. */
  lastSyncAt: string | null;
  /** Distinct external units seen; null = not wired (unknown). */
  unitsDiscovered: number | null;
  /** Units with a manual account link; null = unknown. */
  unitsMapped: number | null;
}

const ICON: Record<ChainStepKey, string> = {
  credential: "KeyRound",
  ingestion: "DownloadCloud",
  discovery: "ScanSearch",
  mapping: "Link2",
};

const LABEL: Record<ChainStepKey, string> = {
  credential: "Credential",
  ingestion: "Ingestion",
  discovery: "Discovery",
  mapping: "Mapping",
};

const PENDING_DETAIL: Record<ChainStepKey, string> = {
  credential: "No credential yet",
  ingestion: "Awaiting first sync",
  discovery: "No units discovered yet",
  mapping: "No accounts linked yet",
};

/** Derive the 4-step chain for one connector from its signals (pure). */
export function connectorChainSteps(signals: ConnectorChainSignals): ConnectorChainStep[] {
  const { hasCredential, instanceStatus, lastSyncAt, unitsDiscovered, unitsMapped } = signals;
  const errored = instanceStatus === "error";

  // 1. credential
  const credential: ChainStepStatus = hasCredential ? "done" : "pending";

  // 2. ingestion — needs a credential first; a completed sync is done, an in-flight one active.
  let ingestion: ChainStepStatus;
  if (!hasCredential) ingestion = "pending";
  else if (errored) ingestion = "blocked";
  else if (lastSyncAt) ingestion = "done";
  else if (
    instanceStatus === "connecting" ||
    instanceStatus === "first_sync" ||
    instanceStatus === "polling"
  )
    ingestion = "active";
  else ingestion = "pending";

  // 3. discovery — distinct units visible to map (null = source not wired → still pending).
  let discovery: ChainStepStatus;
  if (unitsDiscovered === null) discovery = ingestion === "done" ? "active" : "pending";
  else if (unitsDiscovered > 0) discovery = "done";
  else discovery = ingestion === "done" ? "active" : "pending";

  // 4. mapping — units linked to accounts; "done" only when every discovered unit is linked.
  let mapping: ChainStepStatus;
  if (unitsMapped === null || unitsDiscovered === null) mapping = "pending";
  else if (unitsMapped <= 0) mapping = discovery === "done" ? "active" : "pending";
  else if (unitsDiscovered > 0 && unitsMapped >= unitsDiscovered) mapping = "done";
  else mapping = "active";

  const status: Record<ChainStepKey, ChainStepStatus> = {
    credential,
    ingestion,
    discovery,
    mapping,
  };

  const detail: Record<ChainStepKey, string> = {
    credential: hasCredential ? "Credential custodied" : PENDING_DETAIL.credential,
    ingestion:
      ingestion === "done"
        ? `Last sync ${lastSyncAt?.slice(0, 16).replace("T", " ")}`
        : ingestion === "active"
          ? "Syncing"
          : ingestion === "blocked"
            ? "Sync errored"
            : PENDING_DETAIL.ingestion,
    discovery:
      unitsDiscovered && unitsDiscovered > 0
        ? `${unitsDiscovered} unit${unitsDiscovered === 1 ? "" : "s"} discovered`
        : PENDING_DETAIL.discovery,
    mapping:
      unitsMapped && unitsMapped > 0
        ? `${unitsMapped}${unitsDiscovered ? `/${unitsDiscovered}` : ""} linked to accounts`
        : PENDING_DETAIL.mapping,
  };

  const order: ChainStepKey[] = ["credential", "ingestion", "discovery", "mapping"];
  return order.map((key) => ({
    key,
    label: LABEL[key],
    icon: ICON[key],
    status: status[key],
    detail: detail[key],
  }));
}
