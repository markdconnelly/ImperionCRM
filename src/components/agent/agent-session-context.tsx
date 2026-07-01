"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { AgentMessage } from "@/types";

/**
 * Holds the right-hand sidecar conversation ABOVE the per-route shell render (#1119) so the
 * thread + its `conversation_id` survive page-to-page navigation, collapse/expand, and a
 * trip through /nova (where the sidecar is suppressed, #1118). The provider mounts ONCE in
 * AppShell — which the (app) layout segment keeps alive across navigation — while AgentPanel
 * mounts/unmounts beneath it as a pure consumer. Also rehydrates from sessionStorage so a
 * reload keeps the thread within the browser session. No persistence to disk/DB (ADR-0042 —
 * the backend owns the durable ledger; this is just live UI state).
 */
interface AgentSessionValue {
  messages: AgentMessage[];
  addMessages: (msgs: AgentMessage[]) => void;
  /** The stable conversation id threading this session's turns for tracing/audit. */
  conversationId: () => string;
  /** Start a fresh thread (new id, cleared messages). */
  reset: () => void;
}

const AgentSessionContext = createContext<AgentSessionValue | null>(null);
const STORAGE_KEY = "imperion.agentSession";

export function AgentSessionProvider({
  initialMessages,
  children,
}: {
  initialMessages: AgentMessage[];
  children: React.ReactNode;
}) {
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages);
  const convId = useRef<string>("");
  const hydrated = useRef(false);

  // Rehydrate once on the client (sessionStorage is unavailable during SSR).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { conversationId?: string; messages?: AgentMessage[] };
        if (saved.conversationId) convId.current = saved.conversationId;
        if (Array.isArray(saved.messages) && saved.messages.length > 0) setMessages(saved.messages);
      }
    } catch {
      /* sessionStorage unavailable or corrupt — fall back to the server-seeded state */
    }
    if (!convId.current) convId.current = crypto.randomUUID();
    hydrated.current = true;
  }, []);

  // Persist on change (only after hydration, so we never clobber saved state on first paint).
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ conversationId: convId.current, messages }),
      );
    } catch {
      /* no-op */
    }
  }, [messages]);

  const value: AgentSessionValue = {
    messages,
    addMessages: (msgs) => setMessages((prev) => [...prev, ...msgs]),
    conversationId: () => {
      if (!convId.current) convId.current = crypto.randomUUID();
      return convId.current;
    },
    reset: () => {
      convId.current = crypto.randomUUID();
      setMessages([]);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* no-op */
      }
    },
  };

  return <AgentSessionContext.Provider value={value}>{children}</AgentSessionContext.Provider>;
}

export function useAgentSession(): AgentSessionValue {
  const v = useContext(AgentSessionContext);
  if (!v) throw new Error("useAgentSession must be used within an AgentSessionProvider");
  return v;
}
