import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { formatCustomFieldValue, parseCustomFieldFilter } from "@/lib/custom-fields";
import type { CustomFieldDef } from "@/types";

/**
 * Custom-field reporting filter (ADR-0065 B4 acceptance, #714).
 *
 * The B4 acceptance criterion is "Admin creates a 'Risk level' select field on
 * Implementation projects; it appears on those projects only and is FILTERABLE IN
 * REPORTING." This page is that report: pick a project custom field and a value, and
 * it lists every project whose field matches — resolved over the GIN index on
 * `custom_field_value.value` via `customFields.filterByCustomField`, never a scan.
 *
 * Only SELECT-type project fields are offered (the naturally filterable case the AC
 * describes); a field scoped to one project_type only reports on that type, exactly
 * mirroring "Risk level = High on Implementation projects". The chosen field + value
 * ride in the URL so the report is bookmarkable/shareable.
 *
 * Honest degradation (#714): no select field defined → an explanatory empty state, no
 * fabricated rows; a match set that no longer maps to a live project simply isn't shown.
 */
const SELECT_TYPES = new Set(["single_select", "multi_select"]);

export default async function CustomFieldReportPage({
  searchParams,
}: {
  searchParams: Promise<{ field?: string; cf?: string }>;
}) {
  const { customFields, crm } = getRepositories();
  const [defs, projects, types] = await Promise.all([
    customFields.listFieldDefs(),
    crm.listProjects(),
    crm.listProjectTypes(),
  ]);

  // The reportable fields: project-scoped, select-typed (the B4 AC's case).
  const reportable = defs.filter((d) => d.scope === "project" && SELECT_TYPES.has(d.fieldType));

  // The chosen field is addressed by its DEFINITION id (unique even when a global and
  // a type-scoped field share a key); the value rides in ?cf=key:value.
  const sp = await searchParams;
  const chosen = reportable.find((d) => d.id === sp.field);
  const cfFilter = parseCustomFieldFilter(sp.cf);
  const activeValue =
    chosen && cfFilter && cfFilter.key === chosen.key ? cfFilter.value : "";

  // Run the GIN-indexed filter only when both a field and a value are chosen.
  let matches: typeof projects = [];
  let ran = false;
  if (chosen && activeValue) {
    ran = true;
    const ids = new Set(
      await customFields.filterByCustomField({
        scope: "project",
        projectTypeId: chosen.projectTypeId,
        fieldKey: chosen.key,
        op: chosen.fieldType === "multi_select" ? "contains" : "eq",
        value: activeValue,
      }),
    );
    matches = projects.filter((p) => ids.has(p.id));
  }

  const scopeLabel = (d: CustomFieldDef) =>
    d.projectTypeId ? `${d.projectTypeName ?? "type"} projects` : "all projects";

  // Link builder: choosing a field clears the value; choosing a value keeps the field.
  const fieldHref = (id: string) => `/reporting/custom-fields?field=${encodeURIComponent(id)}`;
  const valueHref = (id: string, key: string, value: string) =>
    `/reporting/custom-fields?field=${encodeURIComponent(id)}&cf=${encodeURIComponent(`${key}:${value}`)}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Custom-field report"
        description="Filter projects by an admin-defined custom field (ADR-0065 B4) over the GIN-indexed values."
      >
        <Link href="/reporting" className="text-sm text-dim transition-colors hover:text-text">
          ← Reporting
        </Link>
        <Link href="/custom-fields" className="text-sm text-dim transition-colors hover:text-text">
          Manage fields →
        </Link>
      </PageHeader>

      {reportable.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel p-6 text-center text-sm text-dim">
          No select-type project custom fields are defined yet. Create one (e.g. a
          &ldquo;Risk level&rdquo; field on Implementation projects) on the{" "}
          <Link href="/custom-fields" className="text-accent hover:underline">
            Custom fields
          </Link>{" "}
          admin page, then filter projects by it here.
        </div>
      ) : (
        <>
          {/* Field picker */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-dim">Field</span>
            {reportable.map((d) => {
              const isOn = chosen?.id === d.id;
              return (
                <Link
                  key={d.id}
                  href={fieldHref(d.id)}
                  className={
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors " +
                    (isOn
                      ? "border-accent bg-accent/15 text-text"
                      : "border-border text-dim hover:text-text")
                  }
                >
                  {d.label}
                  <span className="ml-1 text-dim/70">· {scopeLabel(d)}</span>
                </Link>
              );
            })}
          </div>

          {/* Value picker (the chosen field's options) */}
          {chosen && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-dim">{chosen.label}</span>
              {chosen.options.length === 0 && (
                <span className="text-xs text-dim/70">this field has no options</span>
              )}
              {chosen.options.map((opt) => {
                const isOn = activeValue === opt;
                return (
                  <Link
                    key={opt}
                    href={isOn ? fieldHref(chosen.id) : valueHref(chosen.id, chosen.key, opt)}
                    className={
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors " +
                      (isOn
                        ? "border-accent bg-accent/15 text-text"
                        : "border-border text-dim hover:text-text")
                    }
                  >
                    {opt}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Results */}
          {ran ? (
            <div className="rounded-lg border border-border bg-panel">
              <div className="border-b border-border px-4 py-2.5 text-sm">
                <span className="font-medium">{matches.length}</span>{" "}
                <span className="text-dim">
                  {matches.length === 1 ? "project" : "projects"} where {chosen!.label} ={" "}
                  {formatCustomFieldValue(activeValue, chosen!.fieldType)}
                  {chosen!.projectTypeId && ` (${chosen!.projectTypeName ?? "scoped"} only)`}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-dim">
                      <th className="px-4 py-2 font-medium">Project</th>
                      <th className="px-4 py-2 font-medium">Account</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Target live</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((p) => (
                      <tr key={p.id} className="border-t border-border hover:bg-panel-2">
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/projects/${p.id}`} className="hover:text-accent">
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-dim">{p.account}</td>
                        <td className="px-4 py-3 text-dim">{p.type}</td>
                        <td className="px-4 py-3 text-dim">{p.status}</td>
                        <td className="px-4 py-3 text-dim">{p.targetLive ?? "—"}</td>
                      </tr>
                    ))}
                    {matches.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-dim">
                          No projects match this value.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-panel p-6 text-center text-sm text-dim">
              Pick a field and a value to report on matching projects
              {types.length > 0 && " across all project types"}.
            </div>
          )}
        </>
      )}
    </div>
  );
}
