import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { ThreadsCompose } from "@/components/threads/threads-compose";
import { ThreadsReplyList } from "@/components/threads/threads-reply-list";
import { ThreadsInsights } from "@/components/threads/threads-insights";
import { getRepositories } from "@/lib/data";
import { listThreadsInsights } from "@/lib/threads/threads-data";
import {
  proposeThreadsPostAction,
  proposeThreadsReplyAction,
} from "@/lib/agent/threads-actions";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageCampaigns } from "@/lib/auth/roles";

/**
 * Threads management surface (epic #1334 S5, ADR-0125 / ADR-0124).
 *
 * Belle's channel cockpit for our own Threads presence: COMPOSE a post, work the REPLY QUEUE
 * (replies on our posts), triage the MENTIONS INBOX (public mentions of us), and read
 * INSIGHTS. Reads the unified `interaction` timeline (source=threads, split by kind) + silver
 * `social_metric` (platform=threads) — direct rendering reads (ADR-0042). Compose + reply
 * PROPOSE governed Social Actions (publish_threads / reply_threads) that route to the
 * pending-action cockpit for human approval (customer-facing HARD ceiling, ADR-0125 D3) — the
 * front end never sends. Renders empty/dormant until S3 ingest (LP #356) hydrates bronze and
 * S4 (BE #417) + the conn-company-threads token + Meta App Review land — the expected state.
 */
export default async function ThreadsPage() {
  const { comms } = getRepositories();
  const [posts, replies, mentions, insights, roles] = await Promise.all([
    comms.listInteractions({ source: "threads", kind: "social_post", limit: 50 }),
    comms.listInteractions({ source: "threads", kind: "social_comment", limit: 50 }),
    comms.listInteractions({ source: "threads", kind: "mention", limit: 50 }),
    listThreadsInsights(),
    getSessionRoles(),
  ]);
  const canPost = canManageCampaigns(roles);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Threads"
        description="Our Threads presence — compose, replies, mentions, and insights. Belle drafts; every post is human-approved in the action cockpit (ADR-0125)."
      />

      <ThreadsCompose proposeAction={proposeThreadsPostAction} canPost={canPost} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-panel p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="MessageCircle" size={14} className="text-dim" />
            <h3 className="font-display text-sm font-semibold tracking-tight">Reply queue</h3>
            <span className="text-[11px] text-dim">replies on our posts</span>
          </div>
          <ThreadsReplyList
            items={replies}
            proposeReplyAction={proposeThreadsReplyAction}
            canReply={canPost}
            emptyHint="No replies yet — they arrive once the Threads collector runs."
          />
        </section>

        <ThreadsInsights stats={insights} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-panel p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="AtSign" size={14} className="text-dim" />
            <h3 className="font-display text-sm font-semibold tracking-tight">Mentions inbox</h3>
            <span className="text-[11px] text-dim">public mentions of us</span>
          </div>
          <ThreadsReplyList
            items={mentions}
            proposeReplyAction={proposeThreadsReplyAction}
            canReply={canPost}
            emptyHint="No mentions yet — Nova routes new ones by intent (lead → Chase, support → Felix, brand → Belle)."
            inbound
          />
        </section>

        <section className="rounded-xl border border-border bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="Send" size={14} className="text-dim" />
            <h3 className="font-display text-sm font-semibold tracking-tight">Our posts</h3>
            <span className="text-[11px] text-dim">{posts.length}</span>
          </div>
          {posts.length === 0 ? (
            <p className="py-6 text-center text-xs text-dim">
              No posts yet — proposed posts appear here once published.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {posts.map((p) => (
                <li key={p.id} className="rounded-lg border border-border/60 p-3">
                  <p className="line-clamp-3 text-sm">
                    {p.summary ?? p.subject ?? "(no text captured)"}
                  </p>
                  {p.occurredAt && (
                    <span className="mt-1 block text-[10px] text-dim">{p.occurredAt}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
