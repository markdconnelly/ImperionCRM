"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import {
  chatChannelIcon,
  chatChannelLabel,
  chatDeflectionLabel,
  chatStatusMeta,
  parseTranscriptPreview,
  timeAgo,
} from "@/lib/chat-live";
import { isOpenChatSession } from "@/lib/chat-session";
import type { ChatDeflectionSummary, ChatSessionRow } from "@/types";
import type {
  ChatReplyResult,
  EscalateChatResult,
} from "@/app/(app)/service-desk/chat/actions";

const REPLY_MAX = 8000;
const TITLE_MAX = 250;

interface AccountOption {
  id: string;
  name: string;
}

/**
 * The support-agent live-chat console (ADR-0074 §6, #407).
 *
 * Left: the session queue (open sessions first, then recent). Right: the selected
 * session's transcript preview, deflection telemetry, a reply box, and the
 * escalate-to-Autotask form. Reads are server-rendered; the reply + escalate paths
 * post through server actions to the backend (escalate is a real idempotent Autotask
 * round-trip; reply degrades honestly until the transport seam is wired). All client
 * state is selection + the two action results — no data fetching here.
 */
export function AgentConsole({
  sessions,
  summary,
  accounts,
  canWrite,
  escalateConfigured,
  transportNote,
  escalateAction,
  replyAction,
}: {
  sessions: ChatSessionRow[];
  summary: ChatDeflectionSummary;
  accounts: AccountOption[];
  /** Holds tickets:write (ADR-0045) — gates the reply + escalate controls. */
  canWrite: boolean;
  /** The Autotask integration backend is reachable — escalation can file. */
  escalateConfigured: boolean;
  /** The honest "live transport not wired" notice ('' when wired). */
  transportNote: string;
  escalateAction: (formData: FormData) => Promise<EscalateChatResult>;
  replyAction: (formData: FormData) => Promise<ChatReplyResult>;
}) {
  // Open sessions float to the top; within each group keep server recency order.
  const ordered = useMemo(() => {
    const open = sessions.filter(isOpenChatSession);
    const rest = sessions.filter((s) => !isOpenChatSession(s));
    return [...open, ...rest];
  }, [sessions]);

  const [selectedId, setSelectedId] = useState<string | null>(ordered[0]?.id ?? null);
  const selected = useMemo(
    () => ordered.find((s) => s.id === selectedId) ?? null,
    [ordered, selectedId],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {/* ── Session queue ── */}
      <section className="rounded-xl border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h3 className="font-display text-sm font-semibold tracking-tight">Sessions</h3>
          <span className="text-[11px] text-dim">
            {ordered.filter(isOpenChatSession).length} active · {ordered.length} total
          </span>
        </div>
        <ul className="max-h-[34rem] divide-y divide-border/60 overflow-y-auto">
          {ordered.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-dim">
              No chat sessions yet. They appear here once the backend chat process records one.
            </li>
          )}
          {ordered.map((s) => {
            const meta = chatStatusMeta(s.status);
            const active = s.id === selectedId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-panel-2 ${
                    active ? "bg-panel-2" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-text">
                      <Icon name={chatChannelIcon(s.channel)} size={13} className="text-dim" />
                      {s.contactName ?? "Anonymous visitor"}
                    </span>
                    <span className={`rounded border border-border px-1.5 py-0.5 text-[10px] ${meta.tone}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-dim">
                    <span className="truncate">{s.account ?? chatChannelLabel(s.channel)}</span>
                    <span className="whitespace-nowrap" title={s.startedAt}>
                      {timeAgo(s.startedAt)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        {/* Deflection telemetry headline (ADR-0074 §4 / BI hub ADR-0062) */}
        <div className="grid grid-cols-3 border-t border-border text-center">
          <Stat label="Sessions" value={String(summary.total)} />
          <Stat label="Deflected" value={String(summary.deflected)} tone="text-green" />
          <Stat
            label="Deflection"
            value={`${Math.round(summary.deflectionRate * 100)}%`}
            tone="text-accent"
          />
        </div>
      </section>

      {/* ── Conversation pane ── */}
      <section className="rounded-xl border border-border bg-panel">
        {selected == null ? (
          <div className="flex h-full min-h-[20rem] items-center justify-center px-6 py-16 text-center text-sm text-dim">
            Select a session to view its transcript and deflection telemetry.
          </div>
        ) : (
          <ConversationPane
            session={selected}
            accounts={accounts}
            canWrite={canWrite}
            escalateConfigured={escalateConfigured}
            transportNote={transportNote}
            escalateAction={escalateAction}
            replyAction={replyAction}
          />
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="px-2 py-3">
      <div className={`font-display text-base font-semibold ${tone ?? "text-text"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-dim">{label}</div>
    </div>
  );
}

function ConversationPane({
  session,
  accounts,
  canWrite,
  escalateConfigured,
  transportNote,
  escalateAction,
  replyAction,
}: {
  session: ChatSessionRow;
  accounts: AccountOption[];
  canWrite: boolean;
  escalateConfigured: boolean;
  transportNote: string;
  escalateAction: (formData: FormData) => Promise<EscalateChatResult>;
  replyAction: (formData: FormData) => Promise<ChatReplyResult>;
}) {
  const meta = chatStatusMeta(session.status);
  const transcript = parseTranscriptPreview(session.summary);
  const deflectionLabel = chatDeflectionLabel(session.deflectionKind);
  const open = isOpenChatSession(session);

  const [reply, setReply] = useState("");
  const [replyResult, setReplyResult] = useState<ChatReplyResult | null>(null);
  const [escalateResult, setEscalateResult] = useState<EscalateChatResult | null>(null);
  const [accountId, setAccountId] = useState(session.accountId ?? "");
  const [pending, startTransition] = useTransition();

  function onReply(formData: FormData) {
    setReplyResult(null);
    startTransition(async () => {
      const r = await replyAction(formData);
      setReplyResult(r);
      if (r.ok) setReply("");
    });
  }

  function onEscalate(formData: FormData) {
    setEscalateResult(null);
    startTransition(async () => {
      const r = await escalateAction(formData);
      setEscalateResult(r);
    });
  }

  const alreadyEscalated = session.escalatedTicketRef != null || session.status === "escalated";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold tracking-tight">
              {session.contactName ?? "Anonymous visitor"}
            </span>
            <span className={`rounded border border-border px-1.5 py-0.5 text-[10px] ${meta.tone}`}>
              {meta.label}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-dim">
            <span className="flex items-center gap-1">
              <Icon name={chatChannelIcon(session.channel)} size={11} />
              {chatChannelLabel(session.channel)}
            </span>
            <span>{session.account ?? "No account attached"}</span>
            <span title={session.startedAt}>started {timeAgo(session.startedAt)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-[11px] text-dim">
          {session.deflected && (
            <span className="flex items-center gap-1 text-green">
              <Icon name="ShieldCheck" size={12} />
              Deflected{deflectionLabel ? ` · ${deflectionLabel}` : ""}
            </span>
          )}
          {alreadyEscalated && (
            <span className="flex items-center gap-1 text-amber">
              <Icon name="Ticket" size={12} />
              {session.escalatedTicketRef
                ? `Escalated · ${session.escalatedTicketRef}`
                : "Escalated"}
            </span>
          )}
        </div>
      </div>

      {/* Transcript preview */}
      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
        {transcript.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-panel-2/40 px-4 py-6 text-center text-sm text-dim">
            No transcript preview. The full transcript is held in governed blob by the backend
            (it may carry PII) — a fetch seam will surface it here.
          </p>
        ) : (
          transcript.map((line, i) => (
            <div
              key={i}
              className={`flex ${line.role === "visitor" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  line.role === "visitor"
                    ? "bg-panel-2 text-text"
                    : line.role === "bot"
                      ? "border border-accent-2/40 bg-accent-2/10 text-text"
                      : "bg-accent/15 text-text"
                }`}
              >
                <div className="mb-0.5 text-[10px] uppercase tracking-wide text-dim">
                  {line.role}
                </div>
                {line.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply box (degrades honestly until transport is wired) */}
      <div className="border-t border-border px-5 py-3">
        {transportNote && (
          <p className="mb-2 flex items-start gap-1.5 text-[11px] text-amber">
            <Icon name="Info" size={12} className="mt-0.5 shrink-0" />
            {transportNote}
          </p>
        )}
        <form action={onReply} className="flex items-end gap-2">
          <input type="hidden" name="sessionId" value={session.id} />
          <textarea
            name="body"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            maxLength={REPLY_MAX}
            rows={2}
            disabled={!canWrite || !open || pending}
            placeholder={
              open ? "Type a reply to the visitor…" : "This session is closed — reopen to reply."
            }
            className="w-full resize-y rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!canWrite || !open || pending || reply.trim().length === 0}
            className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {pending ? "…" : "Reply"}
          </button>
        </form>
        {!canWrite && (
          <p className="mt-1 text-[11px] text-dim">
            Read-only — replying needs the service-desk (tickets) capability.
          </p>
        )}
        {replyResult && (
          <p className={`mt-1 text-[11px] ${replyResult.ok ? "text-dim" : "text-red"}`}>
            {replyResult.message}
          </p>
        )}
      </div>

      {/* Escalate to Autotask ticket */}
      <div className="border-t border-border bg-panel-2/30 px-5 py-3">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-dim hover:text-text [&::-webkit-details-marker]:hidden">
            <Icon name="Ticket" size={13} />
            {alreadyEscalated ? "Escalate again / view ticket" : "Escalate to Autotask ticket"}
            <Icon name="ChevronDown" size={13} className="transition-transform group-open:rotate-180" />
          </summary>
          <form action={onEscalate} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="sessionId" value={session.id} />
            <label className="flex flex-col gap-1 text-[11px] text-dim">
              Account (required — a ticket needs an account)
              <select
                name="accountId"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                disabled={!canWrite || pending}
                className="rounded-md border border-border bg-panel px-2 py-1.5 text-sm text-text disabled:opacity-60"
              >
                <option value="">Select an account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-dim">
              Ticket title
              <input
                type="text"
                name="title"
                maxLength={TITLE_MAX}
                required
                disabled={!canWrite || pending}
                defaultValue={session.summary?.slice(0, 80) ?? ""}
                placeholder="Short summary of the issue"
                className="rounded-md border border-border bg-panel px-2 py-1.5 text-sm text-text placeholder:text-dim disabled:opacity-60"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-dim">
              Description (optional — the transcript is handed to the ticket)
              <textarea
                name="description"
                rows={2}
                disabled={!canWrite || pending}
                placeholder="Anything the assigned tech should know"
                className="resize-y rounded-md border border-border bg-panel px-2 py-1.5 text-sm text-text placeholder:text-dim disabled:opacity-60"
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!canWrite || !escalateConfigured || pending}
                className="rounded-md border border-amber/50 px-3 py-1.5 text-xs font-medium text-amber transition-colors hover:bg-amber/10 disabled:opacity-60"
              >
                {pending ? "Filing…" : "File Autotask ticket"}
              </button>
              {!escalateConfigured && (
                <span className="text-[11px] text-dim">
                  Integration backend not reachable — escalation is disabled here.
                </span>
              )}
            </div>
          </form>
        </details>
        {escalateResult && (
          <div
            className={`mt-2 rounded-md border bg-panel px-3 py-2 text-xs ${
              escalateResult.ok ? "border-green/40 text-green" : "border-red/40 text-red"
            }`}
          >
            {escalateResult.message}
            {escalateResult.ticketRef && (
              <Link
                href="/tickets"
                className="ml-2 inline-block text-dim underline hover:text-text"
              >
                View in Tickets →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
