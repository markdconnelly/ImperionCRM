import Link from "next/link";
import { cn } from "@/lib/cn";
import type { DiscoveryCallRow } from "@/types";

const verdictTone: Record<string, string> = {
  fit: "text-green",
  not_fit: "text-red",
  nurture: "text-amber",
};

export function DiscoveryTable({
  calls,
  deleteAction,
}: {
  calls: DiscoveryCallRow[];
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Held</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Verdict</th>
              <th className="px-4 py-2 font-medium">Next step</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">{c.account}</td>
                <td className="px-4 py-3 text-dim">{c.held ?? "—"}</td>
                <td className="px-4 py-3 text-dim">{c.status}</td>
                <td className={cn("px-4 py-3", c.verdict ? verdictTone[c.verdict] ?? "text-dim" : "text-dim")}>
                  {c.verdict ? c.verdict.replace(/_/g, " ") : "—"}
                </td>
                <td className="px-4 py-3 text-dim">{c.nextStep ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/discovery/${c.id}/edit`} className="text-dim hover:text-text">
                      Edit
                    </Link>
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="text-dim hover:text-red">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {calls.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-dim">
                  No discovery calls yet. Log one to capture the eight discovery points.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
