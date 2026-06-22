import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { ExecutedActionItem } from "@/lib/agent/pending-action-cockpit";

/**
 * The L4 oversight view (#1202, parent #996 / 2E, ADR-0107 D5 / ADR-0109). The
 * after-the-fact half of the approval cockpit: at autonomy level 4
 * (Autonomous-with-oversight) an agent action above the Supervised ceiling executes
 * INLINE rather than parking for approval, then surfaces here so an operator can review
 * what ran — proposing agent, action + ADR-0055 tier, the dial decision that routed it,
 * rationale, target, execution trace — and UNDO it while the window is open.
 *
 * The undo affordance is a compensating action through the backend (twin of the decide
 * endpoint, backend #267). Until that undo/compensate endpoint exists (backend issue
 * filed alongside this PR), the button renders DISABLED with a "pending backend" hint —
 * the list itself is fully live. `canReview` (`agents:operate`, admin) gates undo;
 * everyone else sees the read-only oversight list.
 *
 * Server component: oversight is read + (eventually) a server-action undo, no client
 * state needed for the list. Distinct file from the pending cockpit (`pending-action-
 * cockpit.tsx`) per the #1014 coordination note.
 */
export function L4OversightView({
  items,
  canReview,
}: {
  items: ExecutedActionItem[];
  canReview: boolean;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-panel p-5">
        <h3 className="mb-1 font-display text-sm font-semibold tracking-tight">
          Executed autonomously (L4 oversight)
        </h3>
        <p className="text-sm text-dim">
          Nothing executed without approval yet — actions an agent runs inline at autonomy
          level 4 (Autonomous-with-oversight) appear here for after-the-fact review, with an
          undo window while it&apos;s open.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-tight">
          Executed autonomously (L4 oversight)
          <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[10px] text-dim">
            {items.length} executed
          </span>
        </h3>
        <span className="text-[11px] text-dim">execute → oversee → undo (ADR-0107 D5)</span>
      </div>
      {items.map((item) => (
        <OversightCard key={item.id} item={item} canReview={canReview} />
      ))}
    </section>
  );
}

const TIER_TONE: Record<string, string> = {
  T0: "text-dim",
  T1: "text-accent",
  T2: "text-amber",
  T3: "text-red",
};

function OversightCard({ item, canReview }: { item: ExecutedActionItem; canReview: boolean }) {
  const isOpen = item.status === "executed"; // undo window still potentially open
  const decidedAt = item.decidedAt ? new Date(item.decidedAt).toLocaleString() : null;

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-xs font-medium text-text">
          {item.agentLabel}
        </span>
        <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-xs text-text">
          {item.actionKind}
        </span>
        <span className={`rounded border border-border px-1.5 py-0.5 text-[10px] ${TIER_TONE[item.tier] ?? "text-dim"}`}>
          {item.tier}
        </span>
        {item.resolvedLevel != null && (
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-dim">
            dial L{item.resolvedLevel} · ceiling {item.resolvedCeiling ?? "—"}
          </span>
        )}
        <span
          className={`rounded border border-border px-1.5 py-0.5 text-[10px] ${isOpen ? "text-green" : "text-dim"}`}
        >
          {isOpen ? "executed · undo window" : "expired · terminal"}
        </span>
        {item.target ? (
          item.target.href ? (
            <Link href={item.target.href} className="text-xs text-accent hover:underline">
              {item.target.label}
            </Link>
          ) : (
            <span className="text-xs text-text">{item.target.label}</span>
          )
        ) : (
          <span className="text-[11px] text-dim">no target linked</span>
        )}
      </div>

      <label className="mb-1 block text-[11px] uppercase tracking-wide text-dim">Action executed</label>
      <p className="w-full whitespace-pre-wrap rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text">
        {item.draft}
      </p>

      <dl className="mt-2 flex flex-col gap-1 text-xs">
        {item.rationale && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-dim">Rationale</dt>
            <dd className="text-text">{item.rationale}</dd>
          </div>
        )}
        {decidedAt && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-dim">Executed</dt>
            <dd className="text-text">{decidedAt}</dd>
          </div>
        )}
        {item.interactionId && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-dim">Interaction</dt>
            <dd className="text-text">{item.interactionId}</dd>
          </div>
        )}
        {item.runId && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-dim">Run trace</dt>
            <dd>
              <Link href={`/workflows/runs/${item.runId}`} className="text-accent hover:underline">
                glass-box trace →
              </Link>
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex items-center gap-2">
        {/*
          Undo is a compensating action through the backend — the twin of the decide
          endpoint (backend #267). That undo/compensate endpoint does not exist yet (a
          backend issue is filed alongside this PR), so the affordance renders disabled
          with a "pending backend" hint rather than wiring a non-existent route. Once the
          endpoint lands, this becomes a server-action submit gated on `isOpen && canReview`.
        */}
        <button
          type="button"
          disabled
          title="Undo needs the backend compensate endpoint (filed) — not wired yet."
          className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-dim opacity-60"
        >
          <Icon name="Undo2" size={14} />
          Undo
        </button>
        <span className="text-xs text-dim">
          {!canReview
            ? "Read-only — undo needs an admin (agents:operate)."
            : isOpen
              ? "Undo pending backend compensate endpoint."
              : "Undo window closed — terminal."}
        </span>
      </div>
    </div>
  );
}
