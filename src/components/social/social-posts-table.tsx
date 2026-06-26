import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { SocialPostRow } from "@/types";
import { SOCIAL_CHANNELS, PUBLISH_STATUS_TONE } from "@/lib/social";

const CHANNEL_ICON: Record<string, string> = Object.fromEntries(
  SOCIAL_CHANNELS.map((c) => [c.key, c.icon]),
);

/** The compose-once posts list — parent status + the per-channel fan-out chips. */
export function SocialPostsTable({ posts }: { posts: SocialPostRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Post</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Channels</th>
              <th className="px-4 py-2 font-medium">Campaign</th>
              <th className="px-4 py-2 font-medium">Author</th>
              <th className="px-4 py-2 font-medium">Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-t border-border align-top hover:bg-panel-2">
                <td className="max-w-md px-4 py-3">
                  <Link
                    href={`/social/publishing/${p.id}`}
                    className="line-clamp-2 text-accent hover:underline"
                  >
                    {p.summary}
                  </Link>
                </td>
                <td className={`px-4 py-3 capitalize ${PUBLISH_STATUS_TONE[p.status] ?? "text-dim"}`}>
                  {p.status}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {p.channels.length === 0 ? (
                      <span className="text-dim">—</span>
                    ) : (
                      p.channels.map((c) => (
                        <span
                          key={c.channel}
                          title={`${c.channel}: ${c.publishStatus}`}
                          className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-xs"
                        >
                          <Icon
                            name={CHANNEL_ICON[c.channel] ?? "Share2"}
                            size={11}
                            className={PUBLISH_STATUS_TONE[c.publishStatus] ?? "text-dim"}
                          />
                          <span className="capitalize text-dim">{c.channel}</span>
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-dim">{p.campaignName ?? "—"}</td>
                <td className="px-4 py-3 text-dim">{p.author ?? "—"}</td>
                <td className="px-4 py-3 text-dim">{p.scheduledAt ?? "—"}</td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-dim">
                  No posts yet. Compose one — author it once and fan it out to every connected
                  network.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
