import type { LeadCaptureEventRow } from "@/types";

const STATUS_TONE: Record<string, string> = {
  new: "text-accent",
  resolved: "text-green",
  ignored: "text-dim",
};

/** Inbound lead captures awaiting resolution into a contact (ADR-0024). */
export function CaptureInbox({
  events,
  resolveAction,
}: {
  events: LeadCaptureEventRow[];
  resolveAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Received</th>
              <th className="px-4 py-2 font-medium">Hook</th>
              <th className="px-4 py-2 font-medium">Capture</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 tabular-nums text-dim">{e.receivedAt ?? "—"}</td>
                <td className="px-4 py-3 text-dim">{e.hook ?? "—"}</td>
                <td className="px-4 py-3">{e.contact ?? e.summary ?? "—"}</td>
                <td className={`px-4 py-3 ${STATUS_TONE[e.status] ?? "text-dim"}`}>{e.status}</td>
                <td className="px-4 py-3 text-right">
                  {e.status === "new" && (
                    <form action={resolveAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="text-dim hover:text-green">
                        Resolve → contact
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-dim">
                  No captures yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
