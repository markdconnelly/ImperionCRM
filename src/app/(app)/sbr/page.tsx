import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SbrTable } from "@/components/sbr/sbr-table";
import { getRepositories } from "@/lib/data";
import { deleteSbrAction } from "./actions";

export default async function SbrPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; snapshot?: string }>;
}) {
  const { ticket, snapshot } = await searchParams;
  const { engagements } = getRepositories();
  const reviews = await engagements.listSbrs();

  return (
    <div className="flex flex-col gap-4">
      {snapshot === "failed" && (
        <p className="rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
          The review was saved, but its posture snapshot could not be taken (ADR-0051 §5).
          The scheduled quarterly snapshot still covers this account; you can also use
          &quot;Snapshot now&quot; on the account&apos;s posture page.
        </p>
      )}
      {ticket === "failed" && (
        <p className="rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
          The review was saved, but its business-review queue ticket could not be filed.
          Open the review and use &quot;File business-review queue ticket&quot; to retry —
          retries never create duplicates.
        </p>
      )}
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
