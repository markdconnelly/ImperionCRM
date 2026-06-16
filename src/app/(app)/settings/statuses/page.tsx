import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/policy";
import type { ProjectTypeRow } from "@/types";
import type { StatusDefRow } from "@/lib/data/repositories";
import {
  createStatusDefAction,
  updateStatusDefAction,
  deleteStatusDefAction,
  reorderStatusDefsAction,
} from "./actions";

/**
 * Admin configurable-status surface (ADR-0065 B5 + ADR-0066 C1, #616).
 *
 * Create / edit / reorder / delete the `status_def` rows of ONE set at a time. The
 * set is chosen by (context, scope, project type) via the query string so deep-links
 * and the post-action redirect land back on the same set. Configuration is gated by
 * `catalog:write`; non-admins see the set read-only (controls hidden, the server
 * actions also fail closed).
 *
 * PART 1 (CRUD) shipped in #730. PART 2 (#616, ADR-0066 C1) adds the per-status
 * WIP-limit input here (create + edit) — the board reads `status_def.wip_limit` as
 * the baseline over-limit highlight threshold (kanban-board.tsx). The WIP-limit
 * column shows the current cap; a blank value means no limit.
 */

const CONTEXTS = ["task", "project"] as const;
const CATEGORIES = ["todo", "in_progress", "done"] as const;
const input =
  "rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim";

type SearchParams = {
  context?: string;
  scope?: string;
  projectTypeId?: string;
};

function CategoryOptions() {
  return (
    <>
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c.replace(/_/g, " ")}
        </option>
      ))}
    </>
  );
}

/** A colour swatch next to the label, falling back to the dim token when unset. */
function Swatch({ color }: { color: string | null }) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full border border-border align-middle"
      style={{ backgroundColor: color ?? "#8A93A6" }}
    />
  );
}

