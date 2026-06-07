import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { DiscoveryTable } from "@/components/discovery/discovery-table";
import { getRepositories } from "@/lib/data";
import { deleteDiscoveryAction } from "./actions";

export default async function DiscoveryPage() {
  const { engagements } = getRepositories();
  const calls = await engagements.listDiscoveryCalls();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Discovery"
        description="Executive discovery & risk conversations — capture, qualify, lock the next step."
      >
        <Link
          href="/discovery/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          + Log discovery call
        </Link>
      </PageHeader>
      <DiscoveryTable calls={calls} deleteAction={deleteDiscoveryAction} />
    </div>
  );
}
