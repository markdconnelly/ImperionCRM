/**
 * Connections-page card model (ADR-0122 S5, #1269) — the single source the one-grid
 * `/settings/connections` surface renders. It UNIONS the two halves that used to be drawn
 * as two stacked grids:
 *
 *   - `company-providers.ts` — the providers whose CREDENTIAL is collected on the card
 *     (the old "Company systems" grid).
 *   - the connector catalog (`connector-catalog.ts` ⋈ instances) — the marketplace
 *     status/cadence/mapping view (the old "Connector catalog" grid).
 *
 * A connector that is BOTH (autotask, itglue, meta, darkwebid) used to appear twice — one
 * card in each grid. Here it is ONE card carrying both affordances. A connector that is only
 * a company provider (pax8/myitprocess/quotemanager/televy/qbo/docusign — no manifest yet) or
 * only a catalog manifest (m365/apollo + the Planned sources) still gets exactly one card.
 *
 * PURE / edge-safe: no pg, no node:*, no env — unit-tested directly (mirrors
 * `connector-catalog.ts` / `connector-manifest.ts`).
 */
import type { ConnectionRow } from "@/types";
import { type CompanyProvider } from "@/lib/integrations/company-providers";
import type { ConnectorCatalogEntry } from "@/lib/integrations/connector-catalog";
import { isClientScopedConnector } from "@/lib/integrations/connector-chain";

/** One connector's unified card model — provider half and/or catalog half, never neither. */
export interface ConnectionCardModel {
  /** Connector key — the join key shared by provider, manifest, and instance. */
  key: string;
  label: string;
  icon: string;
  description: string;
  /** Catalog grouping header the card sorts under. */
  category: string;
  /** The company-credential half (form / consent / rotate), or null when catalog-only. */
  provider: CompanyProvider | null;
  /** The persisted company `connection` row for `provider`, or null when not configured. */
  connection: ConnectionRow | null;
  /** The catalog half (manifest + instance + lifecycle), or null when company-credential-only. */
  entry: ConnectorCatalogEntry | null;
  /** A manifest-declared source whose backend store isn't built yet — non-enterable. */
  planned: boolean;
  /** Maps onto a client account → carries the mapping chain + "Edit client mappings". */
  clientScoped: boolean;
}

/**
 * Category display order for the single grid. Connectors land under their manifest category
 * (or the provider's `category` fallback); groups render in this priority, unknown last.
 */
const CATEGORY_ORDER: readonly string[] = [
  "PSA",
  "Productivity",
  "Documentation",
  "Sales",
  "Finance",
  "Procurement",
  "Marketing",
  "Security",
  "Strategy",
  "Assessments",
  "Enrichment",
  "Backups",
];

function categoryRank(category: string): number {
  const i = CATEGORY_ORDER.indexOf(category);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

/**
 * Union the company providers and the catalog entries into one card per connector. Catalog
 * entries are listed first (manifest registry order) so live connectors lead, then any
 * company-credential-only providers without a manifest are appended. Identity (label/icon/
 * description/category) prefers the manifest when present, else the provider.
 */
export function buildConnectionCards(
  providers: readonly CompanyProvider[],
  connections: readonly ConnectionRow[],
  entries: readonly ConnectorCatalogEntry[],
): ConnectionCardModel[] {
  const connByProvider = new Map(connections.map((c) => [c.provider, c]));
  const providerByKey = new Map(providers.map((p) => [p.key, p]));
  const entryByKey = new Map(entries.map((e) => [e.manifest.key, e]));

  // Deterministic order: catalog manifests first (registry order), then provider-only keys.
  const orderedKeys: string[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (!seen.has(e.manifest.key)) {
      seen.add(e.manifest.key);
      orderedKeys.push(e.manifest.key);
    }
  }
  for (const p of providers) {
    if (!seen.has(p.key)) {
      seen.add(p.key);
      orderedKeys.push(p.key);
    }
  }

  return orderedKeys.map((key) => {
    const provider = providerByKey.get(key) ?? null;
    const entry = entryByKey.get(key) ?? null;
    const manifest = entry?.manifest ?? null;
    return {
      key,
      label: manifest?.label ?? provider?.label ?? key,
      icon: manifest?.icon ?? provider?.icon ?? "Plug",
      description: manifest?.description ?? provider?.description ?? "",
      category: manifest?.category ?? provider?.category ?? "Other",
      provider,
      // Only a company provider has a credential row — catalog-only connectors never do.
      connection: provider ? (connByProvider.get(key) ?? null) : null,
      entry,
      planned: manifest?.planned ?? false,
      clientScoped: isClientScopedConnector(key),
    };
  });
}

/** Group the unified cards by category, groups ordered by {@link CATEGORY_ORDER}. */
export function groupConnectionCards(
  cards: readonly ConnectionCardModel[],
): { category: string; cards: ConnectionCardModel[] }[] {
  const groups = new Map<string, ConnectionCardModel[]>();
  for (const c of cards) {
    const list = groups.get(c.category) ?? [];
    list.push(c);
    groups.set(c.category, list);
  }
  return [...groups.entries()]
    .map(([category, cards]) => ({ category, cards }))
    .sort(
      (a, b) =>
        categoryRank(a.category) - categoryRank(b.category) ||
        a.category.localeCompare(b.category),
    );
}
