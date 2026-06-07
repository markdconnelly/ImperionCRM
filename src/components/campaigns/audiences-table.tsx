import Link from "next/link";
import type { AudienceRow } from "@/types";

/**
 * Audiences over aggregated profiles (ADR-0026). "Ad-ready" counts only members with
 * current ad_targeting consent — the launch gate.
 */
export function AudiencesTable({ audiences }: { audiences: AudienceRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Audience</th>
              <th className="px-4 py-2 font-medium">Kind</th>
              <th className="px-4 py-2 font-medium">Members</th>
              <th className="px-4 py-2 font-medium">Ad-ready</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {audiences.map((a) => (
              <tr key={a.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3">
                  <Link href={`/campaigns/audiences/${a.id}`} className="font-medium hover:text-accent">
                    {a.name}
                  </Link>
                  {a.description && <p className="text-xs text-dim">{a.description}</p>}
                </td>
                <td className="px-4 py-3 text-dim capitalize">{a.kind}</td>
                <td className="px-4 py-3 text-dim">{a.memberCount}</td>
                <td className="px-4 py-3">
                  <span className="text-green">{a.adReadyCount}</span>
                  <span className="text-dim"> / {a.memberCount}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/campaigns/audiences/${a.id}`} className="text-dim hover:text-text">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {audiences.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-dim">
                  No audiences yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
