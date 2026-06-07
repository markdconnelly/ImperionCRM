import { PageHeader } from "@/components/ui/page-header";
import { AccountsTable } from "@/components/accounts/accounts-table";
import { getRepositories } from "@/lib/data";

export default async function AccountsPage() {
  const { crm } = getRepositories();
  const accounts = await crm.listAccounts();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Accounts"
        description={`${accounts.length} accounts across the customer lifecycle`}
      />
      <AccountsTable accounts={accounts} />
    </div>
  );
}
