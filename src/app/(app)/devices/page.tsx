import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getRepositories } from "@/lib/data";

/** Source-of-truth badge per inventory origin (ADR-0047). */
const ORIGIN_BADGE: Record<string, { label: string; icon: string }> = {
  silver: { label: "Merged", icon: "Layers" },
  itglue: { label: "IT Glue", icon: "BookOpen" },
};

/**
 * Devices & cloud assets — a READ-ONLY inventory (ADR-0047). One row per asset,
 * merged from silver `device` and the IT Glue configurations bronze. Devices are
 * managed in their source systems (IT Glue, Intune, UniFi); this page only
 * reports. Editing happens at the source, never here.
 */
export default async function DevicesPage() {
  const { crm } = getRepositories();
  const devices = await crm.listDeviceInventory();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Devices & Assets"
        description="Read-only inventory merged from IT Glue, Microsoft 365, and (soon) UniFi. Manage devices in their source systems."
      />

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
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => {
                const badge = ORIGIN_BADGE[d.origin] ?? { label: d.origin, icon: "Circle" };
                const make = [d.manufacturer, d.model].filter(Boolean).join(" ");
                return (
                  <tr key={`${d.origin}-${d.id}`} className="border-t border-border hover:bg-panel-2">
                    <td className="px-4 py-3 font-medium">{d.name ?? "—"}</td>
                    <td className="px-4 py-3 text-dim">{d.deviceType ?? "—"}</td>
                    <td className="px-4 py-3 text-dim">{d.account ?? "Unlinked"}</td>
                    <td className="px-4 py-3 text-dim">{make || "—"}</td>
                    <td className="px-4 py-3 text-dim">{d.serialNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-dim">{d.os ?? "—"}</td>
                    <td className="px-4 py-3 text-dim">{d.status ?? "—"}</td>
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
                  <td colSpan={9} className="px-4 py-8 text-center text-dim">
                    No assets in the inventory yet. They appear once the IT Glue export or a
                    device sync runs (and view migration 0053 is applied).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
