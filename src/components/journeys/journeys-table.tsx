import Link from "next/link";
import type { JourneyRow } from "@/types";

export function JourneysTable({ journeys }: { journeys: JourneyRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Journey</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Steps</th>
              <th className="px-4 py-2 font-medium">Sends</th>
              <th className="px-4 py-2 font-medium">A/B</th>
              <th className="px-4 py-2 font-medium">Active enrollments</th>
            </tr>
          </thead>
          <tbody>
            {journeys.map((j) => (
              <tr key={j.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/journeys/${j.id}`} className="hover:text-accent">
                    {j.name}
                  </Link>
                </td>
                <td className={`px-4 py-3 ${j.status === "active" ? "text-green" : "text-dim"}`}>
                  {j.status}
                </td>
                <td className="px-4 py-3 text-dim">{j.stepCount}</td>
                <td className="px-4 py-3 text-dim">{j.sendCount}</td>
                <td className="px-4 py-3 text-dim">
                  {j.hasAbTest ? <span className="text-accent-2">A/B</span> : "—"}
                </td>
                <td className="px-4 py-3 text-dim">{j.activeEnrollments}</td>
              </tr>
            ))}
            {journeys.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-dim">
                  No journeys yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
