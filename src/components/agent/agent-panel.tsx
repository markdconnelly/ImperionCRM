"use client";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import type { AgentMessage } from "@/types";

export function AgentPanel({
  onCollapse,
  agentMessages,
}: {
  onCollapse: () => void;
  agentMessages: AgentMessage[];
}) {
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

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {agentMessages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed",
              m.role === "agent"
                ? "self-start bg-panel-2 text-text"
                : "self-end bg-accent/15 text-text"
            )}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-panel-2 px-3 py-2">
          <input
            disabled
            placeholder="Ask the orchestrator…"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-dim focus:outline-none"
          />
          <Icon name="SendHorizontal" size={16} className="text-dim" />
        </div>
        <p className="mt-2 px-1 text-[11px] text-dim">
          Scoped to your Entra permissions. Stubbed — no backend yet.
        </p>
      </div>
    </aside>
  );
}
