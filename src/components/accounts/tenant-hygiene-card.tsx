import { Icon } from "@/components/ui/icon";
import {
  benchmarkAppCredentials,
  benchmarkRoleAssignments,
  TENANT_HYGIENE_STANDARD,
  type HygieneStatus,
  type TenantHygieneForAccount,
} from "@/lib/security/tenant-hygiene";

// Concise tenant-hygiene posture badges for the account posture page (#260,
// ADR-0051 §3 golden-baseline). Mark's per-source review asked for tenant hygiene
// surfaced CONCISELY — three at-a-glance verdicts (domains, privileged-role
// sprawl, app-credential expiry) with present/missing-style chips, NOT exhaustive
// tables. Data is account-scoped READ-only and degrades to an honest "absent"
// line when the collector lane hasn't populated bronze yet (prod is empty today).

const STATUS_TONE: Record<HygieneStatus, "green" | "amber" | "red"> = {
  ok: "green",
  warn: "amber",
  fail: "red",
};

const TONE_CLASS: Record<"green" | "amber" | "red" | "dim", string> = {
  green: "bg-green/10 text-green",
  amber: "bg-amber/10 text-amber",
  red: "bg-red/10 text-red",
  dim: "bg-panel-2 text-dim",
};

function Chip({
  children,
  tone = "dim",
}: {
  children: React.ReactNode;
  tone?: "green" | "amber" | "red" | "dim";
}) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

function Row({
  label,
  tone,
  verdict,
  detail,
}: {
  label: string;
  tone: "green" | "amber" | "red";
  verdict: string;
  detail: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div className="flex items-baseline gap-2">
        <Chip tone={tone}>{verdict}</Chip>
        <span className="text-sm text-text">{label}</span>
      </div>
      <span className="text-[11px] text-dim">{detail}</span>
    </div>
  );
}

export function TenantHygieneCard({ data }: { data: TenantHygieneForAccount }) {
  const { domains, appRegistrations, roleAssignments } = data;

  const nothing =
    domains.length === 0 &&
    appRegistrations.length === 0 &&
    roleAssignments.length === 0;

  const roleBench = benchmarkRoleAssignments(roleAssignments);
  const credBench = benchmarkAppCredentials(appRegistrations);

  // Domain hygiene: any verified domain present = ok; tracked but none verified = warn.
  const verifiedDomains = domains.filter((d) => d.isVerified).length;
  const domainTone: "green" | "amber" | "red" =
    verifiedDomains > 0 ? "green" : "amber";

  return (
    <section className="rounded-xl border border-border bg-panel p-4">
      <h3 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
        <Icon name="ShieldUser" size={15} />
        Tenant hygiene
      </h3>
      <p className="mb-3 text-xs text-dim">
        Entra verified domains, privileged role-assignment sprawl, and app-registration
        credential expiry for this company&apos;s mapped tenants, benchmarked against the MSP
        standard (ADR-0051).
      </p>

      {nothing ? (
        <p className="text-sm text-dim">
          No tenant-hygiene data collected yet — the on-prem collector populates Entra domains,
          app registrations, and role assignments from the next bulk ingest.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          <Row
            label="Verified domains"
            tone={domainTone}
            verdict={verifiedDomains > 0 ? "ok" : "review"}
            detail={`${verifiedDomains} verified / ${domains.length} tracked`}
          />
          <Row
            label="Privileged role assignments"
            tone={STATUS_TONE[roleBench.status]}
            verdict={roleBench.status}
            detail={`${roleBench.privilegedPrincipals} privileged principal${
              roleBench.privilegedPrincipals === 1 ? "" : "s"
            } (cap ${roleBench.cap})`}
          />
          <Row
            label="App-registration credentials"
            tone={STATUS_TONE[credBench.status]}
            verdict={credBench.status}
            detail={
              credBench.expired > 0
                ? `${credBench.expired} expired`
                : credBench.expiringSoon > 0
                  ? `${credBench.expiringSoon} expiring ≤${TENANT_HYGIENE_STANDARD.credentialExpiryWarningDays}d`
                  : `${credBench.total} app${credBench.total === 1 ? "" : "s"}, none expiring`
            }
          />
        </div>
      )}
    </section>
  );
}
