import { notFound } from "next/navigation";
import Link from "next/link";
import { getRepositories } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { SocialPostActions } from "@/components/social/social-post-actions";
import { SOCIAL_CHANNELS, PUBLISH_STATUS_TONE } from "@/lib/social";
import {
  proposeSocialPublishAction,
  proposeSocialBoostAction,
} from "@/lib/agent/social-actions";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageCampaigns } from "@/lib/auth/roles";

const CHANNEL_ICON: Record<string, string> = Object.fromEntries(
  SOCIAL_CHANNELS.map((c) => [c.key, c.icon]),
);

/**
 * Social Post detail (ADR-0124, epic #1338, slice B #1358).
 *
 * A read view of one compose-once `social_post` + its per-network `social_post_channel`
 * fan-out rows, plus the outbound action entry points: per-channel PUBLISH and BOOST. Every
 * outbound is a governed Social Action proposed to the pending-action cockpit (ADR-0058) —
 * human-approved in v1, never a direct send; the marketing role gates it. The web role has
 * SELECT on both tables (migration 0210), so the read renders live; nothing is written here.
 */
export default async function SocialPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { social } = getRepositories();
  const [post, roles] = await Promise.all([social.getPost(id), getSessionRoles()]);
  if (!post) notFound();
  const canManage = canManageCampaigns(roles);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Social post" description={`Status: ${post.status}`}>
        <Link
          href="/social/publishing"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:bg-bg"
        >
          ← All posts
        </Link>
      </PageHeader>

      <section className="rounded-xl border border-border bg-panel p-4">
        <p className="whitespace-pre-wrap text-sm text-text">
          {post.body || <span className="text-dim">(no copy)</span>}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim">
          {post.campaignName ? <span>campaign: {post.campaignName}</span> : null}
          {post.author ? <span>author: {post.author}</span> : null}
          {post.scheduledAt ? <span>scheduled: {post.scheduledAt}</span> : null}
          {post.createdAt ? <span>created: {post.createdAt}</span> : null}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-panel p-4">
        <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">Channel fan-out</h3>
        {post.channels.length === 0 ? (
          <p className="text-sm text-dim">No channels selected for this post.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {post.channels.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border/60 p-2.5 text-sm"
              >
                <Icon
                  name={CHANNEL_ICON[c.channel] ?? "Share2"}
                  size={14}
                  className={PUBLISH_STATUS_TONE[c.publishStatus] ?? "text-dim"}
                />
                <span className="capitalize">{c.channel}</span>
                <span className={`capitalize ${PUBLISH_STATUS_TONE[c.publishStatus] ?? "text-dim"}`}>
                  {c.publishStatus}
                </span>
                {c.publishedAt ? <span className="text-dim">· {c.publishedAt}</span> : null}
                {c.error ? <span className="text-rose-400">· {c.error}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <SocialPostActions
        socialPostId={post.id}
        channels={post.channels}
        canManage={canManage}
        proposePublishAction={proposeSocialPublishAction}
        proposeBoostAction={proposeSocialBoostAction}
      />
    </div>
  );
}
