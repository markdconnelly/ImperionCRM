import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { DeviceInventoryRow } from "@/types";

/** Source-of-truth badge per inventory origin (ADR-0047). */
const ORIGIN_BADGE: Record<string, { label: string; icon: string }> = {
  silver: { label: "Merged", icon: "Layers" },
  itglue: { label: "IT Glue", icon: "BookOpen" },
};

/**
 * Per-device policy-applied indicator (#162, ADR-0051 §6) — Intune Device
 * Compliance only, never a tenant-level proxy. Colors follow the posture page:
 * compliant green; drift/ungoverned amber (governable, needs attention). A
 * device with no current Intune truth renders NOTHING — absent beats a wrong
 * green dot.
 */
const POLICY_BADGE: Record<string, { label: string; className: string }> = {
  compliant: { label: "Compliant", className: "bg-green/10 text-green" },
  drift: { label: "Drift", className: "bg-amber/10 text-amber" },
  ungoverned: { label: "Ungoverned", className: "bg-amber/10 text-amber" },
};

/**
 * Device & cloud-asset inventory — a READ-ONLY table (ADR-0047), one row per
 * asset, merged from silver `device` and the IT Glue configurations bronze.
 * Devices are managed in their source systems (IT Glue, Intune, UniFi); this
 * view only reports. Editing happens at the source, never here.
 *
 * Extracted from the former `/devices` page (#795); it is now the **Devices** view
 * of the unified CMDB asset surface (#876, `CmdbAssets`) — the route `/devices`
 * redirects to CMDB. Silver-merged rows link to their device CI detail.
 */
export function DeviceInventory({ devices }: { devices: DeviceInventoryRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-dim">
        <span>
          {devices.length} asset{devices.length === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1">
          <Icon name="Lock" size={11} /> Inventory is not editable in the app
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Make / model</th>
              <th className="px-4 py-2 font-medium">Serial</th>
              <th className="px-4 py-2 font-medium">OS</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Policy</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => {
              const badge = ORIGIN_BADGE[d.origin] ?? { label: d.origin, icon: "Circle" };
              const policy = d.policyCompliance ? POLICY_BADGE[d.policyCompliance] : null;
              const make = [d.manufacturer, d.model].filter(Boolean).join(" ");
              return (
                <tr key={`${d.origin}-${d.id}`} className="border-t border-border hover:bg-panel-2">
                  <td className="px-4 py-3 font-medium">
                    {d.origin === "silver" ? (
                      // Silver-merged rows are device CIs → drill to the CI detail.
                      <Link href={`/cmdb/device/${d.id}`} className="text-text hover:text-accent">
                        {d.name ?? "—"}
                      </Link>
                    ) : (
                      d.name ?? "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-dim">{d.deviceType ?? "—"}</td>
                  <td className="px-4 py-3 text-dim">{d.account ?? "Unlinked"}</td>
                  <td className="px-4 py-3 text-dim">{make || "—"}</td>
                  <td className="px-4 py-3 text-dim">{d.serialNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-dim">{d.os ?? "—"}</td>
                  <td className="px-4 py-3 text-dim">{d.status ?? "—"}</td>
                  <td className="px-4 py-3">
                    {policy ? (
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${policy.className}`}
                        title="From Intune Device Compliance (ADR-0051 §6) — absent when the device is not reporting"
                      >
                        {policy.label}
                      </span>
                    ) : (
                      // Absent on purpose: no current Intune truth for this device.
                      <span className="text-dim">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-dim">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs">
                      <Icon name={badge.icon} size={11} />
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dim">{d.lastSeen ?? "—"}</td>
                </tr>
              );
            })}
            {devices.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-dim">
                  No assets in the inventory yet. They appear once the IT Glue export or a
                  device sync runs (and view migration 0053 is applied).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
