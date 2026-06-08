import Link from "next/link";
import { cn } from "@/lib/cn";
import type { OnboardingProject, OnboardingMilestone, Health } from "@/types";

const NEXT_HEALTH: Record<Health, Health> = { green: "amber", amber: "red", red: "green" };
const DOT: Record<Health, string> = { green: "bg-green", amber: "bg-amber", red: "bg-red" };

/** Overall project health = worst milestone (red beats amber beats green). */
function rollup(milestones: OnboardingMilestone[]): Health {
  if (milestones.some((m) => m.health === "red")) return "red";
  if (milestones.some((m) => m.health === "amber")) return "amber";
  return milestones.length ? "green" : "amber";
}

/**
 * Onboarding dashboard (ADR-0034/0037) — one card per client project. Projects
 * with the standard playbook applied show each phase as an expandable checklist
 * with a derived R/Y/G; checking off steps re-derives the phase health. Projects
 * without the playbook show simple R/Y/G dots and an "Apply" button.
 */
export function OnboardingBoard({
  projects,
  setHealthAction,
  applyTemplateAction,
  toggleStepAction,
  today,
}: {
  projects: OnboardingProject[];
  setHealthAction: (formData: FormData) => void | Promise<void>;
  applyTemplateAction: (formData: FormData) => void | Promise<void>;
  toggleStepAction: (formData: FormData) => void | Promise<void>;
  today: string;
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel px-4 py-8 text-center text-sm text-dim">
        No onboarding projects yet. They start when a managed-services deal is won.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {projects.map((p) => {
        const overall = rollup(p.milestones);
        const totalSteps = p.milestones.reduce((n, m) => n + m.stepsTotal, 0);
        const doneSteps = p.milestones.reduce((n, m) => n + m.stepsDone, 0);
        return (
          <div key={p.id} className="rounded-xl border border-border bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT[overall])} />
                  <Link href={`/onboarding/${p.id}/edit`} className="truncate font-medium hover:text-accent">
                    {p.name}
                  </Link>
                </div>
                <div className="mt-0.5 text-xs text-dim">
                  {p.account ?? "—"} · {p.type} · {p.status.replace(/_/g, " ")}
                  {p.targetLive ? ` · live ${p.targetLive}` : ""}
                </div>
              </div>
              {p.hasTemplate && (
                <div className="shrink-0 text-xs text-dim">{doneSteps}/{totalSteps} steps</div>
              )}
            </div>

            {p.hasTemplate ? (
              <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                {p.milestones.map((m) => (
                  <PhaseRow key={m.id} milestone={m} toggleStepAction={toggleStepAction} />
                ))}
              </div>
            ) : (
              <div className="mt-3 border-t border-border pt-3">
                {p.milestones.length > 0 && (
                  <div className="mb-3 flex flex-col gap-1.5">
                    {p.milestones.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-sm">
                        <form action={setHealthAction} className="flex">
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="health" value={NEXT_HEALTH[m.health]} />
                          <button
                            type="submit"
                            title={`Health: ${m.health} — click to cycle`}
                            className={cn("h-2.5 w-2.5 rounded-full", DOT[m.health])}
                          />
                        </form>
                        <span className="truncate">{m.name}</span>
                        <span className="ml-auto shrink-0 text-xs text-dim">
                          {m.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <form action={applyTemplateAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="projectId" value={p.id} />
                  <label className="text-xs text-dim">Start</label>
                  <input
                    type="date"
                    name="startAt"
                    defaultValue={today}
                    className="rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
                  >
                    Apply standard onboarding playbook
                  </button>
                </form>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** One phase: an expandable checklist with a derived R/Y/G summary. */
function PhaseRow({
  milestone: m,
  toggleStepAction,
}: {
  milestone: OnboardingMilestone;
  toggleStepAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <details className="rounded-md border border-border bg-panel-2/40">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT[m.health])} />
        <span className="truncate font-medium">{m.name}</span>
        <span className="ml-auto shrink-0 text-xs text-dim">
          {m.stepsDone}/{m.stepsTotal}
          {m.due ? ` · due ${m.due}` : ""}
        </span>
      </summary>
      <ul className="flex flex-col gap-0.5 border-t border-border px-3 py-2">
        {m.steps.map((s) => {
          const done = s.status === "done";
          return (
            <li key={s.id} className="flex items-start gap-2 py-0.5 text-sm">
              <form action={toggleStepAction} className="mt-0.5 flex">
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="done" value={(!done).toString()} />
                <button
                  type="submit"
                  role="checkbox"
                  aria-checked={done}
                  title={done ? "Mark not done" : "Mark done"}
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border text-[10px]",
                    done ? "border-green bg-green text-white" : "border-border text-transparent",
                  )}
                >
                  ✓
                </button>
              </form>
              <span className={cn("min-w-0 flex-1", done && "text-dim line-through")}>
                <span className="text-dim">{s.code}</span> {s.title}
                {s.isComm && (
                  <span className="ml-1.5 rounded bg-accent/15 px-1 py-0.5 text-[10px] text-accent">
                    Send
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
