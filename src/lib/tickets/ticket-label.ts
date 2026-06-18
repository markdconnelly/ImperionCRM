import type { TicketRow } from "@/types";

/**
 * One-line label for a ticket in a picker/typeahead (#852): `#<number> · <account>
 * · <title> · <status>`. Pure + UI-agnostic so it is unit-testable and reusable
 * across the manual-mileage ticket link and any future ticket picker.
 */
export function formatTicketLabel(t: TicketRow): string {
  const num = t.number ? `#${t.number}` : "(no number)";
  const status = t.status ? ` · ${t.status}` : "";
  return `${num} · ${t.account} · ${t.title}${status}`;
}

/**
 * The value stored as `ticket_ref` when a ticket is picked: the human Autotask
 * ticket number (mirrors `website_expense_item.ticket_ref` / timesheets'
 * `ancillary_ticket_ref`). Empty string when the synced ticket has no number.
 */
export function ticketRefValue(t: TicketRow): string {
  return t.number ?? "";
}
