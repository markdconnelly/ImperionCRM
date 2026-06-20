import { Icon } from "@/components/ui/icon";
import {
  appField,
  classifyInstallState,
  installStateLabel,
  sortManagedApps,
  type AppInstallTone,
} from "@/lib/cmdb/managed-apps";
import type { DeviceManagedApp } from "@/types";

/**
 * Device-CI detail "Managed apps" drill section (#261, epic #873, ADR-0039/0047/0051).
 *
 * Reads the Intune per-device managed/detected app inventory (bronze `intune_managed_apps`,
 * migration 0148) for ONE device and renders it as a read-only table, matching the device
 * detail's card aesthetic. Rendered only for `device` CIs. Following the inventory's cardinal
 * rule (ADR-0051 §6: absent beats a wrong value), an empty list degrades to an honest
 * "no managed apps reported" state — never an error — because the bronze is empty until the
 * on-prem collector runs against an applied table.
 */
const TONE_CLASS: Record<AppInstallTone, string> = {
  ok: "bg-green/10 text-green",
  bad: "bg-red/10 text-red",
  muted: "bg-panel-2 text-dim",
};

export function ManagedApps({ apps }: { apps: DeviceManagedApp[] }) {
  const sorted = sortManagedApps(apps);

  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon name="Package" size={16} className="text-dim" />
        <h2 className="text-sm font-medium text-text">Managed apps</h2>
        {sorted.length > 0 && (
          <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] text-dim">
            {sorted.length}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-dim">
          No managed apps reported for this device. Intune app inventory
          (DeviceManagementApps.Read.All) populates here once the collector has run.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-xs text-dim">
                <th className="pb-2 pr-3 font-normal">App</th>
                <th className="pb-2 pr-3 font-normal">Publisher</th>
                <th className="pb-2 pr-3 font-normal">Version</th>
                <th className="pb-2 pr-3 font-normal">Platform</th>
                <th className="pb-2 font-normal">State</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((app, i) => {
                const tone = classifyInstallState(app.installState);
                return (
                  <tr
                    key={`${app.appId ?? "app"}:${app.displayName ?? "?"}:${i}`}
                    className="border-b border-border/30 last:border-0"
                  >
                    <td className="py-2 pr-3 text-text">{appField(app.displayName)}</td>
                    <td className="py-2 pr-3 text-dim">{appField(app.publisher)}</td>
                    <td className="py-2 pr-3 text-dim">{appField(app.version)}</td>
                    <td className="py-2 pr-3 text-dim">{appField(app.platform)}</td>
                    <td className="py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${TONE_CLASS[tone]}`}
                        title={app.installStateDetail ?? undefined}
                      >
                        {installStateLabel(app.installState)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[11px] text-dim">
        Read-only Intune app inventory (bronze, ADR-0039). Manage app assignments in Intune —
        the CMDB never writes.
      </p>
    </div>
  );
}
