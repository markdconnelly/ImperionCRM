import Link from "next/link";
import type { DnsDomainRollup } from "@/types";
import {
  summarizeDnsPosture,
  verdictBadgeClass,
  verdictLabel,
} from "@/lib/security/dns-posture";

// DNS posture surfaces for the Company 360 (#309, epic #306, ADR-0063 account
// amendment). Both read the account-keyed `listDnsDomainsForAccount` rollup
// (#334) — which degrades to an empty list on schema lag — so neither ever
// fails the page; an account with no tracked domains renders nothing.
//
// Record-level drift: the shipped rollup carries per-domain drift/missing
// COUNTS only (no dns_record read exists yet), so the per-domain rows mirror
// the policy-family classification badges as counts. A true record-level drift
// list is a follow-up (#576) once a record-level read lands.

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
