/**
 * Per-device policy-applied classification (#162, ADR-0051 §6).
 *
 * Device-level posture comes ONLY from Intune Device Compliance (the
 * `intune_managed_devices` bronze, migration 0069) — tenant-level posture is
 * never proxied down to a device. The cardinal rule: a green dot on a
 * non-reporting laptop is worse than no dot, so anything we cannot currently
 * vouch for degrades to ABSENT (null), never to green.
 */

export type DevicePolicyCompliance = "compliant" | "drift" | "ungoverned";

/**
 * A device that has not synced with Intune in this many days is treated as
 * not reporting: its last known compliance state is stale and the indicator
 * is withheld entirely.
 */
export const STALE_SYNC_DAYS = 30;

/** Graph `complianceState` values that mean a policy verdict exists and it is bad. */
const DRIFT_STATES = new Set(["noncompliant", "conflict", "error", "ingraceperiod"]);

/**
 * Map a bronze Intune row to the indicator, or null (= show nothing).
 *
 * - No bronze row → caller passes nothing → no indicator (device unmanaged or
 *   feed not yet run — indistinguishable, so stay silent).
 * - Stale or missing `lastSyncDateTime` → null. The device is not reporting;
 *   even a "compliant" last word is not current truth (ADR-0051 §6).
 * - `compliant` → compliant (green).
 * - `noncompliant` / `conflict` / `error` / `inGracePeriod` → drift (amber):
 *   Intune governs the device and the verdict is not clean.
 * - `unknown` / `configManager` / anything else → ungoverned (amber): the
 *   device reports to Intune but no compliance policy verdict applies.
 *
 * Bronze flat columns are stringified text (0038/0065 envelope contract), so
 * both inputs are raw strings; parsing is defensive.
 */
export function classifyDevicePolicy(
  complianceState: string | null,
  lastSyncDateTime: string | null,
  now: Date = new Date(),
): DevicePolicyCompliance | null {
  if (!lastSyncDateTime) return null;
  const lastSync = Date.parse(lastSyncDateTime);
  if (Number.isNaN(lastSync)) return null;
  const ageDays = (now.getTime() - lastSync) / 86_400_000;
  if (ageDays > STALE_SYNC_DAYS) return null;

  const state = (complianceState ?? "").trim().toLowerCase();
  if (state === "compliant") return "compliant";
  if (DRIFT_STATES.has(state)) return "drift";
  return "ungoverned";
}
