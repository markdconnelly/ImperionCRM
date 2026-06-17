import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getSessionRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/policy";
import { canSeeService } from "@/lib/auth/roles";
import { getRepositories } from "@/lib/data";
import {
  CHANGE_STATUS_LABEL,
  CHANGE_TYPE_LABEL,
  CHANGE_APPROVAL_LABEL,
  effectiveRisk,
} from "@/lib/change";
import { CI_TYPE_LABEL } from "@/lib/cmdb/ci";
import { ChangeForm } from "../change-form";
import { updateChangeAction, deleteChangeAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Change detail (#656): view + edit the change, manage the affected-CI set, delete. Gated
 * by the Service group guard; editing by `change:write`. If migration 0135 isn't applied the
 * read returns null → notFound (never a 500). Risk/approval/schedule are read-only here —
 * the downstream slices (#658/#659/#660) own writing them.
 */
export default async function ChangeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roles = await getSessionRoles();
  if (!canSeeService(roles)) redirect("/");
  const canWrite = can(roles, "change:write");

  const { changes, crm } = getRepositories();
  const change = await changes.getChangeRequest(id);
  if (!change) notFound();

  const [cis, accounts] = await Promise.all([
    crm.listConfigurationItems(),
    crm.listAccounts(),
  ]);

  const risk = effectiveRisk(change.riskDerived, change.riskOverride);
  const initialAffectedKeys = change.affectedCis.map((c) => `${c.ciType}:${c.ciId}`);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={change.title} description={change.description ?? "Change request."}>
        <Link href="/changes" className="text-sm text-dim transition-colors hover:text-text">
          ← Changes
        </Link>
        {canWrite && (
          <form action={deleteChangeAction}>
            <input type="hidden" name="id" value={change.id} />
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:border-red hover:text-red"
            >
              Delete
            </button>
          </form>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 text-sm text-dim">
        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase">
          {change.changeType}
        </span>
        <span className="rounded bg-panel-2 px-1.5 py-0.5">
          {CHANGE_STATUS_LABEL[change.status]}
        </span>
        <span title={CHANGE_TYPE_LABEL[change.changeType]}>
          Risk: {risk === null ? "not assessed" : risk}
        </span>
        <span>
          Approval:{" "}
          {change.approvalStatus ? CHANGE_APPROVAL_LABEL[change.approvalStatus] : "not requested"}
        </span>
        {change.scheduleStart && <span>· scheduled {change.scheduleStart.slice(0, 10)}</span>}
        {change.requester && <span>· raised by {change.requester}</span>}
        {change.accountName && <span>· {change.accountName}</span>}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">
          Affected configuration items ({change.affectedCis.length})
        </h2>
        {change.affectedCis.length === 0 ? (
          <p className="text-xs text-dim">No configuration items linked to this change.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {change.affectedCis.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 text-sm"
              >
                <Icon name="Network" size={14} />
                <Link href={`/cmdb/${c.ciType}/${c.ciId}`} className="font-medium hover:text-accent">
                  {c.displayName}
                </Link>
                <span className="rounded border border-border px-1 py-0.5 text-[10px] uppercase text-dim">
                  {CI_TYPE_LABEL[c.ciType]}
                </span>
                {c.accountName && <span className="text-xs text-dim">· {c.accountName}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canWrite && (
        <details className="rounded-md border border-border bg-panel p-4">
          <summary className="cursor-pointer text-sm font-medium">Edit change</summary>
          <div className="mt-4">
            <ChangeForm
              action={updateChangeAction}
              cis={cis}
              accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
              initial={change}
              initialAffectedKeys={initialAffectedKeys}
              hiddenId={change.id}
              submitLabel="Save changes"
            />
          </div>
        </details>
      )}
    </div>
  );
}
