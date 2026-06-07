import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { AccountsTable } from "@/components/accounts/accounts-table";
import { getRepositories } from "@/lib/data";
import { deleteAccountAction } from "./actions";

export default async function AccountsPage() {
  const { crm } = getRepositories();
  const accounts = await crm.listAccounts();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Accounts"
        description={`${accounts.length} accounts across the customer lifecycle`}
      >
        <Link
          href="/accounts/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          + New account
        </Link>
      </PageHeader>
      <AccountsTable accounts={accounts} deleteAction={deleteAccountAction} />
    </div>
  );
}
