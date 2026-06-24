/**
 * Connector manifest registry — the declarative source of truth for the integration
 * marketplace (ADR-0076 §1/§2). Each connector is described by a UNIFORM manifest
 * (auth type, scopes, default poll cadence, identity-map shape, capabilities) so the
 * catalog (#416) can browse/enable/configure connectors consistently, instead of the
 * bespoke per-integration wiring ADR-0076 replaces.
 *
 * ADR-0076 §1: "Manifests are versioned in code; the registry is the catalog's source
 * of truth." So this is a CODE artifact, NOT a DB table — reviewed, diffable, and the
 * thing `connector_instance.connector_key` references (validated here at the app layer,
 * not by a DB FK — mirrors how `report_definition.root_object` references the in-code
 * semantic registry, ADR-0075/#410).
 *
 * Distinct from `company-providers.ts`: that declares how a connector's CREDENTIAL is
 * COLLECTED (the form fields handed to the backend credential store, ADR-0036). This
 * declares the connector's marketplace SHAPE (lifecycle-relevant: auth type, scopes,
 * cadence, what it maps, what it can do). Both key off the same connector `key`.
 *
 * SECURITY: manifest metadata only — no secrets, no tokens. Credentials are custodied
 * in backend Key Vault (ADR-0034/0036/0043); the front end never holds a provider key.
 *
 * PURE / edge-safe: no pg, no node:*, no env — unit-tested directly, importable anywhere
 * (mirrors `semantic-model.ts`).
 */

/** How a connector authenticates (ADR-0076 §1). */
export type ConnectorAuthType = "oauth" | "jwt" | "api_key";

/**
 * A capability the connector provides — `verb:noun`. `ingest:*` pulls a source into
 * bronze→silver (ADR-0012); `write:*` pushes back (e.g. Autotask write-back, ADR-0074);
 * `enrich:*` augments existing records (e.g. Apollo, ADR-0035).
 */
export type ConnectorCapability = string;

/** A versioned connector manifest (ADR-0076 §1). */
export interface ConnectorManifest {
  /** Stable key — referenced by `connector_instance.connector_key` (app-validated, no FK). */
  key: string;
  /** Display name for the catalog. */
  label: string;
  /** One-line description of what the connector integrates. */
  description: string;
  /** Catalog grouping (Productivity / PSA / Documentation / Marketing / Security / Enrichment). */
  category: string;
  /** lucide icon name resolved by `<Icon />` (aligns with company-providers where shared). */
  icon: string;
  /** Auth mechanism — drives the connect flow (OAuth consent vs key form). */
  authType: ConnectorAuthType;
  /** Scopes the connector requests (display/audit + the grant the instance records). */
  scopes: readonly string[];
  /**
   * Default poll cadence in MINUTES (ADR-0038 units; 0 = on-demand / not polled). An
   * instance may override it via `connector_instance.cadence_override_minutes`.
   */
  defaultCadenceMinutes: number;
  /** Silver entities this connector maps into (the identity-map shape, ADR-0012). */
  identityMap: readonly string[];
  /** What the connector can do (`ingest:* | write:* | enrich:*`). */
  capabilities: readonly ConnectorCapability[];
  /**
   * True for an expected data source whose backend credential store / ingestion isn't built
   * yet (ADR-0122 epic #1256). The catalog renders it as a non-enterable **Planned** card so the
   * catalog is the honest, complete map of everything Imperion pulls — each gap a tracked issue,
   * never a silent omission. Omitted (falsy) for live connectors.
   */
  planned?: boolean;
  /** Manifest version — bumped in code when the declared shape changes (ADR-0076 §1). */
  version: number;
}

/**
 * THE REGISTRY. v1 covers the wired ingest/enrich connectors; bespoke connectors migrate
 * onto the lifecycle incrementally (ADR-0076 consequence — "the registry can launch with
 * a subset and grow"). Keys match `company-providers.ts` where the connector also has a
 * company-credential form.
 */
