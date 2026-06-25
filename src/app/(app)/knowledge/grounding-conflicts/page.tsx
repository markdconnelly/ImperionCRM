import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { requestIdentity } from "@/lib/auth/request-identity";
import {
  listConflicts,
  listConflictEvents,
  type GroundingConflict,
  type GroundingConflictEvent,
} from "@/lib/data/grounding-conflict";
import { TIER_LABEL, TIER_ORDER, type GroundingTier } from "@/lib/grounding/authority";
import { resolveConflictAction } from "./actions";
import { ConflictResolveForm } from "./conflict-resolve-form";

export const dynamic = "force-dynamic";

/** The per-tier claim cells for one conflict (only tiers that made a claim render). */
function tierClaims(c: GroundingConflict): { tier: GroundingTier; claim: string }[] {
  const byTier: Record<GroundingTier, string | null> = {
    canon: c.canonClaim,
    company_silver: c.companyClaim,
    personal: c.personalClaim,
  };
  return TIER_ORDER.filter((t) => byTier[t] != null).map((t) => ({ tier: t, claim: byTier[t]! }));
}

/** Render the write-back outcome carried on a `writeback` ledger event's PII-free detail jsonb. */
function writebackSummary(events: GroundingConflictEvent[]): string | null {
  const wb = events.find((e) => e.action === "writeback");
  if (!wb) return null;
  const target = typeof wb.detail.target === "string" ? wb.detail.target : "?";
  const ref = typeof wb.detail.externalRef === "string" ? wb.detail.externalRef : null;
  const where = target === "canon" ? "canon (okf-sync issue)" : target === "silver" ? "company silver" : target;
  return ref ? `${where} — ${ref}` : `${where} (logged; dispatch pending)`;
}

/**
 * Grounding-conflict cockpit (#1217, ADR-0119) — the domain owner's worklist for tri-tier
 * disagreements (canon/OKF vs company silver vs personal) the orchestrator raised at grounding time.
 * Open conflicts are resolvable (affirm the authoritative tier + direction → fires the cross-plane
 * write-back, BE #365); recently-resolved ones show the write-back trail from the event ledger.
 *
 * Broad employee READ (transparency — everyone sees the queue); the RESOLVE controls only take
 * effect for the domain owner / fallback role / admin (the DB `app_grounding_conflict_resolver`
 * predicate is the authority boundary — a non-owner's submit is a harmless no-op).
 */
export default async function GroundingConflictsPage() {
  const identity = await requestIdentity();
  const [open, resolved] = await Promise.all([
    listConflicts(identity, { status: "open" }),
    listConflicts(identity, { status: "resolved" }),
  ]);

  // Pull the ledger trail for the resolved set so the write-back outcome is visible.
  const recentResolved = resolved.slice(0, 10);
  const eventsByConflict = new Map<string, GroundingConflictEvent[]>(
    await Promise.all(
      recentResolved.map(
        async (c) => [c.id, await listConflictEvents(identity, c.id)] as const,
      ),
    ),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Grounding conflicts"
        description="Where the knowledge tiers disagree (canon · company silver · personal). The agent served the most-authoritative answer in the interim, labelled — the domain owner resolves which tier is right, and the correction is written back to the system of record."
      >
        <Link href="/knowledge" className="text-sm text-dim transition-colors hover:text-text">
          ← Knowledge
        </Link>
      </PageHeader>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Open ({open.length})</h2>
        {open.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-panel p-8 text-sm text-dim">
            <Icon name="CircleCheck" size={16} />
            No open grounding conflicts.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {open.map((c) => (
              <li key={c.id} className="rounded-xl border border-border bg-panel p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-dim">
                  <span className="rounded border border-border px-1.5 py-0.5 uppercase">{c.domain}</span>
                  {c.concept && <span className="font-medium text-text">{c.concept}</span>}
                  <span className="ml-auto">served from {TIER_LABEL[c.servedTier]}</span>
                </div>
                <p className="mt-2 text-sm text-text">{c.detail}</p>

                <dl className="mt-3 flex flex-col gap-1 text-sm">
                  {tierClaims(c).map(({ tier, claim }) => (
                    <div key={tier} className="flex gap-2">
                      <dt className="w-32 shrink-0 text-xs uppercase text-dim">{TIER_LABEL[tier]}</dt>
                      <dd className="text-text">{claim}</dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-2 rounded-md bg-panel-2 px-3 py-2 text-xs text-dim">
                  Served in the interim (labelled, not authoritative): <span className="text-text">{c.servedLabel}</span>
                </p>

                <ConflictResolveForm
                  conflictId={c.id}
                  tierOptions={tierClaims(c).map(({ tier }) => tier)}
                  defaultTier={c.servedTier}
                  resolveAction={resolveConflictAction}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {recentResolved.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text">Recently resolved</h2>
          <ul className="flex flex-col gap-2">
            {recentResolved.map((c) => {
              const wb = writebackSummary(eventsByConflict.get(c.id) ?? []);
              return (
                <li key={c.id} className="rounded-lg border border-border bg-panel px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-dim">
                    <span className="rounded border border-border px-1.5 py-0.5 uppercase">{c.domain}</span>
                    {c.concept && <span className="text-text">{c.concept}</span>}
                    {c.resolutionTier && <span className="ml-auto">affirmed {TIER_LABEL[c.resolutionTier]}</span>}
                  </div>
                  <p className="mt-1 text-text">{c.detail}</p>
                  <p className="mt-1 text-xs text-dim">
                    Write-back:{" "}
                    {wb ? <span className="text-text">{wb}</span> : <span>not yet dispatched</span>}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
