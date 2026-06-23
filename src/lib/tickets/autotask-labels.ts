/**
 * Autotask picklist code → human label, for the list views that render silver
 * `ticket` / `contract` rows (#1138). The silver tables store these fields as raw
 * source codes (numeric Autotask picklist ids carried as text — migration 0014/0050,
 * "raw source status"), so the GUI must map them at the presentation layer.
 *
 * Convention (mirrors `labelAutotaskStatus` in the reports BI layer): map the
 * conventional/system picklist values to their labels and keep unknown ids HONEST
 * — render `Status 19` rather than a bare `19` or a guessed label. Customer
 * instances can rename/extend these picklists, so an unmapped id is shown as its
 * code with a type prefix, never silently mislabeled. `null`/blank → em-dash.
 *
 * These are UI-agnostic pure functions so they unit-test and reuse across the
 * tickets board, the omnichannel queue, and the contracts list.
 */

const TICKET_STATUS: Record<string, string> = {
  // Autotask system + conventional ticket statuses.
  "1": "New",
  "5": "Complete",
  "7": "Waiting",
  "8": "In Progress",
  "9": "Waiting Customer",
  "10": "Escalate",
  "11": "Waiting Materials",
};

const TICKET_PRIORITY: Record<string, string> = {
  // Autotask system ticket priorities.
  "1": "Critical",
  "2": "High",
  "3": "Medium",
  "4": "Low",
};

const CONTRACT_TYPE: Record<string, string> = {
  // Autotask contract types (ContractCategory picklist).
  "1": "Time & Materials",
  "3": "Fixed Price",
  "5": "Block Hours",
  "6": "Retainer",
  "7": "Recurring Service",
  "8": "Per Ticket",
};

const CONTRACT_STATUS: Record<string, string> = {
  // Autotask contract statuses.
  "1": "Active",
  "2": "Inactive",
};

const DASH = "—";

/** Map a raw value against a picklist, keeping unmapped ids honest as `<prefix> N`. */
function label(raw: string | null | undefined, map: Record<string, string>, prefix: string): string {
  const v = (raw ?? "").trim();
  if (v === "") return DASH;
  if (v === "unknown") return "unknown";
  return map[v] ?? `${prefix} ${v}`;
}

export function labelTicketStatus(raw: string | null | undefined): string {
  return label(raw, TICKET_STATUS, "Status");
}

export function labelTicketPriority(raw: string | null | undefined): string {
  return label(raw, TICKET_PRIORITY, "Priority");
}

export function labelContractType(raw: string | null | undefined): string {
  return label(raw, CONTRACT_TYPE, "Type");
}

export function labelContractStatus(raw: string | null | undefined): string {
  return label(raw, CONTRACT_STATUS, "Status");
}
