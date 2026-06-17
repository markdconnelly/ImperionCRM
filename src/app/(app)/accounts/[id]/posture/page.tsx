import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getRepositories } from "@/lib/data";
import { listSensitivityCsaForAccount } from "@/lib/security/sensitivity-csa";
import { listTenantHygieneForAccount } from "@/lib/security/tenant-hygiene";
import { SensitivityCsaCard } from "@/components/accounts/sensitivity-csa-card";
import { TenantHygieneCard } from "@/components/accounts/tenant-hygiene-card";
import { DnsDomainRows, DnsRecordDriftList } from "@/components/accounts/dns-posture-card";
import { refreshPostureAction, snapshotPostureAction } from "../../actions";

// Per-customer security posture overview (#93, ADR-0051). Everything here is a
// READ of posture silver/bronze keyed through the account's Tenant Mappings;
// the only mutation is the reused account-scoped Refresh posture action (#155).

const FAMILY_LABEL: Record<string, string> = {
  conditional_access: "Conditional Access",
  intune_security: "Intune security",
  device_configuration: "Device configuration",
  autopilot: "Autopilot",
  defender_xdr: "Defender XDR",
};

// ADR-0051 §3 classification — color carries the severity read: drift/ungoverned
// are amber (governable, needs attention), missing is red (golden baseline absent
// from the tenant), compliant is green.
const CLASSIFICATION_BADGE: Record<string, string> = {
  compliant: "bg-green/10 text-green",
  drift: "bg-amber/10 text-amber",
  ungoverned: "bg-amber/10 text-amber",
  missing: "bg-red/10 text-red",
};

