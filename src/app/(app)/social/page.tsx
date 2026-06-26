import Link from "next/link";
import { getRepositories } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { SocialTabs } from "@/components/social/social-tabs";
import { SocialChannelFilter } from "@/components/social/social-channel-filter";
import { SocialInbox } from "@/components/social/social-inbox";

/**
 * Social — unified inbox (ADR-0124, epic #1338, slice B #1340).
 *
 * One view over both inbound origins (ADR-0124 #2 inbound split): private DMs from the
 * `interaction` timeline (`kind='dm'`) and public comments/mentions from
 * `social_engagement`, across every Social Channel, intent-tagged. Read-only — replying
 * is a Social Action routed through the pending-action cockpit (ADR-0058), wired in the
 * follow-up. The web role has SELECT on both source tables, so this view is fully live
 * the moment the collectors hydrate (slice H).
 */
export default async function SocialInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const { channel } = await searchParams;
  const { social } = getRepositories();
  const items = await social.listInbox({ channel, limit: 150 });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Social"
        description="Unified inbound — DMs, comments, and brand mentions across every connected network."
      >
        <Link
          href="/social/publishing/compose"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          + Compose post
        </Link>
      </PageHeader>

      <SocialTabs active="inbox" />
      <SocialChannelFilter active={channel} basePath="/social" />
      <SocialInbox items={items} />
    </div>
  );
}
