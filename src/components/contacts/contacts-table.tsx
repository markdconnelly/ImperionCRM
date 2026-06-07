import type { ContactRow } from "@/types";

export function ContactsTable({ contacts }: { contacts: ContactRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Account</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">{c.fullName}</td>
                <td className="px-4 py-3 text-dim">{c.email ?? "—"}</td>
                <td className="px-4 py-3 text-dim">{c.phone ?? "—"}</td>
                <td className="px-4 py-3 text-dim">{c.account ?? "—"}</td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-dim">
                  No contacts yet — they arrive from M365/lead capture, or add them manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
