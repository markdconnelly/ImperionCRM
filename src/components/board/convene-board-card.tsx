"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { BoardPersona } from "@/lib/board/data";
import type { ConveneBoardResult } from "@/app/(app)/board/actions";

const TOPIC_MAX = 2000;
const CONTEXT_MAX = 8000;
const CISO_POSITION_MAX = 8000;
/** Epic #122: at most 2 invited advisors per session (counsel, not votes). */
const ADVISORS_MAX = 2;

/**
 * "Convene the board" card (ADR-0049, backend ADR-0039): topic + optional
 * context + the human CISO's position (ADR-0054 §4 deputy model) + persona and
 * advisor checkbox chips, submitting through the server action to the backend's
 * synchronous deliberation. A full session is many sequential premium model
 * calls (~30–90s), so the pending state is loud about what's happening.
 */
export function ConveneBoardCard({
  personas,
  advisors,
  canConvene,
  canSubmit,
  sourceNote,
  conveneAction,
}: {
  personas: BoardPersona[];
  /** The advisor bench — invited per session, weighed as counsel not votes. */
  advisors: BoardPersona[];
  /** Holds the sales:write capability (ADR-0045) — controls render enabled. */
  canConvene: boolean;
  /** Backend reachable — convening can actually run. */
  canSubmit: boolean;
  /** Degradation notice ('' when live). */
  sourceNote: string;
  conveneAction: (formData: FormData) => Promise<ConveneBoardResult>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(personas.map((p) => p.id)));
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [cisoPosition, setCisoPosition] = useState("");
  const [result, setResult] = useState<ConveneBoardResult | null>(null);
  const [pending, startTransition] = useTransition();

  const editable = canConvene && canSubmit && !pending;

  function togglePersona(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAdvisor(id: string) {
    setInvited((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < ADVISORS_MAX) next.add(id);
      return next;
    });
  }

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const r = await conveneAction(formData);
      setResult(r);
      if (r.ok) {
        setTopic("");
        setContext("");
        setCisoPosition("");
        setInvited(new Set());
      }
    });
  }

  const resultTone =
    result == null
      ? ""
      : result.status === "concluded"
        ? "border-green/40 text-green"
        : result.status === "paused" || result.status === "awaiting_ciso"
          ? "border-amber/40 text-amber"
          : "border-red/40 text-red";

  return (
    <section className="rounded-xl border border-border bg-panel p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-tight">Convene the board</h3>
        <span className="flex items-center gap-1 text-[11px] text-dim">
          <Icon name="Users" size={12} />
          two deliberation rounds + synthesis (backend ADR-0039)
        </span>
      </div>
      <p className="mb-3 text-sm text-dim">
        Pose a strategic question. The selected personas take opening positions, cross-examine
        each other, and a synthesis voice composes one board recommendation. Personas read
        granted business context only — they are walled off from CRM operations.
      </p>

      <form action={onSubmit} className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-xs text-dim">Topic — what should the board deliberate?</span>
          <textarea
            name="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={TOPIC_MAX}
            rows={2}
            required
            disabled={!editable}
            placeholder="e.g. Should we bundle a co-managed SOC offering into the standard managed-services tier?"
            className="w-full resize-y rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-dim">
            Context (optional) — handed verbatim to every persona
          </span>
          <textarea
            name="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            maxLength={CONTEXT_MAX}
            rows={3}
            disabled={!editable}
            placeholder="Numbers, constraints, background the directors should weigh…"
            className="w-full resize-y rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-dim">
            Your position as CISO (optional) — shown to every seat with veto weight on
            security matters; the staff-analyst deputy defers to it
          </span>
          <textarea
            name="cisoPosition"
            value={cisoPosition}
            onChange={(e) => setCisoPosition(e.target.value)}
            maxLength={CISO_POSITION_MAX}
            rows={2}
            disabled={!editable}
            placeholder="State your security position up front — leave blank and the deputy's draft is labeled unreviewed staff analysis…"
            className="w-full resize-y rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none disabled:opacity-60"
          />
        </label>

        <fieldset disabled={!editable}>
          <legend className="mb-2 text-xs text-dim">
            Who sits this session — default is the full board (max 5)
          </legend>
          <div className="flex flex-wrap gap-2">
            {personas.map((p) => {
              const active = selected.has(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
                    active
                      ? "border-accent bg-panel-2"
                      : "border-border bg-panel-2/50 hover:border-accent/50"
                  } ${editable ? "" : "cursor-default opacity-80"}`}
                >
                  <input
                    type="checkbox"
                    name="personaAgentIds"
                    value={p.id}
                    checked={active}
                    onChange={() => togglePersona(p.id)}
                    className="sr-only"
                  />
                  <span
                    className={`rounded border border-border px-1.5 py-0.5 text-[10px] ${
                      active ? "text-accent" : "text-dim"
                    }`}
                  >
                    {p.personaRole ?? "—"}
                  </span>
                  <span className="text-sm text-text">{p.name}</span>
                  {active && <Icon name="Check" size={13} className="text-accent" />}
                </label>
              );
            })}
          </div>
        </fieldset>

        {advisors.length > 0 && (
          <fieldset disabled={!editable}>
            <legend className="mb-2 text-xs text-dim">
              Invite advisors (optional, max {ADVISORS_MAX}) — counsel, not votes; the
              facilitator weighs them as expert input
            </legend>
            <div className="flex flex-wrap gap-2">
              {advisors.map((a) => {
                const active = invited.has(a.id);
                const full = !active && invited.size >= ADVISORS_MAX;
                return (
                  <label
                    key={a.id}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
                      active
                        ? "border-accent-2 bg-panel-2"
                        : "border-border bg-panel-2/50 hover:border-accent-2/50"
                    } ${editable && !full ? "cursor-pointer" : "cursor-default opacity-80"}`}
                  >
                    <input
                      type="checkbox"
                      name="advisorAgentIds"
                      value={a.id}
                      checked={active}
                      disabled={full}
                      onChange={() => toggleAdvisor(a.id)}
                      className="sr-only"
                    />
                    <span
                      className={`rounded border border-border px-1.5 py-0.5 text-[10px] ${
                        active ? "text-accent-2" : "text-dim"
                      }`}
                    >
                      advisor
                    </span>
                    <span className="text-sm text-text">{a.name}</span>
                    {active && <Icon name="Check" size={13} className="text-accent-2" />}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!editable || topic.trim().length === 0 || selected.size === 0}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {pending ? "Deliberating…" : "Convene the board"}
          </button>
          {pending && (
            <span className="flex items-center gap-2 text-xs text-accent">
              <Icon name="Loader2" size={14} className="animate-spin" />
              The board is deliberating — up to 11 model calls; this can take a minute or two.
            </span>
          )}
          {!pending && !canConvene && (
            <span className="text-xs text-dim">
              Read-only — convening a session needs the sales capability (or an admin).
            </span>
          )}
          {!pending && canConvene && !canSubmit && (
            <span className="text-xs text-amber">{sourceNote}</span>
          )}
          {!pending && editable && selected.size === 0 && (
            <span className="text-xs text-amber">Select at least one persona.</span>
          )}
        </div>
      </form>

      {result && !pending && (
        <div className={`mt-4 rounded-lg border bg-panel-2 p-4 ${resultTone}`}>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
            <Icon
              name={
                result.status === "concluded"
                  ? "CheckCircle2"
                  : result.status === "paused" || result.status === "awaiting_ciso"
                    ? "PauseCircle"
                    : "AlertTriangle"
              }
              size={14}
            />
            {result.status === "concluded"
              ? "Session concluded"
              : result.status === "paused"
                ? "Board paused — monthly budget reached"
                : result.status === "awaiting_ciso"
                  ? "Paused for the human CISO — approve or amend on the session page"
                  : result.status === "failed"
                    ? "Session failed"
                    : "Couldn't convene"}
          </div>
          <p className="mt-2 text-sm text-text">{result.message}</p>
          {result.recommendation && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="text-xs text-dim">Board recommendation</div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text">
                {result.recommendation}
              </p>
            </div>
          )}
          {result.sessionId && (
            <Link
              href={`/board/${result.sessionId}`}
              className="mt-3 inline-block rounded-md border border-border px-3 py-1.5 text-xs text-dim hover:text-text"
            >
              Open the full session →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
