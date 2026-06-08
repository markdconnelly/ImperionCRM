import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ONBOARDING_TEMPLATE, templateStepCount } from "@/lib/onboarding-template";

// The standard onboarding playbook (ADR-0037), read-only. Edited in
// lib/onboarding-template.ts; instantiated per project from the dashboard.
export default function OnboardingPlaybookPage() {
  const t = ONBOARDING_TEMPLATE;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Onboarding playbook"
        description={`${t.name} · v${t.version} · ${t.phases.length} phases · ${templateStepCount(t)} steps`}
      >
        <Link
          href="/onboarding"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
        >
          ← Back to onboarding
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-3">
        {t.phases.map((ph) => (
          <section key={ph.ordinal} className="rounded-xl border border-border bg-panel p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-sm font-semibold tracking-tight">
                {ph.ordinal}. {ph.name}
              </h3>
              <span className="shrink-0 text-xs text-dim">
                day {ph.offsetDays}–{ph.offsetDays + ph.durationDays} · {ph.steps.length} steps
              </span>
            </div>
            <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
              {ph.steps.map((s) => (
                <li key={s.code} className="flex items-start gap-2 text-sm">
                  <span className="w-9 shrink-0 text-xs tabular-nums text-dim">{s.code}</span>
                  <span className="min-w-0 flex-1">
                    {s.title}
                    {s.send && (
                      <span className="ml-1.5 rounded bg-accent/15 px-1 py-0.5 text-[10px] text-accent">
                        Send
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
