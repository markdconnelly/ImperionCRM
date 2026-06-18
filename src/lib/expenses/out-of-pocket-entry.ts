/**
 * Out-of-pocket expense entry validation (ADR-0083, #487). Pure + UI/DB-agnostic so the
 * entry rules are unit-tested independently of the server action, exactly like the
 * mileage sibling `mileage-entry.ts`. The rules:
 *   • a date is required;
 *   • the amount must be a finite number > 0 (the employee hand-types the out-of-pocket $);
 *   • a category is required (uncategorized is only a soft nudge for items already on a
 *     report, but a NEW entry must pick one — the visible mapped list always has options);
 *   • when the leg is billable, an Autotask company id is required (the client leg must be
 *     traceable), mirroring the mileage billable→company rule.
 *
 * Receipt presence is NOT validated here: the receipt is uploaded separately (#487
 * receipt-upload follow-up) and its absence is surfaced as the `missing_receipt` HARD
 * policy violation at attest time (`policy.ts`), not as an entry-time block — so an
 * employee can save a line now and attach the receipt before attesting.
 *
 * Returns an error code (used as the form `?error=` key) or null when valid.
 */
export type OutOfPocketEntryError =
  | "date"
  | "amount"
  | "category-required"
  | "company-required"
  | null;

export interface RawOutOfPocketEntry {
  itemDate: string;
  amount: number;
  categoryId: string | null;
  billable: boolean;
  autotaskCompanyId: number | null;
}

export function validateOutOfPocketEntry(e: RawOutOfPocketEntry): OutOfPocketEntryError {
  if (!e.itemDate) return "date";
  if (!Number.isFinite(e.amount) || e.amount <= 0) return "amount";
  if (!e.categoryId) return "category-required";
  if (e.billable && e.autotaskCompanyId === null) return "company-required";
  return null;
}
