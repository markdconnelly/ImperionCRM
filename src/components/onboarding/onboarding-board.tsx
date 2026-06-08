import Link from "next/link";
import { cn } from "@/lib/cn";
import type { OnboardingProject, Health } from "@/types";

const NEXT_HEALTH: Record<Health, Health> = { green: "amber", amber: "red", red: "green" };
const DOT: Record<Health, string> = { green: "bg-green", amber: "bg-amber", red: "bg-red" };

/** Overall project health = worst milestone (red beats amber beats green). */
function rollup(milestones: OnboardingProject["milestones"]): Health {
  if (milestones.some((m) => m.health === "red")) return "red";
  if (milestones.some((m) => m.health === "amber")) return "amber";
  return milestones.length ? "green" : "amber";
}

/**
 * Onboarding dashboard board (ADR-0034) — one card per client project with a
 * red/yellow/green indicator per major step and an overall rollup. Click a step
 * dot to cycle its health (manual until the auto-completion check is wired).
 */
export function OnboardingBoard({
  projects,
  setHealthAction,
}: {
  projects: OnboardingProject[];
  setHealthAction: (formData: FormData) => void | Promise<void>;
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel px-4 py-8 text-center text-sm text-dim">
        No onboarding projects yet. They start when a managed-services deal is won.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {projects.map((p) => {
        const overall = rollup(p.milestones);
        const done = p.milestones.filter((m) => m.status === "complete").length;
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
              <div className="shrink-0 text-xs text-dim">
                {done}/{p.milestones.length} done
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
              {p.milestones.length === 0 && (
                <div className="text-xs text-dim">No milestones defined yet.</div>
              )}
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
          </div>
        );
      })}
    </div>
  );
}