function Badge({ kind }: { kind: string }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
        CLASSIFICATION_BADGE[kind] ?? "bg-panel-2 text-dim"
      }`}
    >
      {kind}
    </span>
  );
}

/** Posture timestamps render as dates — the time of day adds nothing at-a-glance. */
function fmtDate(value: string | null): string {
  return value ? value.slice(0, 10) : "—";
}

function Section({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-panel p-4">
      <h3 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
        <Icon name={icon} size={15} />
        {title}
      </h3>
      {hint ? <p className="mb-3 text-xs text-dim">{hint}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

export default async function AccountPosturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm, security } = getRepositories();
  const [
    account,
    tenants,
    policies,
    controls,
    exposures,
    sensitivityCsa,
    tenantHygiene,
    dnsDomains,
    dnsRecordDrift,
  ] = await Promise.all([
    crm.getAccount(id),
    security.listTenantPostureForAccount(id),
    security.listPosturePoliciesForAccount(id),
    security.listSecureScoreControlsForAccount(id),
    security.listCredentialExposuresForAccount(id),
    listSensitivityCsaForAccount(id),
    listTenantHygieneForAccount(id),
    security.listDnsDomainsForAccount(id),
    security.listDnsRecordDriftForAccount(id),
  ]);
  if (!account) notFound();

  const tenantLabel = new Map(
    tenants.map((t) => [t.tenantId, t.displayName ?? t.tenantId]),
  );
  const multiTenant = tenants.length > 1;
  const refreshed = tenants.some((t) => t.refreshedAt !== null);

  const policiesByFamily = new Map<string, typeof policies>();
  for (const p of policies) {
    const list = policiesByFamily.get(p.policyFamily) ?? [];
    list.push(p);
    policiesByFamily.set(p.policyFamily, list);
  }

  const controlsByCategory = new Map<string, typeof controls>();
  for (const c of controls) {
    const key = c.controlCategory ?? "Uncategorized";
    const list = controlsByCategory.get(key) ?? [];
    list.push(c);
    controlsByCategory.set(key, list);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={`${account.name} — Security posture`}
          description="Microsoft secure score, policy classification vs Golden State, and credential exposures across this account's mapped Customer Tenants."
        />
        <div className="flex shrink-0 items-center gap-2">
          {tenants.length > 0 && (
            <form action={refreshPostureAction}>
              <input type="hidden" name="accountId" value={id} />
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
              >
                <Icon name="ShieldCheck" size={14} />
                Refresh posture
              </button>
            </form>
          )}
          {tenants.length > 0 && (
            // Store an immutable Imperion Secure Score snapshot now (ADR-0051 §5, #168).
            <form action={snapshotPostureAction}>
              <input type="hidden" name="accountId" value={id} />
              <button
                type="submit"
                title="Store an immutable Imperion Secure Score snapshot for this account now"
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
              >
                <Icon name="Camera" size={14} />
                Snapshot now
              </button>
            </form>
          )}
          <Link
            href={`/accounts/${id}`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
          >
            Back to company
          </Link>
        </div>
      </div>

      {tenants.length === 0 ? (
        <section className="rounded-xl border border-border bg-panel p-5 text-sm text-dim">
          <p className="mb-1 font-medium text-text">No Customer Tenants mapped</p>
          <p>
            Posture data is keyed by Microsoft tenant GUID, and this company has no Tenant
            Mapping yet. An admin can map its tenants under Settings → Tenant mapping; the
            posture view lights up from the next refresh.
          </p>
        </section>
      ) : (
        <>
          {!refreshed && (
            <section className="rounded-xl border border-border bg-panel p-5 text-sm text-dim">
              <p className="mb-1 font-medium text-text">Not classified yet</p>
              <p>
                {tenants.length} mapped tenant{tenants.length === 1 ? " has" : "s have"} no
                posture rollup yet — use Refresh posture above (or wait for the scheduled
                on-prem merge) to classify policies and compute the rollup.
              </p>
            </section>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {tenants.map((t) => {
              const scorePct =
                t.secureScoreCurrent !== null && t.secureScoreMax
                  ? Math.round((t.secureScoreCurrent / t.secureScoreMax) * 100)
                  : null;
              return (
                <section
                  key={t.tenantId}
                  className="rounded-xl border border-border bg-panel p-4"
                >
                  <h3 className="mb-0.5 font-display text-sm font-semibold tracking-tight">
                    {t.displayName ?? t.tenantId}
                  </h3>
                  <p className="mb-3 text-[11px] text-dim">
                    {t.tenantId} · refreshed {fmtDate(t.refreshedAt)}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-dim">Secure score</div>
                      <div className="mt-0.5 font-display text-2xl">
                        {scorePct !== null ? `${scorePct}%` : "—"}
                      </div>
                      <div className="text-[11px] text-dim">
                        {t.secureScoreCurrent !== null
                          ? `${t.secureScoreCurrent} of ${t.secureScoreMax}`
                          : "no data"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-dim">Users</div>
                      <div className="mt-0.5 font-display text-2xl">
                        {t.licensedUserCount ?? "—"}
                      </div>
                      <div className="text-[11px] text-dim">
                        {t.activeUserCount !== null ? `${t.activeUserCount} active` : "licensed"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-dim">Open exposures</div>
                      <div
                        className={`mt-0.5 font-display text-2xl ${t.exposuresOpen > 0 ? "text-red" : "text-green"}`}
                      >
                        {t.exposuresOpen}
                      </div>
                      <div className="text-[11px] text-dim">dark web</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded bg-green/10 px-1.5 py-0.5 text-green">
                      {t.policiesCompliant} compliant
                    </span>
                    <span className="rounded bg-amber/10 px-1.5 py-0.5 text-amber">
                      {t.policiesDrift} drift
                    </span>
                    <span className="rounded bg-amber/10 px-1.5 py-0.5 text-amber">
                      {t.policiesUngoverned} ungoverned
                    </span>
                    <span className="rounded bg-red/10 px-1.5 py-0.5 text-red">
                      {t.policiesMissing} missing
                    </span>
                  </div>
                </section>
              );
            })}
          </div>

          <Section
            title="Policy classification"
            icon="ListChecks"
            hint="Observed policies vs the approved Golden State (ADR-0051): drift and missing first."
          >
            {policies.length === 0 ? (
              <p className="text-sm text-dim">
                No classified policies yet — refresh posture to populate.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {[...policiesByFamily.entries()].map(([family, rows]) => (
                  <div key={family}>
                    <h4 className="mb-1.5 text-xs font-semibold text-dim">
                      {FAMILY_LABEL[family] ?? family} · {rows.length}
                    </h4>
                    <table className="w-full text-sm">
                      <tbody>
                        {rows.map((p) => (
                          <tr
                            key={`${p.tenantId}:${p.policyFamily}:${p.policyId}`}
                            className="border-t border-border/60"
                          >
                            <td className="py-1.5 pr-3">{p.policyName ?? p.policyId}</td>
                            {multiTenant && (
                              <td className="py-1.5 pr-3 text-xs text-dim">
                                {tenantLabel.get(p.tenantId) ?? p.tenantId}
                              </td>
                            )}
                            <td className="py-1.5 pr-3">
                              <Badge kind={p.classification} />
                            </td>
                            <td className="py-1.5 text-right text-xs text-dim">
                              observed {fmtDate(p.observedModifiedAt)} · golden{" "}
                              {fmtDate(p.goldenApprovedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Secure score controls"
            icon="Gauge"
            hint="Microsoft's improvement actions for these tenants, grouped by category — the drill-down behind the score."
          >
            {controls.length === 0 ? (
              <p className="text-sm text-dim">No control profiles ingested yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {[...controlsByCategory.entries()].map(([category, rows]) => (
                  <details key={category} className="group rounded-md border border-border/60">
                    <summary className="cursor-pointer list-none px-3 py-2 text-sm text-dim hover:text-text">
                      <span className="font-medium text-text">{category}</span> · {rows.length}{" "}
                      controls
                    </summary>
                    <table className="w-full text-sm">
                      <tbody>
                        {rows.map((c) => (
                          <tr
                            key={`${c.tenantId}:${c.controlName}`}
                            className="border-t border-border/60"
                          >
                            <td className="px-3 py-1.5">{c.title ?? c.controlName}</td>
                            {multiTenant && (
                              <td className="py-1.5 pr-3 text-xs text-dim">
                                {tenantLabel.get(c.tenantId) ?? c.tenantId}
                              </td>
                            )}
                            <td className="py-1.5 pr-3 text-xs text-dim">{c.service ?? "—"}</td>
                            <td className="py-1.5 pr-3 text-xs text-dim">
                              impact {c.userImpact ?? "—"}
                            </td>
                            <td className="py-1.5 pr-3 text-right text-xs text-dim">
                              max {c.maxScore ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                ))}
              </div>
            )}
          </Section>

          <SensitivityCsaCard data={sensitivityCsa} />

          <TenantHygieneCard data={tenantHygiene} />
        </>
      )}

      <Section
        title="DNS posture"
        icon="Globe"
        hint="Per-domain governance verdict and record-level classification vs the approved golden baseline (ADR-0063). Managed = hosted in Azure, write-proven, and NS-delegated; tracked-but-uncaptured domains await the next on-prem merge."
      >
        {dnsDomains.length === 0 ? (
          <p className="text-sm text-dim">
            No domains tracked for this company yet. DNS posture is keyed by the company&apos;s
            tracked domain list; once domains are added (and the on-prem merge captures them),
            per-domain verdicts and drift appear here.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <DnsDomainRows domains={dnsDomains} />
            {dnsRecordDrift.length > 0 && (
              <div className="border-t border-border/60 pt-3">
                <h4 className="mb-0.5 text-xs font-semibold text-text">Record-level drift</h4>
                <p className="mb-3 text-[11px] text-dim">
                  The individual records that differ from the approved golden baseline —
                  missing and drift first. Compliant records are omitted.
                </p>
                <DnsRecordDriftList records={dnsRecordDrift} />
              </div>
            )}
          </div>
        )}
      </Section>

      <Section
        title="Credential exposures"
        icon="KeyRound"
        hint="Dark Web ID compromised credentials matched to this company (ADR-0040) — unresolved first."
      >
        {exposures.length === 0 ? (
          <p className="text-sm text-dim">No exposures recorded for this company.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {exposures.map((e) => (
                <tr key={e.id} className="border-t border-border/60">
                  <td className="py-1.5 pr-3">{e.email ?? "—"}</td>
                  <td className="py-1.5 pr-3 text-xs text-dim">
                    {e.breachSource ?? "unknown breach"} · {fmtDate(e.breachDate)}
                  </td>
                  <td className="py-1.5 pr-3 text-xs text-dim">
                    {e.exposedData.length > 0 ? e.exposedData.join(", ") : "—"}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
                        e.status === "resolved"
                          ? "bg-green/10 text-green"
                          : e.severity === "high"
                            ? "bg-red/10 text-red"
                            : "bg-amber/10 text-amber"
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="py-1.5 text-right text-xs text-dim">
                    seen {fmtDate(e.lastSeenAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
