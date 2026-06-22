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
};

/** Resolve an adapter by its route segment, or null when the connector isn't mappable. */
export function getClientMappingAdapter(connector: string): ClientMappingAdapter | null {
  return CLIENT_MAPPING_ADAPTERS[connector] ?? null;
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
