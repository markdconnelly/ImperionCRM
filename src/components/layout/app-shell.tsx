"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { AgentPanel } from "@/components/agent/agent-panel";
import type { AgentMessage, SessionUser } from "@/types";

/**
 * Three-column application shell. Wraps every authenticated route (the (app)
 * route group layout). The active nav item and page title derive from the
 * current route; only collapse state is local.
 */
export function AppShell({
  children,
  user,
  agentMessages,
}: {
  children: React.ReactNode;
  user: SessionUser;
  agentMessages: AgentMessage[];
}) {
  // In-memory only for now. Per CLAUDE.md §7.2, ready to be persisted
  // (user setting / localStorage) without changing this component's shape.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentCollapsed, setAgentCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text">
      <Sidebar
        collapsed={sidebarCollapsed}
        onExpand={() => setSidebarCollapsed(false)}
        user={user}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          agentCollapsed={agentCollapsed}
          onOpenAgent={() => setAgentCollapsed(false)}
        />
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>

      {!agentCollapsed && (
        <AgentPanel
          onCollapse={() => setAgentCollapsed(true)}
          agentMessages={agentMessages}
        />
      )}
    </div>
  );
}
