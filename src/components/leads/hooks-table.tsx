import type { LeadHookRow } from "@/types";

const KIND_LABEL: Record<string, string> = {
  web_form: "Web form",
  facebook_lead: "Facebook lead",
  youtube_comment: "YouTube comment",
  linkedin_message: "LinkedIn message",
  inbound_email: "Inbound email",
  qr: "QR",
  manual: "Manual",
};

/** Configured lead-capture hooks (ADR-0024). */
export function HooksTable({ hooks }: { hooks: LeadHookRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Hook</th>
              <th className="px-4 py-2 font-medium">Kind</th>
              <th className="px-4 py-2 font-medium">Active</th>
              <th className="px-4 py-2 font-medium">Captures</th>
            </tr>
          </thead>
          <tbody>
            {hooks.map((h) => (
              <tr key={h.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">{h.name}</td>
                <td className="px-4 py-3 text-dim">{KIND_LABEL[h.kind] ?? h.kind}</td>
                <td className={`px-4 py-3 ${h.active ? "text-green" : "text-dim"}`}>
                  {h.active ? "Yes" : "No"}
                </td>
                <td className="px-4 py-3 text-dim">{h.captureCount}</td>
              </tr>
            ))}
            {hooks.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-dim">
                  No hooks configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
