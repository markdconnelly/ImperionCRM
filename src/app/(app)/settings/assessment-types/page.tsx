import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";
import { createAssessmentTemplateAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Assessment-template manager (#835 — Wave-8 buildout of the #794 nav scaffold).
 *
 * Lists the assessment-kind templates and creates new ones, reusing the Engagements
 * template seam (`listTemplates()` filtered to `kind === 'assessment'`,
 * `createTemplate('assessment', title)` via the route-local action). Per-question
 * editing is NOT duplicated here — the question catalog lives on /questions, linked
 * below. Admin-only (`canSeeSettings`, ADR-0030); the action enforces `catalog:write`.
 */
export default async function AssessmentTypesSettingsPage() {
  const roles = await getSessionRoles();
  if (!canSeeSettings(roles)) redirect("/");

  const { engagements } = getRepositories();
  const templates = (await engagements.listTemplates()).filter(
    (t) => t.kind === "assessment",
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Assessment types"
        description="Manage the assessment templates available across the lifecycle. Each template is a versioned set of questions; edit the questions themselves on the Questions page."
      >
        <Link
          href="/questions"
          className="rounded-md border border-border px-2.5 py-1 text-xs text-dim transition-colors hover:border-accent hover:text-text"
        >
          Edit questions →
        </Link>
      </PageHeader>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Create a template
        </h2>
        <div className="rounded-lg border border-border bg-panel p-4">
          <form
            action={createAssessmentTemplateAction}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="flex flex-1 flex-col gap-1 text-xs text-dim">
              New template title
              <input
                name="title"
                required
                placeholder="e.g. Security posture assessment"
                className="rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
            >
              Create template
            </button>
          </form>
          <p className="mt-3 text-xs text-dim">
            A new template starts at the next version. Assign questions to it from each
            question&apos;s Edit page under{" "}
            <Link href="/questions" className="text-text underline-offset-2 hover:underline">
              Questions
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Assessment templates
        </h2>
        <div className="rounded-lg border border-border bg-panel p-4">
          <ul className="flex flex-col divide-y divide-border">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="font-medium">{t.title}</span>
                <span className="text-xs text-dim">
                  {t.kind} · v{t.version}
                </span>
              </li>
            ))}
            {templates.length === 0 && (
              <li className="py-2 text-sm text-dim">No assessment templates yet.</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
