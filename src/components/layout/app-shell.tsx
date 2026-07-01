"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { AgentPanel } from "@/components/agent/agent-panel";
import { AgentSessionProvider } from "@/components/agent/agent-session-context";
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
  // Collapse state persists to localStorage and is restored on load (CLAUDE.md §6).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentCollapsed, setAgentCollapsed] = useState(false);

  // The /nova landing page IS the agent surface (#1118) — suppress the right-hand
  // sidecar (and its top-bar reopen affordance) there; show it on every other route.
  const hideAgent = usePathname() === "/nova";

  useEffect(() => {
    try {
      const s = localStorage.getItem("imperion.sidebarCollapsed");
      const a = localStorage.getItem("imperion.agentCollapsed");
      if (s != null) setSidebarCollapsed(s === "true");
      if (a != null) setAgentCollapsed(a === "true");
    } catch {
      /* localStorage unavailable — fall back to in-memory defaults */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("imperion.sidebarCollapsed", String(sidebarCollapsed));
    } catch {
      /* no-op */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem("imperion.agentCollapsed", String(agentCollapsed));
    } catch {
      /* no-op */
    }
  }, [agentCollapsed]);

  return (
    // The session provider lives ABOVE the conditional AgentPanel render so the sidecar
    // conversation survives navigation, collapse, and /nova (#1119). It mounts once —
    // the (app) layout segment keeps AppShell alive across route changes.
    <AgentSessionProvider initialMessages={agentMessages}>
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
            // On /nova the panel is intentionally absent, so hide the reopen button.
            agentCollapsed={hideAgent ? false : agentCollapsed}
            onOpenAgent={() => setAgentCollapsed(false)}
          />
          <main className="flex-1 overflow-y-auto p-4">{children}</main>
        </div>

        {!agentCollapsed && !hideAgent && (
          <AgentPanel onCollapse={() => setAgentCollapsed(true)} />
        )}
      </div>
    </AgentSessionProvider>
  );
}
