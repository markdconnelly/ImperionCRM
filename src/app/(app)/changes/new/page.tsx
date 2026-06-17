import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/policy";
import { getRepositories } from "@/lib/data";
import { ChangeForm } from "../change-form";
import { createChangeAction } from "../actions";

export const dynamic = "force-dynamic";

/** Raise a new change (#656). Gated by `change:write` (admin∨support). The affected-CI
 *  picker is sourced from the CMDB register (#645); accounts feed the optional scope. */
export default async function NewChangePage() {
  const roles = await getSessionRoles();
  if (!can(roles, "change:write")) redirect("/changes");

  const { changes: _changes, crm } = getRepositories();
  void _changes;
  const [cis, accounts] = await Promise.all([
    crm.listConfigurationItems(),
    crm.listAccounts(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New change"
        description="Define the change and pick the configuration items it affects. Risk, approval and schedule are set later."
      >
        <Link href="/changes" className="text-sm text-dim transition-colors hover:text-text">
          ← Changes
        </Link>
      </PageHeader>
      <ChangeForm
        action={createChangeAction}
        cis={cis}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        submitLabel="Create change"
      />
    </div>
  );
}
