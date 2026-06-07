import Link from "next/link";
import type { CampaignRow } from "@/types";

const STATUS_TONE: Record<string, string> = {
  active: "text-green",
  paused: "text-amber",
  completed: "text-dim",
  draft: "text-dim",
};

export function CampaignsTable({ campaigns }: { campaigns: CampaignRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Campaign</th>
              <th className="px-4 py-2 font-medium">Platform</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Budget</th>
              <th className="px-4 py-2 font-medium">Spend</th>
              <th className="px-4 py-2 font-medium">Leads</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/campaigns/${c.id}`} className="hover:text-accent">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-dim capitalize">{c.platform}</td>
                <td className={`px-4 py-3 ${STATUS_TONE[c.status] ?? "text-dim"}`}>{c.status}</td>
                <td className="px-4 py-3 text-dim">{c.budget}</td>
                <td className="px-4 py-3 text-dim">{c.spend}</td>
                <td className="px-4 py-3 text-dim">{c.leads}</td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-dim">
                  No campaigns yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
