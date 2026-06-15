/**
 * DNS posture presentation logic (ADR-0063, account-keyed amendment — #309).
 *
 * Pure mapping helpers shared by the Company-360 DNS posture card and the
 * `/accounts/[id]/posture` per-domain rows. They turn the `DnsDomainRollup`
 * rows (the account-keyed read shipped by #334) into:
 *   - a governance-verdict badge class + label (managed/in-azure-readonly/
 *     not-in-azure/tracked), mirroring the policy-family classification badges;
 *   - an account-level rollup (worst verdict wins + summed record-drift counts +
 *     last-captured) for the at-a-glance card.
 *
 * PURE / edge-safe: no pg, no node:*, no env — unit-tested directly. Renders
 * EXISTING columns only; no record-level DNS read exists yet (that is a
 * follow-up — see the card's note), so drift surfaces as per-domain counts.
 */
import type { DnsDomainRollup, DnsRecordStatus } from "@/types";

/**
 * Per-record classification badge color (ADR-0063 §3) — same severity read as the policy
 * classification badges: drift/ungoverned are amber (governable, needs attention), missing is
 * red (golden record no longer resolves), compliant is green (shown only if ever surfaced).
 */
export function recordStatusBadgeClass(status: DnsRecordStatus): string {
  switch (status) {
    case "missing":
      return "bg-red/10 text-red";
    case "drift":
    case "ungoverned":
      return "bg-amber/10 text-amber";
    default:
      return "bg-green/10 text-green";
  }
}

export type DnsVerdict = NonNullable<DnsDomainRollup["verdict"]>;

/** Severity order, worst → best. `null` (tracked, not captured) is weakest. */
const VERDICT_ORDER: DnsVerdict[] = ["not-in-azure", "in-azure-readonly", "managed"];

export const DNS_VERDICT_LABEL: Record<DnsVerdict, string> = {
  managed: "Managed",
  "in-azure-readonly": "In Azure (read-only)",
  "not-in-azure": "Not in Azure",
};

/**
 * Badge color carries the governance read (ADR-0063): managed = green (hosted
 * in Azure AND write-proven AND NS-delegated), in-azure-readonly = amber
 * (present but not write-proven), not-in-azure = red (ungoverned), and a
 * tracked-but-uncaptured domain (null) is neutral grey — pending, not a failure.
 */
export function verdictBadgeClass(verdict: DnsDomainRollup["verdict"]): string {
  switch (verdict) {
    case "managed":
      return "bg-green/10 text-green";
    case "in-azure-readonly":
      return "bg-amber/10 text-amber";
    case "not-in-azure":
      return "bg-red/10 text-red";
    default:
      return "bg-panel-2 text-dim";
  }
}

export function verdictLabel(verdict: DnsDomainRollup["verdict"]): string {
  return verdict ? DNS_VERDICT_LABEL[verdict] : "Tracked";
}

export interface DnsPostureSummary {
  /** Worst verdict across captured domains; null when nothing is captured yet. */
  verdict: DnsDomainRollup["verdict"];
  /** Domains in the account's tracked list (account_domain), captured or not. */
  domainCount: number;
  /** Domains with a posture capture (verdict non-null). */
  capturedCount: number;
  recordsDrift: number;
  recordsMissing: number;
  /** Most recent capture across the domains (ISO date), or null. */
  lastCapturedAt: string | null;
}

/**
 * Account-level rollup for the at-a-glance card: the worst (lowest) verdict
 * across captured domains drives the badge, drift/missing counts sum, and the
 * newest capture date wins. Uncaptured domains never improve the verdict.
 */
export function summarizeDnsPosture(domains: DnsDomainRollup[]): DnsPostureSummary {
  let worstRank = Infinity;
  let verdict: DnsDomainRollup["verdict"] = null;
  let capturedCount = 0;
  let recordsDrift = 0;
  let recordsMissing = 0;
  let lastCapturedAt: string | null = null;

  for (const d of domains) {
    recordsDrift += d.recordsDrift;
    recordsMissing += d.recordsMissing;
    if (d.lastCapturedAt && (lastCapturedAt === null || d.lastCapturedAt > lastCapturedAt)) {
      lastCapturedAt = d.lastCapturedAt;
    }
    if (d.verdict !== null) {
      capturedCount += 1;
      const rank = VERDICT_ORDER.indexOf(d.verdict);
      if (rank < worstRank) {
        worstRank = rank;
        verdict = d.verdict;
      }
    }
  }

  return {
    verdict,
    domainCount: domains.length,
    capturedCount,
    recordsDrift,
    recordsMissing,
    lastCapturedAt,
  };
}
