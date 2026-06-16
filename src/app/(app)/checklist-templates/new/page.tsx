import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { createChecklistTemplateAction } from "../actions";

/**
 * Author a new checklist template (ADR-0070 E1-F3, #633). Gated to canManageProjects
 * (`delivery:write`) — the same gate the create action re-checks server-side. The
 * item list is one-per-line; the action trims and drops blanks.
 */
export default async function NewChecklistTemplatePage() {
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) redirect("/checklist-templates");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New checklist template"
        description="A reusable set of subtasks. Apply it to a task to seed its checklist — applying snapshots the items, so later edits never change tasks already seeded."
      />
      <form
        action={createChecklistTemplateAction}
        className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
      >
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-dim">Name</span>
          <input
            name="name"
            required
            placeholder="e.g. New-hire onboarding checks"
            className="rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-dim">Description (optional)</span>
          <input
            name="description"
            placeholder="What this checklist is for"
            className="rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-dim">Items (one per line)</span>
          <textarea
            name="items"
            required
            rows={6}
            placeholder={"Create accounts\nAssign hardware\nSchedule orientation"}
            className="rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Create checklist
          </button>
        </div>
      </form>
    </div>
  );
}
