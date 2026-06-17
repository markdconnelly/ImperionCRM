"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

type TabKey = "register" | "devices";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "register", label: "CI register", icon: "ListTree" },
  { key: "devices", label: "Device inventory", icon: "MonitorSmartphone" },
];

/**
 * CMDB section switcher (#795) — folds the former `/devices` surface into CMDB
 * as a "Device inventory" tab alongside the CI register. Both sections are
 * projected server-side under the same admin|technician guard (ADR-0078); this
 * switch is purely presentational, so it runs client-side for instant response.
 */
export function CmdbTabs({
  register,
  devices,
  deviceCount,
}: {
  register: ReactNode;
  devices: ReactNode;
  deviceCount: number;
}) {
  const [active, setActive] = useState<TabKey>("register");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 self-start rounded-md border border-border bg-panel p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              active === t.key ? "bg-panel-2 text-text" : "text-dim hover:text-text"
            }`}
          >
            <Icon name={t.icon} size={12} />
            {t.label}
            {t.key === "devices" && (
              <span className="rounded bg-border px-1 text-[10px] text-dim">{deviceCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className={active === "register" ? "" : "hidden"}>{register}</div>
      <div className={active === "devices" ? "" : "hidden"}>{devices}</div>
    </div>
  );
}
