import Link from "next/link";
import type { SbrRow } from "@/types";

export function SbrTable({
  reviews,
  deleteAction,
}: {
  reviews: SbrRow[];
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Review date</th>
              <th className="px-4 py-2 font-medium">Period</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {reviews.map((s) => (
              <tr key={s.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">{s.account}</td>
                <td className="px-4 py-3 text-dim">{s.reviewDate}</td>
                <td className="px-4 py-3 text-dim">{s.periodLabel ?? "—"}</td>
                <td className="px-4 py-3 text-dim">{s.status}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/sbr/${s.id}/edit`} className="text-dim hover:text-text">
                      Edit
                    </Link>
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="text-dim hover:text-red">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-dim">
                  No Strategic Business Reviews yet. Schedule one to benchmark a managed client.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