/** One existing status with an inline edit + delete form (admin only). */
function StatusRow({
  def,
  count,
  canEdit,
}: {
  def: StatusDefRow;
  count: number;
  canEdit: boolean;
}) {
  return (
    <tr className="border-t border-border align-top hover:bg-panel-2">
      <td className="px-4 py-2.5 text-dim">{def.ordinal}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2 font-medium">
          <Swatch color={def.color} /> {def.label}
        </div>
        <div className="text-[11px] text-dim">{def.key}</div>
      </td>
      <td className="px-4 py-2.5 text-dim">{def.category.replace(/_/g, " ")}</td>
      <td className="px-4 py-2.5 text-dim">{def.wipLimit ?? "—"}</td>
      <td className="px-4 py-2.5 text-right">
        {canEdit ? (
          <details>
            <summary className="cursor-pointer text-dim hover:text-text">Edit</summary>
            <form action={updateStatusDefAction} className="mt-2 flex flex-col gap-2 text-left">
              <input type="hidden" name="id" value={def.id} />
              <input type="hidden" name="context" value={def.context} />
              <input type="hidden" name="scope" value={def.scope} />
              {def.projectTypeId && (
                <input type="hidden" name="projectTypeId" value={def.projectTypeId} />
              )}
              <div className="flex flex-wrap gap-2">
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Label
                  <input name="label" defaultValue={def.label} className={input} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Key
                  <input name="key" defaultValue={def.key} className={input} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Category
                  <select name="category" defaultValue={def.category} className={input}>
                    <CategoryOptions />
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Colour
                  <input
                    name="color"
                    type="color"
                    defaultValue={def.color ?? "#8A93A6"}
                    className="h-8 w-12 rounded-md border border-border bg-panel-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Order
                  <input
                    name="ordinal"
                    type="number"
                    defaultValue={def.ordinal}
                    className={`${input} w-16`}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  WIP limit
                  <input
                    name="wipLimit"
                    type="number"
                    min={1}
                    defaultValue={def.wipLimit ?? ""}
                    placeholder="none"
                    title="Highlight the board column when it holds more than this many cards. Blank = no limit."
                    className={`${input} w-16`}
                  />
                </label>
              </div>
              <button
                type="submit"
                className="self-start rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
              >
                Save changes
              </button>
            </form>
          </details>
        ) : (
          <span className="text-dim">—</span>
        )}
      </td>
      <td className="px-2 py-2.5 text-right">
        {canEdit && count > 1 && (
          <form action={deleteStatusDefAction}>
            <input type="hidden" name="id" value={def.id} />
            <button type="submit" className="text-dim hover:text-red">
              Delete
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}

export default async function StatusesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const context = (CONTEXTS as readonly string[]).includes(sp.context ?? "")
    ? (sp.context as string)
    : "task";
  const scope = sp.scope === "project_type" ? "project_type" : "global";
  const projectTypeId = scope === "project_type" ? (sp.projectTypeId ?? null) : null;

  const { crm } = getRepositories();
  const [defs, types, roles] = await Promise.all([
    crm.listStatusDefsForScope(context, scope, projectTypeId),
    crm.listProjectTypes(),
    getSessionRoles(),
  ]);
  // Configuration is admin-permissioned (ADR-0065 security impact). Non-admins can
  // view a set but the create/edit/delete/reorder controls are hidden; the server
  // actions also fail closed via requireCapability("catalog:write").
  const canEdit = can(roles, "catalog:write");

  const selectedType = types.find((t: ProjectTypeRow) => t.id === projectTypeId);
  const setTitle =
    scope === "global"
      ? `Global ${context} statuses`
      : `${selectedType?.name ?? "Project type"} ${context} statuses`;

  /** Build a /settings/statuses href for a (context, scope, type) selection. */
  function setHref(c: string, s: string, ptId?: string | null): string {
    const params = new URLSearchParams({ context: c, scope: s });
    if (s === "project_type" && ptId) params.set("projectTypeId", ptId);
    return `/settings/statuses?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Statuses"
        description="Admin-definable status sets per context and project type (ADR-0065 B5). Reporting rolls up by category (todo · in progress · done), never by label — so renaming a status or adding one (e.g. “Waiting on client”) keeps reports stable. A per-status WIP limit (ADR-0066 C1) highlights a board column when it holds more than that many cards."
      >
        <Link
          href="/settings?tab=tools"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          ← Settings
        </Link>
      </PageHeader>

      {/* Set selector — context + scope + project type pick the set being edited. */}
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-sm font-semibold tracking-tight">Choose a set</h2>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-panel p-3 text-sm">
          {CONTEXTS.map((c) => (
            <Link
              key={c}
              href={setHref(c, scope, projectTypeId)}
              className={`rounded-md border px-3 py-1.5 ${
                context === c ? "border-accent text-text" : "border-border text-dim hover:text-text"
              }`}
            >
              {c}
            </Link>
          ))}
          <span className="mx-1 text-border">|</span>
          <Link
            href={setHref(context, "global")}
            className={`rounded-md border px-3 py-1.5 ${
              scope === "global" ? "border-accent text-text" : "border-border text-dim hover:text-text"
            }`}
          >
            Global default
          </Link>
          <select
            defaultValue={scope === "project_type" ? (projectTypeId ?? "") : ""}
            className={input}
            // Native form-free navigation: changing the dropdown follows the link.
            // (No client JS — the option values ARE the hrefs.)
            name="projectTypeId"
          >
            <option value="">Per project type…</option>
            {types.map((pt: ProjectTypeRow) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>
        </div>
        {/* Quick links to each type's set (the select above is display-only). */}
        <div className="flex flex-wrap gap-2 text-xs">
          {types.map((pt: ProjectTypeRow) => (
            <Link
              key={pt.id}
              href={setHref(context, "project_type", pt.id)}
              className={`rounded-md border px-2 py-1 ${
                projectTypeId === pt.id
                  ? "border-accent text-text"
                  : "border-border text-dim hover:text-text"
              }`}
            >
              {pt.name}
            </Link>
          ))}
        </div>
      </section>

      {canEdit && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-sm font-semibold tracking-tight">Add a status</h2>
          <div className="rounded-lg border border-border bg-panel p-4">
            <form action={createStatusDefAction} className="flex flex-col gap-3">
              <input type="hidden" name="context" value={context} />
              <input type="hidden" name="scope" value={scope} />
              {scope === "project_type" && projectTypeId && (
                <input type="hidden" name="projectTypeId" value={projectTypeId} />
              )}
              <div className="flex flex-wrap gap-2">
                <label className="flex flex-1 flex-col gap-1 text-xs text-dim">
                  Label
                  <input name="label" required placeholder="e.g. Waiting on client" className={input} />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-xs text-dim">
                  Key
                  <input name="key" required placeholder="e.g. waiting_on_client" className={input} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Category
                  <select name="category" defaultValue="in_progress" className={input}>
                    <CategoryOptions />
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Colour
                  <input
                    name="color"
                    type="color"
                    defaultValue="#5B8DEF"
                    className="h-8 w-12 rounded-md border border-border bg-panel-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Order
                  <input name="ordinal" type="number" defaultValue={defs.length} className={`${input} w-16`} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  WIP limit
                  <input
                    name="wipLimit"
                    type="number"
                    min={1}
                    placeholder="none"
                    title="Highlight the board column when it holds more than this many cards. Blank = no limit."
                    className={`${input} w-16`}
                  />
                </label>
              </div>
              <button
                type="submit"
                className="self-start rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
              >
                Add status
              </button>
            </form>
            {scope === "project_type" && !projectTypeId && (
              <p className="mt-2 text-xs text-amber">
                Pick a project type above before adding a type-scoped status.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-sm font-semibold tracking-tight">{setTitle}</h2>
        {scope === "project_type" && defs.length === 0 && (
          <p className="text-xs text-dim">
            This type has no status set of its own yet, so it inherits the global default.
            Add a status here to give it an independent set.
          </p>
        )}
        <div className="rounded-lg border border-border bg-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-dim">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">WIP limit</th>
                  <th className="px-4 py-2 font-medium" />
                  <th className="px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {defs.map((d) => (
                  <StatusRow key={d.id} def={d} count={defs.length} canEdit={canEdit} />
                ))}
                {defs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-dim">
                      No statuses in this set yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reorder — one number input per row stamps the new ordinal set atomically. */}
        {canEdit && defs.length > 1 && (
          <details className="rounded-lg border border-border bg-panel p-3">
            <summary className="cursor-pointer text-sm text-dim hover:text-text">
              Reorder this set
            </summary>
            <form action={reorderStatusDefsAction} className="mt-3 flex flex-col gap-2">
              {defs.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2 text-sm">
                  <input type="hidden" name={`id${i}`} value={d.id} />
                  <input
                    name={`ordinal${i}`}
                    type="number"
                    defaultValue={d.ordinal}
                    className={`${input} w-16`}
                  />
                  <span className="text-text">{d.label}</span>
                </div>
              ))}
              <button
                type="submit"
                className="mt-1 self-start rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
              >
                Save order
              </button>
            </form>
          </details>
        )}
      </section>
    </div>
  );
}