export const CONNECTOR_MANIFESTS: readonly ConnectorManifest[] = [
  {
    key: "m365",
    label: "Microsoft 365",
    description: "Microsoft Graph — mail, calendar, Teams, and directory for contacts, interactions, and devices.",
    category: "Productivity",
    icon: "Mail",
    authType: "oauth",
    scopes: ["Mail.Read", "Calendars.Read", "User.Read.All", "Device.Read.All"],
    defaultCadenceMinutes: 60,
    identityMap: ["contact", "account", "device", "interaction"],
    capabilities: ["ingest:contacts", "ingest:interactions", "ingest:devices"],
    version: 1,
  },
  {
    key: "autotask",
    label: "Autotask (PSA)",
    description: "Kaseya Autotask REST API — tickets, contracts, and company records (read + write-back, ADR-0074).",
    category: "PSA",
    icon: "Ticket",
    authType: "api_key",
    scopes: ["tickets:read", "companies:read", "tickets:write"],
    defaultCadenceMinutes: 60,
    identityMap: ["account", "contact", "ticket"],
    capabilities: ["ingest:tickets", "ingest:companies", "write:tickets"],
    version: 1,
  },
  {
    key: "itglue",
    label: "IT Glue",
    description: "IT Glue documentation API — assets, configurations, and runbooks into the device/asset map.",
    category: "Documentation",
    icon: "BookText",
    authType: "api_key",
    scopes: ["assets:read", "docs:read"],
    defaultCadenceMinutes: 1440,
    identityMap: ["device", "account"],
    capabilities: ["ingest:assets", "ingest:documents"],
    version: 1,
  },
  {
    key: "meta",
    label: "Meta (Facebook / Instagram)",
    description: "Meta business — posts, DMs, and lead forms for marketing + conversational ingestion (reply send is gated).",
    category: "Marketing",
    icon: "MessageCircle",
    authType: "oauth",
    scopes: ["pages_read_engagement", "pages_messaging", "leads_retrieval"],
    defaultCadenceMinutes: 30,
    identityMap: ["campaign", "lead", "interaction"],
    capabilities: ["ingest:posts", "ingest:messages", "ingest:leads", "write:messages"],
    version: 1,
  },
  {
    key: "darkwebid",
    label: "Dark Web ID",
    description: "Kaseya / ID Agent Dark Web ID — compromised-credential exposures tied to client domains (ADR-0040).",
    category: "Security",
    icon: "ShieldAlert",
    authType: "api_key",
    scopes: ["compromises:read"],
    defaultCadenceMinutes: 1440,
    identityMap: ["credential_exposure"],
    capabilities: ["ingest:credential-exposures"],
    version: 1,
  },
  {
    key: "apollo",
    label: "Apollo",
    description: "Apollo enrichment API — augments contacts/accounts on demand (ADR-0035); not a polled source.",
    category: "Enrichment",
    icon: "Sparkles",
    authType: "api_key",
    scopes: ["people:read", "organizations:read"],
    defaultCadenceMinutes: 0,
    identityMap: ["contact", "account"],
    capabilities: ["enrich:contacts"],
    version: 1,
  },
  {
    // UniFi — a COMPANY credential mapped per client (ADR-0122 amendment, #1278). The cloud Site
    // Manager API key (api.ui.com) is MSP-wide: one key enumerates every client's sites/devices.
    // Credential lives in company-providers.ts (conn-company-unifi); this is its catalog shape.
    key: "unifi",
    label: "UniFi",
    description: "Ubiquiti UniFi Site Manager (cloud) — network sites, consoles, and devices across all managed clients from one MSP-wide key.",
    category: "Network",
    icon: "Wifi",
    authType: "api_key",
    scopes: ["sites:read", "devices:read"],
    defaultCadenceMinutes: 1440,
    identityMap: ["device", "account"],
    capabilities: ["ingest:sites", "ingest:devices"],
    version: 1,
  },
  // ── Planned connectors (ADR-0122, epic #1256 S4) — expected sources whose backend store
  //    isn't built yet. They render as non-enterable "Planned" cards so the catalog is the
  //    complete map of everything Imperion pulls. Azure is NOT here — it folds into M365.
  {
    key: "dattoendpoint",
    label: "Datto — Endpoint Backups",
    description: "Datto BCDR endpoint backup status per protected device (one company key, mapped per client).",
    category: "Backups",
    icon: "HardDriveDownload",
    authType: "api_key",
    scopes: ["backups:read"],
    defaultCadenceMinutes: 1440,
    identityMap: ["device", "backup_artifact"],
    capabilities: ["ingest:endpoint-backups"],
    planned: true,
    version: 1,
  },
  {
    key: "dattosaas",
    label: "Datto — SaaS Backups",
    description: "Datto SaaS Protection backup status for M365 / Google Workspace (one company key, mapped per client).",
    category: "Backups",
    icon: "CloudUpload",
    authType: "api_key",
    scopes: ["backups:read"],
    defaultCadenceMinutes: 1440,
    identityMap: ["backup_artifact"],
    capabilities: ["ingest:saas-backups"],
    planned: true,
    version: 1,
  },
  {
    key: "cdw",
    label: "CDW",
    description: "CDW procurement orders for hardware/software fulfillment into the opportunity/order map.",
    category: "Procurement",
    icon: "ShoppingCart",
    authType: "api_key",
    scopes: ["orders:read"],
    defaultCadenceMinutes: 1440,
    identityMap: ["opportunity"],
    capabilities: ["ingest:orders"],
    planned: true,
    version: 1,
  },
  {
    key: "amazonbusiness",
    label: "Amazon Business",
    description: "Amazon Business corporate order history for procurement reconciliation.",
    category: "Procurement",
    icon: "Package",
    authType: "api_key",
    scopes: ["orders:read"],
    defaultCadenceMinutes: 1440,
    identityMap: ["opportunity"],
    capabilities: ["ingest:orders"],
    planned: true,
    version: 1,
  },
  {
    key: "easydmarc",
    label: "EasyDMARC",
    description: "EasyDMARC domain authentication posture (SPF/DKIM/DMARC) into the security-posture map.",
    category: "Security",
    icon: "MailCheck",
    authType: "api_key",
    scopes: ["domains:read"],
    defaultCadenceMinutes: 1440,
    identityMap: ["assessment_artifact"],
    capabilities: ["ingest:dmarc-domains"],
    planned: true,
    version: 1,
  },
] as const;

