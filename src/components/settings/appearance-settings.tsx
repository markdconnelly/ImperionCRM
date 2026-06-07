"use client";

import { useEffect, useState } from "react";

const SIDEBAR_KEY = "imperion.sidebarCollapsed";
const AGENT_KEY = "imperion.agentCollapsed";

/**
 * Layout preferences persisted to localStorage and restored by the app shell on
 * load (CLAUDE.md §6). Changing a toggle writes the preference and reloads so the
 * shell picks it up.
 */
export function AppearanceSettings() {
  const [sidebar, setSidebar] = useState(false);
  const [agent, setAgent] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setSidebar(localStorage.getItem(SIDEBAR_KEY) === "true");
      setAgent(localStorage.getItem(AGENT_KEY) === "true");
    } catch {
      /* no-op */
    }
    setReady(true);
  }, []);

  function set(key: string, value: boolean) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      /* no-op */
    }
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Toggle
        label="Collapse the navigation sidebar by default"
        checked={sidebar}
        disabled={!ready}
        onChange={(v) => set(SIDEBAR_KEY, v)}
      />
      <Toggle
        label="Hide the agent panel by default"
        checked={agent}
        disabled={!ready}
        onChange={(v) => set(AGENT_KEY, v)}
      />
      <p className="mt-1 text-[11px] text-dim">
        The layout also remembers your last collapse state automatically.
      </p>
    </div>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-text">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border bg-panel-2 accent-accent"
      />
    </label>
  );
}
