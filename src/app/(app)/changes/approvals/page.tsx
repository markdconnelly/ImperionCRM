import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getSessionRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/policy";
import { canSeeService } from "@/lib/auth/roles";
import { getRepositories } from "@/lib/data";
import {
  CHANGE_TYPE_LABEL,
  effectiveRisk,
  riskBand,
  RISK_BAND_LABEL,
  isAwaitingApproval,
  isExpedited,
} from "@/lib/change";
import { decideChangeApprovalAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Pending-approvals queue (#659, ADR-0079) — the lightweight CAB worklist: every change
 * awaiting an approver decision (status `pending_approval` + approval `pending`), emergency
 * (expedited) changes first so the fast-track ones surface at the top. Same Service-group
 * guard as the rest of /changes; the approve/reject controls are gated by `change:approve`
 * (admin) and audited in the repository. Mirrors the ICM run-approval queue pattern: a
 * list-of-actionable-items view distinct from the full register.
 */
export default async function ChangeApprovalsPage() {
  const roles = await getSessionRoles();
  if (!canSeeService(roles)) redirect("/");
  const canApprove = can(roles, "change:approve");

  const { changes } = getRepositories();
  const all = await changes.listChangeRequests();
  // Awaiting an approver decision; expedited (emergency) first, then newest-first.
  const pending = all
    .filter((c) => isAwaitingApproval(c.status, c.approvalStatus))
    .sort((a, b) => {
      const ax = isExpedited(a.changeType) ? 0 : 1;
      const bx = isExpedited(b.changeType) ? 0 : 1;
      return ax - bx;
    });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pending approvals"
        description="Changes awaiting an approver decision (normal + emergency). Emergency changes are expedited and surfaced first. Standard changes are pre-authorized and never appear here."
      >
        <Link href="/changes" className="text-sm text-dim transition-colors hover:text-text">
          ← Changes
        </Link>
      </PageHeader>

      {pending.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-panel p-8 text-sm text-dim">
          <Icon name="CircleCheck" size={16} />
          Nothing awaiting approval.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((c) => {
            const expedited = isExpedited(c.changeType);
            const risk = effectiveRisk(c.riskDerived, c.riskOverride);
            return (
              <li
                key={c.id}
                className={`rounded-xl border bg-panel p-4 ${expedited ? "border-red" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/changes/${c.id}`} className="font-medium hover:text-accent">
                    {c.title}
                  </Link>
                  {expedited && (
                    <span className="rounded bg-red/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red">
                      Expedited — emergency
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-dim">
                  <span
                    title={CHANGE_TYPE_LABEL[c.changeType]}
                    className="rounded border border-border px-1.5 py-0.5 uppercase"
                  >
                    {c.changeType}
                  </span>
                  <span>
                    {c.affectedCiCount} affected CI{c.affectedCiCount === 1 ? "" : "s"}
                  </span>
                  {risk !== null && (
                    <span>
                      · risk {risk}/100 · {RISK_BAND_LABEL[riskBand(risk)]}
                    </span>
                  )}
                  {c.accountName && <span>· {c.accountName}</span>}
                  {c.requester && <span>· raised by {c.requester}</span>}
                </div>
                {canApprove && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <form action={decideChangeApprovalAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <button
                        type="submit"
                        className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:border-accent hover:text-accent"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={decideChangeApprovalAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <button
                        type="submit"
                        className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:border-red hover:text-red"
                      >
                        Reject
                      </button>
                    </form>
                    <Link
                      href={`/changes/${c.id}`}
                      className="ml-auto text-accent transition-colors hover:underline"
                    >
                      Open →
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
