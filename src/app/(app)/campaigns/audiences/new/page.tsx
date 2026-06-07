import { PageHeader } from "@/components/ui/page-header";
import { AudienceForm, type AudienceDefaults } from "@/components/campaigns/audience-form";
import { createAudienceAction, previewAudienceAction } from "../../actions";
import { getRepositories } from "@/lib/data";
import type { AudienceCriterion } from "@/lib/data/repositories";

function asArray(v: string | string[] | undefined): string[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function NewAudiencePage({
  searchParams,
}: {
  searchParams: Promise<{
    preview?: string;
    name?: string;
    description?: string;
    kind?: string;
    k?: string | string[];
    v?: string | string[];
  }>;
}) {
  const sp = await searchParams;
  const keys = asArray(sp.k);
  const values = asArray(sp.v);
  const criteria: AudienceCriterion[] = keys
    .map((key, i) => ({ key, value: values[i] ?? "" }))
    .filter((c) => c.key && c.value);

  const defaults: AudienceDefaults | undefined =
    sp.preview != null
      ? {
          name: sp.name ?? "",
          description: sp.description ?? "",
          kind: sp.kind ?? "dynamic",
          criteria,
        }
      : undefined;

  let matches = null;
  if (sp.preview != null && criteria.length > 0) {
    const { campaigns } = getRepositories();
    matches = await campaigns.previewAudienceMembers(criteria);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New audience"
        description="Build an audience over the aggregated enriched profiles."
      />
      <AudienceForm
        createAction={createAudienceAction}
        previewAction={previewAudienceAction}
        defaults={defaults}
      />

      {matches != null && (
        <div className="max-w-2xl rounded-xl border border-border bg-panel p-4">
          <h3 className="mb-2 font-display text-sm font-semibold tracking-tight">
            Preview — {matches.length} match{matches.length === 1 ? "" : "es"}
            {matches.length > 0 &&
              ` · ${matches.filter((m) => m.adConsent).length} ad-eligible`}
          </h3>
          {matches.length === 0 ? (
            <p className="text-sm text-dim">No contacts match these criteria yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {matches.map((m) => (
                <li key={m.contactId} className="flex items-center justify-between text-sm">
                  <span className="text-text">
                    {m.fullName}
                    {m.account ? <span className="text-dim"> · {m.account}</span> : null}
                  </span>
                  <span className={m.adConsent ? "text-green" : "text-red"}>
                    {m.adConsent ? "ad-eligible" : "no ad consent"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
