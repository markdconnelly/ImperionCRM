"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { CI_TYPE_ICON, ciKey } from "@/lib/cmdb/ci";
import { CriticalityBadge } from "@/components/cmdb/criticality-badge";
import { LifecycleBadge } from "@/components/cmdb/lifecycle-badge";
import { DeviceInventory } from "@/components/cmdb/device-inventory";
import type { ConfigurationItem, DeviceInventoryRow } from "@/types";

/**
 * The unified CMDB asset surface (#876, epic #873) — ONE table with quick-filter
 * chips that move between the asset-class views, in Mark's order: Devices, Cloud,
 * End-users, Accounts. Replaces the former CI-register / device-inventory TAB
 * switcher (#795) so the whole managed estate lives on one surface.
 *
 * Each view is a table; every row drills down. Three of the views (cloud, end-user,
 * account) project the CI union read-model (drillable to `/cmdb/<type>/<id>`, with
 * criticality + lifecycle). The Devices view is the populated device inventory
 * (silver `device` + IT Glue configurations, ADR-0047) — richer per-device columns
 * (policy compliance, source); silver-merged rows drill to the device CI detail.
 *
 * Client-side: the full set is projected server-side (staff already excluded); the
 * view switch + account filter are purely presentational, so they run in the browser
 * for instant response.
 */
type ViewKey = "device" | "cloud" | "user" | "account";

const VIEWS: { key: ViewKey; label: string; icon: string }[] = [
  { key: "device", label: "Devices", icon: CI_TYPE_ICON.device },
  { key: "cloud", label: "Cloud", icon: CI_TYPE_ICON.cloud },
  { key: "user", label: "End-users", icon: CI_TYPE_ICON.user },
  { key: "account", label: "Accounts", icon: CI_TYPE_ICON.account },
];

export function CmdbAssets({
  cis,
  devices,
}: {
  cis: ConfigurationItem[];
  devices: DeviceInventoryRow[];
}) {
  const [view, setView] = useState<ViewKey>("device");
  const [accountId, setAccountId] = useState<string>("");

  // Account filter options — distinct owning accounts across the CI set.
  const accounts = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of cis) {
      if (!seen.has(c.accountId)) seen.set(c.accountId, c.accountName ?? "—");
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cis]);
  const selectedAccountName = accounts.find((a) => a.id === accountId)?.name ?? null;

  // The device inventory keys account by NAME (it spans rows with no account id),
  // so the shared account filter matches devices by the selected account's name.
  const filteredDevices = useMemo(
    () => (selectedAccountName ? devices.filter((d) => d.account === selectedAccountName) : devices),
    [devices, selectedAccountName],
  );

  const cisOfType = useMemo(
    () =>
      cis.filter(
        (c) => c.ciType === view && (!accountId || c.accountId === accountId),
      ),
    [cis, view, accountId],
  );

  // Per-chip counts reflect the active account filter.
  const counts = useMemo<Record<ViewKey, number>>(() => {
    const base = { device: filteredDevices.length, cloud: 0, user: 0, account: 0 };
    for (const c of cis) {
      if ((c.ciType === "cloud" || c.ciType === "user" || c.ciType === "account") &&
          (!accountId || c.accountId === accountId)) {
        base[c.ciType] += 1;
      }
    }
    return base;
  }, [cis, filteredDevices.length, accountId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 self-start rounded-md border border-border bg-panel p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                view === v.key ? "bg-panel-2 text-text" : "text-dim hover:text-text"
              }`}
            >
              <Icon name={v.icon} size={12} />
              {v.label}
              <span className="rounded bg-border px-1 text-[10px] text-dim">{counts[v.key]}</span>
            </button>
          ))}
        </div>

        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {view === "device" ? (
        <DeviceInventory devices={filteredDevices} />
      ) : (
        <CiTable items={cisOfType} />
      )}
    </div>
  );
}

/**
 * The CI table for the cloud / end-user / account views — one drillable row per
 * Configuration Item, with the derived criticality + lifecycle badges. Read-only.
 */
function CiTable({ items }: { items: ConfigurationItem[] }) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Asset</th>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Criticality</th>
              <th className="px-4 py-2 font-medium">Lifecycle</th>
              <th className="px-4 py-2 font-medium">Key attributes</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-dim">
                  No assets in this view yet.
                </td>
              </tr>
            ) : (
              items.map((ci) => (
                <tr key={ciKey(ci)} className="border-t border-border/60 hover:bg-panel-2">
                  <td className="px-4 py-2">
                    <Link
                      href={`/cmdb/${ci.ciType}/${ci.ciId}`}
                      className="flex items-center gap-2 font-medium text-text hover:text-accent"
                    >
                      <Icon name={CI_TYPE_ICON[ci.ciType]} size={14} className="text-dim" />
                      {ci.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-dim">{ci.accountName ?? "—"}</td>
                  <td className="px-4 py-2">
                    <CriticalityBadge
                      derivedDefault={ci.derivedDefault}
                      override={ci.override}
                      size="xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    {ci.lifecycle === "unknown" ? (
                      <span className="text-xs text-dim">—</span>
                    ) : (
                      <LifecycleBadge lifecycle={ci.lifecycle} size="xs" />
                    )}
                  </td>
                  <td className="px-4 py-2 text-dim">
                    <span className="line-clamp-1">
                      {ci.attributes.map((a) => `${a.label}: ${a.value}`).join(" · ")}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/cmdb/${ci.ciType}/${ci.ciId}`}
                      className="text-xs text-dim hover:text-accent"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
