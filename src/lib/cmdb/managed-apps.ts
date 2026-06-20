/**
 * Intune managed-apps display helpers (#261, epic #873, ADR-0039/0047/0051).
 *
 * The device-CI detail page drills into the per-device managed/detected app inventory
 * (bronze `intune_managed_apps`, migration 0148). This module is PURE — no `pg`, no env,
 * no `node:*` — so the display shaping + install-state classification are unit-testable
 * without a database. The SQL read lives in the postgres repository
 * (`listDeviceManagedApps`); the mock returns [].
 *
 * Bronze flat columns are stringified text (0038/0069 envelope), so every field arrives
 * as a raw string | null. The cardinal inventory rule (ADR-0051 §6): absent beats a wrong
 * value — a missing field renders as the dash, never an invented one.
 */

import type { DeviceManagedApp } from "@/types";

/** Install-state tone for the per-app badge — green = installed, red = failed, dim = other/unknown. */
export type AppInstallTone = "ok" | "bad" | "muted";

/**
 * Classify a bronze `install_state` string into a display tone. Defensive + case-insensitive
 * (bronze is stringified text). `installed` → ok; `failed` / `error` → bad; everything else
 * (pending, not-installed, unknown, absent) → muted. PURE + unit-tested.
 */
export function classifyInstallState(installState: string | null | undefined): AppInstallTone {
  const s = (installState ?? "").trim().toLowerCase();
  if (s === "installed") return "ok";
  if (s === "failed" || s === "error") return "bad";
  return "muted";
}

/** Human label for a bronze `install_state` — the raw value title-cased, or "Unknown" when absent. */
export function installStateLabel(installState: string | null | undefined): string {
  const s = (installState ?? "").trim();
  if (s.length === 0) return "Unknown";
  // camelCase Graph values ("pendingInstall") → spaced + capitalised ("Pending install").
  const spaced = s.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Normalise an absent/empty bronze field to the inventory dash (never an invented value). */
export function appField(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value.trim() : "—";
}

/**
 * Sort managed apps for stable display: by name (case-insensitive), with un-named apps last.
 * PURE — does not mutate the input. Used by the detail section so the list order is
 * deterministic regardless of collected_at / row order.
 */
export function sortManagedApps(apps: DeviceManagedApp[]): DeviceManagedApp[] {
  return [...apps].sort((a, b) => {
    const an = (a.displayName ?? "").toLowerCase();
    const bn = (b.displayName ?? "").toLowerCase();
    if (!an && !bn) return 0;
    if (!an) return 1;
    if (!bn) return -1;
    return an.localeCompare(bn);
  });
}
