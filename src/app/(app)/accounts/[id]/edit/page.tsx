import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { AccountForm } from "@/components/accounts/account-form";
import { updateAccountAction } from "../../actions";
import { getRepositories } from "@/lib/data";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm } = getRepositories();
  const account = await crm.getAccount(id);
  if (!account) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Edit account" description={account.name} />
      <AccountForm action={updateAccountAction} account={account} />
    </div>
  );
}
