import Link from "next/link";
import type { ContactRow } from "@/types";

export function ContactsTable({
  contacts,
  deleteAction,
}: {
  contacts: ContactRow[];
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
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
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/contacts/${c.id}`} className="hover:text-accent">
                    {c.fullName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-dim">{c.email ?? "—"}</td>
                <td className="px-4 py-3 text-dim">{c.phone ?? "—"}</td>
                <td className="px-4 py-3 text-dim">{c.account ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/contacts/${c.id}`} className="text-dim hover:text-text">
                      View
                    </Link>
                    <Link href={`/contacts/${c.id}/edit`} className="text-dim hover:text-text">
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
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-dim">
                  No contacts yet — they arrive from connected accounts/lead capture, or add one manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
