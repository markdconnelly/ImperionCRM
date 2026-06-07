import { PageHeader } from "@/components/ui/page-header";
import { ChannelFilter } from "@/components/comms/channel-filter";
import { Timeline } from "@/components/comms/timeline";
import { ActionItems } from "@/components/comms/action-items";
import { getRepositories } from "@/lib/data";
import { completeActionItemAction } from "../contacts/actions";

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  const { comms } = getRepositories();
  const [items, actions] = await Promise.all([
    comms.listInteractions({ source, limit: 100 }),
    comms.listActionItems(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Communications"
        description="The unified, multi-channel history across every contact."
      />

      <ChannelFilter active={source} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-panel p-4 lg:col-span-2">
          <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">Timeline</h3>
          <Timeline
            items={items}
            showContact
            emptyHint={
              source
                ? "No communications on this channel yet."
                : "No communications yet — they arrive from connected accounts and outreach."
            }
          />
        </section>

        <section className="rounded-xl border border-border bg-panel p-4">
          <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">
            Open action items
          </h3>
          <ActionItems
            items={actions}
            completeAction={completeActionItemAction}
            back="/communications"
            showContact
          />
        </section>
      </div>
    </div>
  );
}
