/**
 * Manual mileage entry validation (ADR-0083, #853). Pure + UI/DB-agnostic so the
 * billable→ticket rule is unit-tested independently of the server action. The rule
 * (Mark, 2026-06-17): a ticket link is required ONLY when the mileage is billable (the
 * client leg must be traceable); internal/non-billable mileage may omit both ticket and
 * company. Returns an error code (used as the form `?error=` key) or null when valid.
 */
export type MileageEntryError =
  | "date"
  | "miles"
  | "ticket-required"
  | "company-required"
  | null;

export interface RawMileageEntry {
  itemDate: string;
  miles: number;
  billable: boolean;
  ticketRef: string | null;
  autotaskCompanyId: number | null;
}

export function validateMileageEntry(e: RawMileageEntry): MileageEntryError {
  if (!e.itemDate) return "date";
  if (!Number.isFinite(e.miles) || e.miles <= 0) return "miles";
  if (e.billable && !e.ticketRef) return "ticket-required";
  if (e.billable && e.autotaskCompanyId === null) return "company-required";
  return null;
}
