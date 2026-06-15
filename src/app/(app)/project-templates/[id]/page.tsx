import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Field, TextInput, Select } from "@/components/ui/form";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { instantiateProjectTemplateAction } from "../actions";
import type { Option } from "@/lib/data/repositories";
import type { ProjectTypeRow } from "@/types";

/**
 * Read-only view of a project-template tree (ADR-0070 E1, #352): milestones with
 * their scheduling skeleton and child steps/tasks. Edit is delete+recreate in v1,
 * so there is no edit form. `canManageProjects` users also get the
 * create-project-from-template entry point. The protected onboarding default
 * carries no editable items (it delegates to the hard-coded playbook).
 */
export default async function ProjectTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm } = getRepositories();
  const [t, roles] = await Promise.all([crm.getProjectTemplate(id), getSessionRoles()]);
  if (!t) notFound();

  const canInstantiate = canManageProjects(roles);
  const [accounts, types]: [Option[], ProjectTypeRow[]] = canInstantiate
    ? await Promise.all([crm.accountOptions(), crm.listProjectTypes()])
    : [[], []];
  const today = new Date().toISOString().slice(0, 10);
  const defaultTypeId = t.projectTypeId ?? types[0]?.id ?? "";

  const milestones = t.items
    .filter((i) => i.kind === "milestone")
    .sort((a, b) => a.ordinal - b.ordinal);
  const childrenOf = (mid: string) =>
    t.items.filter((i) => i.parentId === mid).sort((a, b) => a.ordinal - b.ordinal);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.name} description={t.description ?? "Project template"}>
        <Link href="/project-templates" className="text-sm text-dim transition-colors hover:text-text">
          ← All templates
        </Link>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 text-xs text-dim">
        <span className="rounded-full bg-panel-2 px-2 py-0.5">{t.projectTypeName ?? "Any type"}</span>
        {t.isProtected && <span className="rounded-full bg-panel-2 px-2 py-0.5">protected default</span>}
      </div>

      {canInstantiate && (
        <details className="group rounded-xl border border-border bg-panel p-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-text">
            <span>Create a project from this template</span>
            <span className="text-xs text-dim group-open:hidden">Expand</span>
          </summary>
          <p className="mt-2 text-xs text-dim">
            Creates a project and snapshots this template&apos;s milestones and tasks onto it. Later
            edits to the template never change the new project.
          </p>
          <form action={instantiateProjectTemplateAction} className="mt-4 flex max-w-lg flex-col gap-4">
            <input type="hidden" name="projectTemplateId" value={t.id} />
            <Field label="Account">
              <Select name="accountId" defaultValue="" required>
                <option value="" disabled>
                  — Select an account —
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Project name">
              <TextInput name="name" defaultValue={t.name} required />
            </Field>
            <Field label="Project type">
              <Select name="projectTypeId" defaultValue={defaultTypeId} required>
                {types.map((ty) => (
                  <option key={ty.id} value={ty.id}>
                    {ty.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start date">
              <TextInput type="date" name="startDate" defaultValue={today} required />
            </Field>
            <div className="pt-1">
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
              >
                Create project
              </button>
            </div>
          </form>
        </details>
      )}

      {t.isProtected && milestones.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel p-8 text-center text-sm text-dim">
          The seeded onboarding playbook is applied from the hard-coded standard (ADR-0037); it has no
          editable items here. See the{" "}
          <Link href="/onboarding/playbook" className="text-accent hover:underline">
            onboarding playbook
          </Link>
          .
        </p>
      ) : (
        milestones.map((m) => (
          <section key={m.id} className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-base font-semibold tracking-tight">{m.title}</h3>
              <span className="text-xs text-dim">
                start +{m.offsetDays}d · lasts {m.durationDays}d
              </span>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5">
              {childrenOf(m.id).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-panel-2 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="mr-2 rounded bg-panel px-1.5 py-0.5 text-[10px] text-dim">{c.kind}</span>
                    {c.title}
                  </span>
                  <span className="text-xs text-dim">
                    +{c.offsetDays}d · {c.durationDays}d
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
