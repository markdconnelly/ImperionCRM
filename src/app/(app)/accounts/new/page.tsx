import { PageHeader } from "@/components/ui/page-header";
import { AccountForm } from "@/components/accounts/account-form";
import { createAccountAction } from "../actions";

export default function NewAccountPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="New account" description="Create an account manually." />
      <AccountForm action={createAccountAction} />
    </div>
  );
}
