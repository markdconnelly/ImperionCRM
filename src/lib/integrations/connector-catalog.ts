/**
 * Connector catalog view-model (ADR-0076 §4, #416) — the pure layer behind the
 * connector marketplace GUI. It joins the in-code manifest registry (the "available"
 * catalog, `connector-manifest.ts`) with the persisted `connector_instance` rows (the
 * "connected" state) into one list the catalog page renders.
 *
 * The manifest is the source of truth for what a connector IS (auth, scopes, cadence,
 * capabilities); the instance carries the per-configuration lifecycle (status, granted
 * scopes, cadence override, last sync, health). An entry with no instance is simply
 * available-to-enable.
 *
 * PURE / edge-safe: no pg, no node:*, no env — unit-tested directly (mirrors
 * `semantic-model.ts` / `connector-manifest.ts`).
 */
import type { ConnectorInstance, ConnectorStatus } from "@/types";
import {
  effectiveCadenceMinutes,
  type ConnectorManifest,
} from "@/lib/integrations/connector-manifest";

/** The default account scope the catalog operates at (per-company scopes are future). */
export const GLOBAL_SCOPE = "global";

/** One catalog row: a manifest plus its instance for the active scope (or null). */
export interface ConnectorCatalogEntry {
  manifest: ConnectorManifest;
  /** The enabled instance for this connector in `scope`, or null if never enabled. */
  instance: ConnectorInstance | null;
  /** Lifecycle status — the instance status, or 'available' when not enabled. */
  status: ConnectorStatus;
  /** Whether the connector is enabled (has an instance past 'available'). */
  connected: boolean;
  /** Effective poll cadence in minutes: instance override else manifest default. */
  effectiveCadenceMinutes: number | null;
}

/**
 * Build the catalog: one entry per manifest, joined to the instance (if any) for
 * `scope`. Manifest order is preserved (the declared registry order). Instances for
 * other scopes are ignored — v1 manages the global scope only.
 */
export function buildConnectorCatalog(
  manifests: readonly ConnectorManifest[],
  instances: readonly ConnectorInstance[],
  scope: string = GLOBAL_SCOPE,
): ConnectorCatalogEntry[] {
  const byKey = new Map<string, ConnectorInstance>();
  for (const i of instances) {
    if (i.accountScope === scope) byKey.set(i.connectorKey, i);
  }
  return manifests.map((manifest) => {
    const instance = byKey.get(manifest.key) ?? null;
    const status: ConnectorStatus = instance?.status ?? "available";
    return {
      manifest,
      instance,
      status,
      connected: instance !== null && status !== "available",
      effectiveCadenceMinutes: effectiveCadenceMinutes(
        manifest.key,
        instance?.cadenceOverrideMinutes ?? null,
      ),
    };
  });
}

/** Catalog entries grouped by manifest category, groups in first-seen order. */
export function groupCatalogByCategory(
  entries: readonly ConnectorCatalogEntry[],
): { category: string; entries: ConnectorCatalogEntry[] }[] {
  const groups = new Map<string, ConnectorCatalogEntry[]>();
  for (const e of entries) {
    const list = groups.get(e.manifest.category) ?? [];
    list.push(e);
    groups.set(e.manifest.category, list);
  }
  return [...groups.entries()].map(([category, entries]) => ({ category, entries }));
}

/** UI label for each lifecycle status. */
export const STATUS_LABEL: Record<ConnectorStatus, string> = {
  available: "Available",
  connecting: "Connecting",
  connected: "Connected",
  first_sync: "First sync",
  polling: "Polling",
  error: "Error",
};

/** Semantic tone for each status, mapped by the UI to a badge colour. */
export type StatusTone = "neutral" | "pending" | "active" | "error";
export const STATUS_TONE: Record<ConnectorStatus, StatusTone> = {
  available: "neutral",
  connecting: "pending",
  connected: "active",
  first_sync: "pending",
  polling: "active",
  error: "error",
};

/** Human-readable poll cadence (e.g. "every 60 min", "daily", "on demand"). */
export function cadenceLabel(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes === 0) return "On demand";
  if (minutes % 1440 === 0) {
    const d = minutes / 1440;
    return d === 1 ? "Daily" : `Every ${d} days`;
  }
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return h === 1 ? "Hourly" : `Every ${h} hours`;
  }
  return `Every ${minutes} min`;
}