// ---------------------------------------------------------------------------
// Pure, edge-safe helper API. The catalog (#416) and the connector_instance data
// layer (#414) validate against these — there is no other connector source of truth.
// ---------------------------------------------------------------------------

const MANIFEST_BY_KEY: ReadonlyMap<string, ConnectorManifest> = new Map(
  CONNECTOR_MANIFESTS.map((m) => [m.key, m]),
);

/** All connector manifests (catalog "available" list), in declared order. */
export function listConnectorManifests(): readonly ConnectorManifest[] {
  return CONNECTOR_MANIFESTS;
}

/** One manifest by key, or `undefined` if the key is not in the registry. */
export function getConnectorManifest(key: string): ConnectorManifest | undefined {
  return MANIFEST_BY_KEY.get(key);
}

/** Whether `key` names a registered connector — the gate the instance layer enforces. */
export function isKnownConnector(key: string): boolean {
  return MANIFEST_BY_KEY.has(key);
}

/**
 * The effective poll cadence (minutes) for an instance: its override when set, else the
 * manifest default (ADR-0038). Returns `null` for an unknown connector with no override.
 */
export function effectiveCadenceMinutes(
  key: string,
  cadenceOverrideMinutes: number | null,
): number | null {
  if (cadenceOverrideMinutes !== null) return cadenceOverrideMinutes;
  return getConnectorManifest(key)?.defaultCadenceMinutes ?? null;
}
