/**
 * Connector registry — the single READ surface that composes everything known about a
 * connector by key (#890), over the three concern-modules that each own one facet:
 *
 *   - `connector-manifest.ts`  — marketplace SHAPE: auth type, capability scopes, cadence,
 *                                 identity map, capabilities (ADR-0076). Gates the catalog.
 *   - `company-providers.ts`   — how a company CREDENTIAL is collected: the form fields /
 *                                 consent flow handed to the backend credential store (ADR-0036).
 *   - `pipeline-refresh.ts`    — the cloud-pipeline on-demand REFRESH source (pipeline ADR-0011).
 *
 * Those three stay the source of truth for their own concern — they are deliberately NOT
 * merged into one list, because the concerns are distinct and the key sets only partially
 * overlap: marketplace-only connectors (apollo), consent-only providers intentionally absent
 * from the catalog (qbo, docusign), and credential providers with no refresh yet
 * (myitprocess, quotemanager). This module is the one place a caller can ask "give me the whole picture for key X"
 * via `connectorFor(key)` instead of importing and cross-referencing all three.
 *
 * SCOPES — two distinct, intentionally-different concepts (do NOT force them equal):
 *   • `manifest.scopes`  = the connector's CAPABILITY scopes (what it can do, incl. write-back
 *     — e.g. autotask declares `tickets:write` per ADR-0074).
 *   • `provider.scopes`  = the credential-grant scopes RECORDED on the connection row for
 *     display/audit (e.g. autotask records read-only `tickets:read`/`companies:read`).
 *   They differ for the same connector by design; the registry surfaces both rather than
 *   collapsing them.
 *
 * PURE / edge-safe: composes three pure modules; no pg, no node:*, no env, no secrets.
 */
import {
  CONNECTOR_MANIFESTS,
  getConnectorManifest,
  type ConnectorManifest,
} from "./connector-manifest";
import { COMPANY_PROVIDERS, type CompanyProvider } from "./company-providers";
import { REFRESH_SOURCES, type RefreshSource } from "./pipeline-refresh";

/** Everything known about a connector, composed across the three concern-modules by key. */
export interface ConnectorDefinition {
  key: string;
  /** Marketplace shape — present when the connector is in the catalog (ADR-0076). */
  manifest?: ConnectorManifest;
  /** Company-credential collection form / consent — present when company-configurable (ADR-0036). */
  provider?: CompanyProvider;
  /** Cloud-pipeline on-demand refresh source — present when refreshable (pipeline ADR-0011). */
  refresh?: RefreshSource;
}

const PROVIDER_BY_KEY: ReadonlyMap<string, CompanyProvider> = new Map(
  COMPANY_PROVIDERS.map((p) => [p.key, p]),
);

/** Compose the full definition for one connector key (any facet may be absent). */
export function connectorFor(key: string): ConnectorDefinition {
  return {
    key,
    manifest: getConnectorManifest(key),
    provider: PROVIDER_BY_KEY.get(key),
    refresh: REFRESH_SOURCES[key],
  };
}

/**
 * Whether the cloud pipeline can refresh this connector on demand (pipeline ADR-0011) — the
 * single cross-concern check the Settings cards use to decide whether to show "Refresh now".
 */
export function isRefreshable(key: string): boolean {
  return key in REFRESH_SOURCES;
}

/**
 * Every connector key across the three modules, de-duplicated, in a stable order: catalog
 * (manifest) order first, then company-providers not in the catalog, then any refresh-only
 * keys. Lets a caller enumerate the whole connector surface from one place.
 */
export function allConnectorKeys(): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const add = (key: string): void => {
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  };
  for (const m of CONNECTOR_MANIFESTS) add(m.key);
  for (const p of COMPANY_PROVIDERS) add(p.key);
  for (const key of Object.keys(REFRESH_SOURCES)) add(key);
  return keys;
}

/** The composed definition for every connector key, in `allConnectorKeys` order. */
export function allConnectors(): ConnectorDefinition[] {
  return allConnectorKeys().map(connectorFor);
}
