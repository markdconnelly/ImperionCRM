import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SbrTable } from "@/components/sbr/sbr-table";
import { getRepositories } from "@/lib/data";
import { deleteSbrAction } from "./actions";

export default async function SbrPage() {
  const { engagements } = getRepositories();
  const reviews = await engagements.listSbrs();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Business Reviews"
        description="Strategic Business Reviews — benchmark managed clients against their assessment each quarter."
      >
        <Link
          href="/sbr/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          + Schedule SBR
        </Link>
      </PageHeader>
      <SbrTable reviews={reviews} deleteAction={deleteSbrAction} />
    </div>
  );
}
