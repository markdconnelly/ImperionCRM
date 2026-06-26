import { getRepositories } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { ComposePost } from "@/components/social/compose-post";
import { saveSocialPostAction } from "../../actions";

/**
 * Compose-once → fan-out Builder (ADR-0053 Builder pattern, ADR-0124 #3, slice B #1340).
 *
 * Author one composition, pick the networks to fan out to, save as a draft (or schedule).
 * Persisting is a backend process (ADR-0042 §1 — the web role is SELECT-only on
 * `social_post`); the action posts to the backend save endpoint and degrades honestly when
 * that endpoint isn't wired (no faked persistence). Publish/boost are cockpit-gated Social
 * Actions wired in the follow-up.
 */
export default async function ComposePostPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; stub?: string }>;
}) {
  const { saved, stub } = await searchParams;
  const { campaigns } = getRepositories();
  const campaignList = await campaigns.listCampaigns();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Compose post"
        description="Write once, adapt and fan out to every selected network."
      />
      {saved === "1" ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          Draft saved. Schedule or publish it from the post — every outbound goes through the
          approval cockpit.
        </p>
      ) : null}
      {stub === "1" ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          The publishing backend isn’t wired up in this environment yet, so nothing was
          persisted. Your composition was not saved — this is honest, not a silent failure.
        </p>
      ) : null}
      <ComposePost
        action={saveSocialPostAction}
        campaigns={campaignList.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
