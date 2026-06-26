import Link from "next/link";
import { getRepositories } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { SocialTabs } from "@/components/social/social-tabs";
import { SocialPostsTable } from "@/components/social/social-posts-table";

/**
 * Social — publishing surface (ADR-0124, epic #1338, slice B #1340).
 *
 * The compose-once → fan-out list: each `social_post` (parent) with its per-channel
 * fan-out summary (`social_post_channel`). Authoring opens the compose Builder
 * (ADR-0053). Read-only list — publish/schedule are cockpit-gated Social Actions
 * (ADR-0058). The web role has SELECT on both tables, so the list renders live.
 */
export default async function SocialPublishingPage() {
  const { social } = getRepositories();
  const posts = await social.listPosts();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Social"
        description="Compose once, fan out to every connected network — one Social Post per composition."
      >
        <Link
          href="/social/publishing/compose"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          + Compose post
        </Link>
      </PageHeader>

      <SocialTabs active="publishing" />
      <SocialPostsTable posts={posts} />
    </div>
  );
}
