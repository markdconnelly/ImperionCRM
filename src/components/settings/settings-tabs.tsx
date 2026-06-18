"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type TabKey = "profile" | "ai" | "tenants" | "tools";

const TABS: { key: TabKey; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "ai", label: "AI" },
  { key: "tenants", label: "Tenant mapping" },
  { key: "tools", label: "Tools & configuration" },
];

/**
 * Client tab bar for the Settings page (ADR-0036). Panels are rendered on the
 * server and passed in as props, so data fetching/auth stay server-side; this
 * component only owns which panel is visible.
 */
export function SettingsTabs({
  initialTab,
  profile,
  ai,
  tenants,
  tools,
}: {
  initialTab?: string;
  profile: ReactNode;
  ai: ReactNode;
  tenants: ReactNode;
  tools: ReactNode;
}) {
  const valid = TABS.some((t) => t.key === initialTab) ? (initialTab as TabKey) : "profile";
  const [tab, setTab] = useState<TabKey>(valid);

  const panel =
    tab === "profile"
      ? profile
      : tab === "ai"
        ? ai
        : tab === "tenants"
          ? tenants
          : tools;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              tab === t.key
                ? "border-accent text-text"
                : "border-transparent text-dim hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {panel}
    </div>
  );
}
