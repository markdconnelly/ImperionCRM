"use client";

import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { askAgentAction } from "@/lib/agent/ask-action";
import type { AgentMessage } from "@/types";

/**
 * The right-hand orchestrator panel — LIVE against the backend's Claude tool-use loop
 * (backend ADR-0036) via `askAgentAction`. One conversation id per panel mount threads
 * the turns for tracing/audit. When the backend isn't configured the action returns a
 * clear notice instead of erroring, so the panel never breaks the shell.
 */
export function AgentPanel({
  onCollapse,
  agentMessages,
}: {
  onCollapse: () => void;
  agentMessages: AgentMessage[];
}) {
  const [messages, setMessages] = useState<AgentMessage[]>(agentMessages);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const conversationId = useRef<string>(crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  function send() {
    const message = draft.trim();
    if (!message || isPending) return;
    setDraft("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: message }]);
    startTransition(async () => {
      const reply = await askAgentAction(message, conversationId.current);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "agent", text: reply.text },
        ...(reply.requiresApproval
          ? [{
              id: crypto.randomUUID(),
              role: "agent" as const,
              text: "⏳ A drafted action is queued for your approval — nothing has been sent.",
            }]
          : []),
      ]);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
      );
    });
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-panel">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Icon name="Sparkles" size={16} className="text-accent" />
        <span className="font-display text-sm font-semibold tracking-tight">
          Imperion Agent
        </span>
        <button
          onClick={onCollapse}
          title="Collapse panel"
          className="ml-auto rounded-md p-1.5 text-dim hover:bg-panel-2 hover:text-text"
        >
          <Icon name="PanelRightClose" size={18} />
        </button>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
              m.role === "agent"
                ? "self-start bg-panel-2 text-text"
                : "self-end bg-accent/15 text-text"
            )}
          >
            {m.text}
          </div>
        ))}
        {isPending && (
          <div className="self-start rounded-lg bg-panel-2 px-3 py-2 text-sm text-dim">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="LoaderCircle" size={14} className="animate-spin" />
              working…
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
          className="flex items-center gap-2 rounded-md border border-border bg-panel-2 px-3 py-2 focus-within:border-accent"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isPending}
            placeholder="Ask the orchestrator…"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-dim focus:outline-none"
          />
          <button type="submit" disabled={isPending || !draft.trim()} title="Send">
            <Icon
              name="SendHorizontal"
              size={16}
              className={draft.trim() && !isPending ? "text-accent" : "text-dim"}
            />
          </button>
        </form>
        <p className="mt-2 px-1 text-[11px] text-dim">
          Scoped to your Entra permissions. Sends are drafted for your approval — never automatic.
        </p>
      </div>
    </aside>
  );
}
