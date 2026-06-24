/**
 * Client Mapping adapter registry (ADR-0112, epic #1141).
 *
 * One reusable mapping surface serves every per-client connector; each connector contributes an
 * *adapter* — the `source_system` its units live under, plus display labels. The tracer (#1143)
 * ships Autotask (the only populated source: 21 `autotask_companies`); E3 (#1147) adds m365 and
 * F (#1144) adds the rest. The route segment is the adapter key.
 *
 * Domain-keyed connectors (darkwebid) are NOT here — domains are an `account_domain` GUI-direct
 * write, a separate surface. Per-client-credential connectors (m365, unifi) set
 * `bindsConnection: true` so the page knows to carry the bound `connection` row's id to the
 * backend (which keeps `connection.account_id` consistent).
 */
export interface ClientMappingAdapter {
  /** Route segment + adapter key (e.g. 'autotask'). */
  connector: string;
  /** The `entity_xref.source_system` the connector's units map under. */
  sourceSystem: string;
  /** Human label for the connector (e.g. 'Autotask'). */
  label: string;
  /** What one external unit is called (e.g. 'company', 'tenant', 'site'). */
  unitNoun: string;
  /**
   * True for per-client-credential connectors (m365/unifi): binding a unit also sets
   * `connection.account_id`. False for fan-out connectors (one credential → many units).
   */
  bindsConnection: boolean;
}

export const CLIENT_MAPPING_ADAPTERS: Record<string, ClientMappingAdapter> = {
  autotask: {
    connector: "autotask",
    sourceSystem: "autotask",
    label: "Autotask",
    unitNoun: "company",
    bindsConnection: false,
  },
  // M365 (E3 #1147). Tenant Mapping is the M365 instance of Client Mapping (ADR-0112, amends
  // ADR-0051). Units are Customer Tenants — the universe is the posture-bronze tenant set plus
  // any already-linked tenant in `entity_xref ('account','m365',guid)` (backfilled by migration
  // 0165). `bindsConnection` is true because m365 is a per-client credential; the link also keeps
  // the legacy `account_tenant` row in sync until the posture-join cutover (#1049).
  m365: {
    connector: "m365",
    sourceSystem: "m365",
    label: "Microsoft 365",
    unitNoun: "tenant",
    bindsConnection: true,
  },
  // ── F (#1144): the remaining per-client connectors ─────────────────────────────────────────
  // Each contributes a fan-out adapter; their units come from the per-source unit-source config in
  // the data layer (`listClientMappingUnits`). Every bronze is empty until its collector runs
  // (data-in is Mark-gated, separate thread), so these light up as their bronze hydrates.
  itglue: {
    connector: "itglue",
    sourceSystem: "itglue",
    label: "IT Glue",
    unitNoun: "organization",
    bindsConnection: false,
  },
  pax8: {
    connector: "pax8",
    sourceSystem: "pax8",
    label: "Pax8",
    unitNoun: "company",
    bindsConnection: false,
  },
  quotemanager: {
    connector: "quotemanager",
    sourceSystem: "quotemanager",
    label: "Quote Manager (KQM)",
    unitNoun: "customer",
    bindsConnection: false,
  },
  televy: {
    connector: "televy",
    sourceSystem: "televy",
    label: "Televy",
    unitNoun: "customer",
    bindsConnection: false,
  },
  myitprocess: {
    connector: "myitprocess",
    sourceSystem: "myitprocess",
    label: "My IT Process",
    unitNoun: "account",
    bindsConnection: false,
  },
  // UniFi is a COMPANY credential mapped per client (ADR-0122 amendment, #1278): the cloud Site
  // Manager API key is MSP-wide (one key → all clients), so it is NOT per-client — entered once on
  // the connections card, then each discovered site is mapped here (Autotask pattern). Units are
  // sites/consoles derived from `unifi_devices`. `bindsConnection: false` → no per-client cred form.
  unifi: {
    connector: "unifi",
    sourceSystem: "unifi",
    label: "UniFi",
    unitNoun: "site",
    bindsConnection: false,
  },
};

/** Resolve an adapter by its route segment, or null when the connector isn't mappable. */
export function getClientMappingAdapter(connector: string): ClientMappingAdapter | null {
  return CLIENT_MAPPING_ADAPTERS[connector] ?? null;
}

/**
 * A per-client credential registered for a connector, surfaced on the mapping screen
 * INDEPENDENTLY of bronze discovery (#1271). The mapped-unit table only lists tenants/consoles
 * already discovered in bronze; a credential registered before its unit is discovered (the
 * normal case while bronze is deploy-dormant) would otherwise be invisible everywhere — client-
 * scope connections don't appear on the company connections grid either. Credential ⟂ data
 * mapping (ADR-0122): this lists the credential; the unit still appears in the mapping table as
 * its bronze hydrates.
 */
export interface RegisteredClientCredential {
  /** The owning Imperion account (the managed customer). */
  accountId: string;
  /** Resolved account name for display (falls back to the connection display name). */
  accountName: string;
  /** Operator-supplied label for the credential, if any (e.g. "IPG-M365"). */
  displayName: string | null;
  /** The connection lifecycle status (active | pending | error | …). */
  status: string;
}

/**
 * The client-scope credentials registered for `connector`, account-name order. Pure selection
 * over the connection list the page already holds — health is attached by the caller (it needs
 * the render clock). Rows without an `accountId` are skipped (an unowned client credential
 * cannot be shown against an account).
 */
export function selectRegisteredClientCredentials(
  connections: ReadonlyArray<{
    scope: string;
    provider: string;
    accountId: string | null;
    accountName: string | null;
    displayName: string | null;
    status: string;
  }>,
  connector: string,
): RegisteredClientCredential[] {
  return connections
    .filter((c) => c.scope === "client" && c.provider === connector && c.accountId)
    .map((c) => ({
      accountId: c.accountId as string,
      accountName: c.accountName ?? c.displayName ?? "—",
      displayName: c.displayName,
      status: c.status,
    }))
    .sort((a, b) => a.accountName.localeCompare(b.accountName));
}

/**
 * Case-insensitive exact-name suggestion: the account whose name matches the unit's name. Manual
 * curation always wins, but a confident exact match is offered for one-click Accept. Fuzzy
 * matching stays the backend resolver's job (epic #1049) — this is a deliberately conservative
 * GUI hint, not resolution.
 */
export function suggestAccountForUnit(
  unitName: string,
  accounts: ReadonlyArray<{ id: string; name: string }>,
): { id: string; name: string } | null {
  const norm = unitName.trim().toLowerCase();
  if (!norm) return null;
  const hit = accounts.find((a) => a.name.trim().toLowerCase() === norm);
  return hit ? { id: hit.id, name: hit.name } : null;
}
