"use client";

import { Icon } from "@/components/ui/icon";

export function TopBar({
  title,
  sidebarCollapsed,
  onToggleSidebar,
  agentCollapsed,
  onOpenAgent,
}: {
  title: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  agentCollapsed: boolean;
  onOpenAgent: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-panel px-4">
      <button
        onClick={onToggleSidebar}
        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="rounded-md p-1.5 text-dim hover:bg-panel-2 hover:text-text"
      >
        <Icon name="PanelLeft" size={18} />
      </button>

      <h1 className="font-display text-sm font-semibold tracking-tight">
        {title}
      </h1>

      <div className="relative ml-4 hidden flex-1 items-center md:flex">
        <Icon
          name="Search"
          size={15}
          className="pointer-events-none absolute left-3 text-dim"
        />
        <input
          placeholder="Search accounts, proposals, docs…"
          className="w-full max-w-md rounded-md border border-border bg-panel-2 py-1.5 pl-9 pr-3 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-green" />
          Graph sync
        </div>
        {agentCollapsed && (
          <button
            onClick={onOpenAgent}
            className="flex items-center gap-2 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-text hover:border-accent"
          >
            <Icon name="Sparkles" size={14} className="text-accent" />
            Agent
          </button>
        )}
      </div>
    </header>
  );
}
