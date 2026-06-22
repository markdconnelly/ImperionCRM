"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import type {
  DeadLetterRow,
  DlqDepth,
  EventLineageRow,
  EventRunRef,
} from "@/lib/agent/event-observability";
import type { IcmActionResult } from "@/app/(app)/workflows/actions";

/**
 * Wake-event observability + DLQ surface (#1000, 1D of epic #991/#997, ADR-0111). The glass box
 * over the event substrate: recent events with their lifecycle, the runs each event opened
 * (1:N fan-out — enumerated via eventKey, never assumed 1:1), and the dead-letter queue with an
 * admin replay. `canReplay` (`agents:operate`, admin) gates the replay control; everyone else
 * sees a read-only view. The replay write goes through the backend (ADR-0042).
 */

const STATUS_TONE: Record<string, string> = {
  pending: "text-dim",
  claimed: "text-accent",
  dispatched: "text-green",
  deferred: "text-amber",
  dead: "text-red",
  ignored: "text-dim",
};

const RUN_TONE: Record<string, string> = {
  running: "text-accent",
  succeeded: "text-green",
  failed: "text-red",
  cancelled: "text-dim",
};

function ago(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function EventObservabilityView({
  depth,
  deadLetters,
  lineage,
  canReplay,
  replayAction,
}: {
  depth: DlqDepth;
  deadLetters: DeadLetterRow[];
  lineage: EventLineageRow[];
  canReplay: boolean;
  replayAction: (formData: FormData) => Promise<IcmActionResult>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <DepthStrip depth={depth} />
      <DeadLetterQueue items={deadLetters} canReplay={canReplay} replayAction={replayAction} />
      <EventLineage rows={lineage} />
    </div>
  );
}

function DepthStrip({ depth }: { depth: DlqDepth }) {
  return (
    <section className="flex flex-wrap gap-3">
      <Stat label="Dead-lettered (DLQ depth)" value={depth.dead} tone={depth.dead > 0 ? "text-red" : "text-green"} />
      <Stat label="Deferred (retrying)" value={depth.deferred} tone={depth.deferred > 0 ? "text-amber" : "text-dim"} />
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel px-4 py-3">
      <div className={`font-display text-2xl font-semibold tracking-tight ${tone}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-dim">{label}</div>
    </div>
  );
}

function DeadLetterQueue({
  items,
  canReplay,
  replayAction,
}: {
  items: DeadLetterRow[];
  canReplay: boolean;
  replayAction: (formData: FormData) => Promise<IcmActionResult>;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-panel p-5">
        <h3 className="mb-1 font-display text-sm font-semibold tracking-tight">Dead-letter queue</h3>
        <p className="text-sm text-dim">
          Empty — a wake event that exhausts its dispatch attempts lands here with the original
          event preserved, ready to replay once the cause is fixed.
        </p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-tight">
          Dead-letter queue
          <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[10px] text-red">
            {items.length} dead
          </span>
        </h3>
        <span className="text-[11px] text-dim">replay re-injects the original event — idempotent (eventKey guard)</span>
      </div>
      {items.map((item) => (
        <DeadLetterCard key={item.id} item={item} canReplay={canReplay} replayAction={replayAction} />
      ))}
    </section>
  );
}

function DeadLetterCard({
  item,
  canReplay,
  replayAction,
}: {
  item: DeadLetterRow;
  canReplay: boolean;
  replayAction: (formData: FormData) => Promise<IcmActionResult>;
}) {
  const [notice, setNotice] = useState<IcmActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function replay() {
    const fd = new FormData();
    fd.set("eventId", item.id);
    startTransition(async () => setNotice(await replayAction(fd)));
  }

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-xs text-text">
          {item.eventType}
        </span>
        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-dim">{item.source}</span>
        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-red">
          {item.attempts} attempts
        </span>
        <span className="text-[11px] text-dim">dead {ago(item.deadLetteredAt)}</span>
        {item.replayedAt && (
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-accent">
            replayed {ago(item.replayedAt)}
          </span>
        )}
      </div>

      {item.lastError && (
        <p className="mb-2 rounded-md border border-border bg-panel-2 px-3 py-2 font-mono text-[11px] text-amber">
          {item.lastError}
        </p>
      )}

      <div className="mt-1 flex items-center gap-2">
        {canReplay ? (
          <button
            type="button"
            onClick={replay}
            disabled={pending}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-text transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
          >
            <Icon name="RotateCcw" size={14} />
            Replay event
          </button>
        ) : (
          <span className="text-xs text-dim">Read-only — replaying needs an admin (agents:operate).</span>
        )}
        {notice && (
          <span className={`text-xs ${notice.ok ? "text-green" : "text-amber"}`}>{notice.message}</span>
        )}
      </div>
    </div>
  );
}

function EventLineage({ rows }: { rows: EventLineageRow[] }) {
  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-panel p-5">
        <h3 className="mb-1 font-display text-sm font-semibold tracking-tight">Recent events</h3>
        <p className="text-sm text-dim">
          No wake events yet — when the Pipeline emits a business event (e.g. a new Autotask
          ticket) it appears here with the subscriptions it matched and the runs it opened.
        </p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-display text-sm font-semibold tracking-tight">
        Recent events
        <span className="ml-2 text-[11px] font-normal text-dim">event → matched subscriptions → resulting runs (1:N)</span>
      </h3>
      {rows.map((row) => (
        <EventCard key={row.id} row={row} />
      ))}
    </section>
  );
}

function EventCard({ row }: { row: EventLineageRow }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-xs text-text">
          {row.eventType}
        </span>
        <span className={`rounded border border-border px-1.5 py-0.5 text-[10px] ${STATUS_TONE[row.status] ?? "text-dim"}`}>
          {row.status}
        </span>
        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-dim">{row.source}</span>
        <span className="text-[11px] text-dim">{ago(row.createdAt)}</span>
        {row.replayedAt && (
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-accent">replayed</span>
        )}
      </div>

      {row.status === "dead" && row.lastError && (
        <p className="mb-2 font-mono text-[11px] text-amber">{row.lastError}</p>
      )}

      <div className="mt-1">
        <span className="text-[11px] uppercase tracking-wide text-dim">
          Resulting runs ({row.runs.length})
        </span>
        {row.runs.length === 0 ? (
          <p className="text-xs text-dim">
            {row.status === "ignored"
              ? "No subscription matched — nothing woken."
              : row.status === "dead"
                ? "No run opened — dead-lettered."
                : "No run yet."}
          </p>
        ) : (
          <ul className="mt-1 flex flex-col gap-1">
            {row.runs.map((run) => (
              <RunLine key={run.runId} run={run} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RunLine({ run }: { run: EventRunRef }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-text">{run.workflowKey}</span>
      <span className={RUN_TONE[run.status] ?? "text-dim"}>{run.status}</span>
      <Link href={`/workflows/runs/${run.runId}`} className="text-accent hover:underline">
        glass-box trace →
      </Link>
    </li>
  );
}
