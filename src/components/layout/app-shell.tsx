"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { AgentPanel } from "@/components/agent/agent-panel";

export function AppShell({ children }: { children: React.ReactNode }) {
  // In-memory only for now. Per CLAUDE.md §7.2, ready to be persisted
  // (user setting / localStorage) without changing this component's shape.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentCollapsed, setAgentCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text">
      <Sidebar
        collapsed={sidebarCollapsed}
        onExpand={() => setSidebarCollapsed(false)}
        active="dashboard"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title="Dashboard"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          agentCollapsed={agentCollapsed}
          onOpenAgent={() => setAgentCollapsed(false)}
        />
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>

      {!agentCollapsed && (
        <AgentPanel onCollapse={() => setAgentCollapsed(true)} />
      )}
    </div>
  );
}
