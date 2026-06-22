"use client";

import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { askAgentAction } from "@/lib/agent/ask-action";
import { loadConversationDetailAction } from "@/app/(app)/jarvis/actions";
import { ProposedActionCard } from "@/components/agent/proposed-action-card";
import type { JarvisConversation, JarvisConversationDetail } from "@/lib/agent/jarvis";
import type { ProposedAction } from "@/lib/services";
import type { AgentMessage } from "@/types";

/**
 * Jarvis console (#1118) — the codex-style front door: a session-history rail (left),
 * the live orchestrator chat as the main focus (center), and a drill-in pop-out (right)
 * that opens a past session's verbose run/stage trace. Live turns go through the same
 * `askAgentAction` seam as the sidecar; the backend persists the conversation, so the
 * rail repopulates on reload (deploy-dormant until #1064 is prod-applied).
 */
export function JarvisConsole({
  initialConversations,
}: {
  initialConversations: JarvisConversation[];
}) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  // Proposed-action envelopes (#1130) keyed by the agent message they accompany — kept off
  // AgentMessage so the shared type stays untouched (the cockpit, #1014, owns the queue surface).
  const [actionsByMsg, setActionsByMsg] = useState<Record<string, ProposedAction[]>>({});
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const conversationId = useRef<string>(crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JarvisConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  function send() {
    const message = draft.trim();
    if (!message || isPending) return;
    setDraft("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: message }]);
    startTransition(async () => {
      const reply = await askAgentAction(message, conversationId.current);
      const replyId = crypto.randomUUID();
      const hasActions = (reply.proposedActions?.length ?? 0) > 0;
      setMessages((prev) => [
        ...prev,
        { id: replyId, role: "agent", text: reply.text },
        // Only show the generic notice when the agent flagged approval but returned no
        // renderable envelope (e.g. an older backend deploy); otherwise the cards say it.
        ...(reply.requiresApproval && !hasActions
          ? [{
              id: crypto.randomUUID(),
              role: "agent" as const,
              text: "⏳ A drafted action is queued for your approval — nothing has been sent.",
            }]
          : []),
      ]);
      if (hasActions) {
        setActionsByMsg((prev) => ({ ...prev, [replyId]: reply.proposedActions! }));
      }
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
      );
    });
  }

  function newConversation() {
    conversationId.current = crypto.randomUUID();
    setMessages([]);
    setActionsByMsg({});
    setSelectedId(null);
    setDetail(null);
  }

  function openConversation(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    startTransition(async () => {
      const d = await loadConversationDetailAction(id);
      setDetail(d);
      setDetailLoading(false);
    });
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-3">
      {/* ── Session history rail ─────────────────────────────────────────── */}
      <aside className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-panel">
        <div className="flex h-12 items-center justify-between border-b border-border px-3">
          <span className="font-display text-sm font-semibold tracking-tight">Conversations</span>
          <button
            onClick={newConversation}
            title="New conversation"
            className="flex items-center gap-1 rounded-md bg-accent/15 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/25"
          >
            <Icon name="Plus" size={14} /> New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {initialConversations.length === 0 ? (
            <p className="px-2 py-4 text-xs text-dim">
              No past conversations yet. Start one — your sessions appear here.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {initialConversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => openConversation(c.id)}
                    className={cn(
                      "w-full rounded-md px-2.5 py-2 text-left hover:bg-panel-2",
                      selectedId === c.id && "bg-panel-2 ring-1 ring-accent/40",
                    )}
                  >
                    <span className="line-clamp-2 text-sm text-text">{c.title}</span>
                    <span className="mt-1 flex items-center gap-2 text-[11px] text-dim">
                      <Icon name="MessagesSquare" size={11} />
                      {c.runCount} run{c.runCount === 1 ? "" : "s"}
                      <span>· {new Date(c.lastMessageAt ?? c.startedAt).toLocaleDateString()}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Live chat — the main focus ───────────────────────────────────── */}
      <section className="flex min-w-0 flex-1 flex-col rounded-lg border border-border bg-panel">
        <div className="flex h-12 items-center gap-2 border-b border-border px-4">
          <Icon name="Sparkles" size={16} className="text-accent" />
          <span className="font-display text-sm font-semibold tracking-tight">Jarvis</span>
          <span className="text-xs text-dim">· your orchestrator — the driver of work</span>
        </div>

        <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-6">
          {messages.length === 0 && !isPending && (
            <div className="m-auto max-w-md text-center">
              <Icon name="Sparkles" size={28} className="mx-auto text-accent" />
              <h2 className="mt-3 font-display text-lg font-semibold tracking-tight">
                What are we working on?
              </h2>
              <p className="mt-1 text-sm text-dim">
                Ask Jarvis to triage a ticket, draft a reply, pull a report, or kick off a workflow.
                Drafts are queued for your approval — never sent automatically.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className="contents">
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "agent" ? "self-start bg-panel-2 text-text" : "self-end bg-accent/15 text-text",
                )}
              >
                {m.text}
              </div>
              {actionsByMsg[m.id]?.map((action, i) => (
                <ProposedActionCard key={`${m.id}-${i}`} action={action} />
              ))}
            </div>
          ))}
          {isPending && !detailLoading && (
            <div className="self-start rounded-lg bg-panel-2 px-3.5 py-2.5 text-sm text-dim">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="LoaderCircle" size={14} className="animate-spin" /> working…
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-end gap-2 rounded-lg border border-border bg-panel-2 px-3 py-2 focus-within:border-accent"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={isPending}
              rows={1}
              placeholder="Ask Jarvis to get to work…  (Enter to send, Shift+Enter for a new line)"
              className="max-h-40 flex-1 resize-none bg-transparent text-sm text-text placeholder:text-dim focus:outline-none"
            />
            <button type="submit" disabled={isPending || !draft.trim()} title="Send" className="pb-0.5">
              <Icon
                name="SendHorizontal"
                size={18}
                className={draft.trim() && !isPending ? "text-accent" : "text-dim"}
              />
            </button>
          </form>
          <p className="mt-2 px-1 text-[11px] text-dim">
            Scoped to your Entra permissions. Sends are drafted for your approval — never automatic.
          </p>
        </div>
      </section>

      {/* ── Drill-in pop-out — the verbose glass-box trace ───────────────── */}
      {selectedId && (
        <aside className="flex w-96 shrink-0 flex-col rounded-lg border border-border bg-panel">
          <div className="flex h-12 items-center gap-2 border-b border-border px-4">
            <Icon name="ScrollText" size={16} className="text-accent" />
            <span className="font-display text-sm font-semibold tracking-tight">Session detail</span>
            <button
              onClick={() => {
                setSelectedId(null);
                setDetail(null);
              }}
              title="Close"
              className="ml-auto rounded-md p-1.5 text-dim hover:bg-panel-2 hover:text-text"
            >
              <Icon name="X" size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {detailLoading && (
              <p className="inline-flex items-center gap-1.5 text-sm text-dim">
                <Icon name="LoaderCircle" size={14} className="animate-spin" /> loading trace…
              </p>
            )}
            {!detailLoading && !detail && (
              <p className="text-sm text-dim">No trace available for this conversation yet.</p>
            )}
            {detail && (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-text">{detail.title}</h3>
                  <p className="mt-0.5 text-[11px] text-dim">
                    {detail.runCount} run{detail.runCount === 1 ? "" : "s"} · started{" "}
                    {new Date(detail.startedAt).toLocaleString()}
                  </p>
                </div>
                {detail.runs.length === 0 && (
                  <p className="text-sm text-dim">No runs recorded for this conversation.</p>
                )}
                {detail.runs.map((run) => (
                  <div key={run.id} className="rounded-md border border-border bg-panel-2 p-3">
                    <div className="flex items-center gap-2">
                      <Icon name="Bot" size={14} className="text-accent" />
                      <span className="text-sm font-medium text-text">{run.agentName}</span>
                      <span
                        className={cn(
                          "ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                          run.status === "succeeded" && "bg-green/15 text-green",
                          run.status === "running" && "bg-amber/15 text-amber",
                          run.status === "failed" && "bg-red/15 text-red",
                        )}
                      >
                        {run.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-dim">${run.costUsd.toFixed(4)}</p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {run.stages.map((s) => (
                        <li key={s.id} className="text-xs">
                          <span className="font-mono uppercase text-dim">{s.role}</span>
                          <p className="mt-0.5 whitespace-pre-wrap text-text">{s.content}</p>
                          {s.toolCalls != null && (
                            <pre className="mt-1 overflow-x-auto rounded bg-bg p-2 font-mono text-[10px] text-dim">
                              {JSON.stringify(s.toolCalls, null, 2)}
                            </pre>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
