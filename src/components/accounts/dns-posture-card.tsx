import Link from "next/link";
import type { DnsDomainRollup, DnsRecordDrift } from "@/types";
import {
  recordStatusBadgeClass,
  summarizeDnsPosture,
  verdictBadgeClass,
  verdictLabel,
} from "@/lib/security/dns-posture";

// DNS posture surfaces for the Company 360 (#309, epic #306, ADR-0063 account
// amendment). All are account-keyed reads that degrade to an empty list on
// schema lag — so none ever fails the page; an account with no tracked domains
// (or no captures) renders nothing.
//
// Two grains: the per-domain rows (`DnsDomainRows`) show drift as classification
// COUNTS from the `dns_domain` rollup, and the record-level drift list
// (`DnsRecordDriftList`, #576) shows the INDIVIDUAL records that differ vs the
// approved golden baseline — observed vs golden per record, classified with the
// same four-state semantics as the on-prem Get-ImperionDnsDrift merge.

/** Posture timestamps render as dates — time of day adds nothing at-a-glance. */
function fmtDate(value: string | null): string {
  return value ? value.slice(0, 10) : "—";
}

function VerdictBadge({ verdict }: { verdict: DnsDomainRollup["verdict"] }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${verdictBadgeClass(
        verdict,
      )}`}
    >
      {verdictLabel(verdict)}
    </span>
  );
}

/**
 * At-a-glance DNS posture card for the account detail page: worst-verdict badge,
 * tracked-domain count, and last-captured date, linking into the posture view.
 */
export function DnsPostureCard({
  accountId,
  domains,
}: {
  accountId: string;
  domains: DnsDomainRollup[];
}) {
  const s = summarizeDnsPosture(domains);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-center gap-2">
        <VerdictBadge verdict={s.verdict} />
        <span className="text-sm text-text">
          {s.domainCount} domain{s.domainCount === 1 ? "" : "s"} tracked
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded bg-panel-2 px-1.5 py-0.5 text-dim">
          {s.capturedCount} captured
        </span>
        {s.recordsDrift > 0 && (
          <span className="rounded bg-amber/10 px-1.5 py-0.5 text-amber">
            {s.recordsDrift} record drift
          </span>
        )}
        {s.recordsMissing > 0 && (
          <span className="rounded bg-red/10 px-1.5 py-0.5 text-red">
            {s.recordsMissing} record missing
          </span>
        )}
      </div>
      <span className="text-[11px] text-dim">last captured {fmtDate(s.lastCapturedAt)}</span>
      <Link
        href={`/accounts/${accountId}/posture`}
        className="ml-auto text-sm text-dim underline-offset-2 hover:text-text hover:underline"
      >
        DNS detail →
      </Link>
    </div>
  );
}

/**
 * Per-domain DNS posture rows for `/accounts/[id]/posture` — verdict badge plus
 * the record-level classification counts (compliant/drift/ungoverned/missing)
 * mirroring the policy-family badges. Uncaptured domains keep a grey "Tracked"
 * badge and dashes; the read already sorts worst-verdict-then-drift first.
 */
export function DnsDomainRows({ domains }: { domains: DnsDomainRollup[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {domains.map((d) => {
          const captured = d.verdict !== null;
          return (
            <tr key={d.domain} className="border-t border-border/60 align-top">
              <td className="py-1.5 pr-3">
                <div className="text-text">{d.domain}</div>
                {d.note && <div className="text-[11px] text-dim">{d.note}</div>}
              </td>
              <td className="py-1.5 pr-3">
                <VerdictBadge verdict={d.verdict} />
              </td>
              <td className="py-1.5 pr-3">
                {captured ? (
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded bg-green/10 px-1.5 py-0.5 text-green">
                      {d.recordsCompliant} compliant
                    </span>
                    <span className="rounded bg-amber/10 px-1.5 py-0.5 text-amber">
                      {d.recordsDrift} drift
                    </span>
                    <span className="rounded bg-amber/10 px-1.5 py-0.5 text-amber">
                      {d.recordsUngoverned} ungoverned
                    </span>
                    <span className="rounded bg-red/10 px-1.5 py-0.5 text-red">
                      {d.recordsMissing} missing
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-dim">awaiting first capture</span>
                )}
              </td>
              <td className="py-1.5 text-right text-xs text-dim">
                {d.score !== null && <>score {Math.round(d.score)} · </>}
                captured {fmtDate(d.lastCapturedAt)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function RecordStatusBadge({ status }: { status: DnsRecordDrift["status"] }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${recordStatusBadgeClass(
        status,
      )}`}
    >
      {status}
    </span>
  );
}

/**
 * Record-level DNS drift list for `/accounts/[id]/posture` (#576, ADR-0063 §3) — the
 * individual records that differ from the approved golden baseline, grouped by domain.
 * Each row shows record type · name · classification, plus observed vs golden value:
 * `drift` shows both, `missing` shows golden only (no longer resolves), `ungoverned`
 * shows observed only (no baseline approved). Compliant records are omitted — this is
 * the remediation worklist. The read already sorts missing → drift → ungoverned.
 */
export function DnsRecordDriftList({ records }: { records: DnsRecordDrift[] }) {
  const byDomain = new Map<string, DnsRecordDrift[]>();
  for (const r of records) {
    const list = byDomain.get(r.domain) ?? [];
    list.push(r);
    byDomain.set(r.domain, list);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...byDomain.entries()].map(([domain, rows]) => (
        <div key={domain}>
          <h4 className="mb-1.5 text-xs font-semibold text-dim">
            {domain} · {rows.length} record{rows.length === 1 ? "" : "s"}
          </h4>
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.recordType}:${r.name}:${r.status}`}
                  className="border-t border-border/60 align-top"
                >
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    <span className="text-text">{r.recordType}</span>
                  </td>
                  <td className="py-1.5 pr-3 break-all text-dim">{r.name}</td>
                  <td className="py-1.5 pr-3">
                    <RecordStatusBadge status={r.status} />
                  </td>
                  <td className="py-1.5 pr-3">
                    <div className="flex flex-col gap-0.5 text-[11px]">
                      {r.observedValue !== null && (
                        <span className="break-all text-dim">
                          <span className="text-text">observed</span> {r.observedValue}
                        </span>
                      )}
                      {r.goldenValue !== null && (
                        <span className="break-all text-dim">
                          <span className="text-text">golden</span> {r.goldenValue}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
