/**
 * Change Enablement pure helpers (ADR-0079, #656) — labels, the type/status pick-lists,
 * route-param narrowing, and the effective-risk resolution. PURE (no pg, no env, no
 * node:*) so it is unit-testable and importable in client + server alike. The actual
 * persistence lives in the postgres repository (`changes`); the mock returns []/null.
 */
import type {
  ChangeType,
  ChangeStatus,
  ChangeApprovalStatus,
} from "@/types";

/** The ITIL change types, in form/order. */
export const CHANGE_TYPES: readonly ChangeType[] = [
  "standard",
  "normal",
  "emergency",
] as const;

/** Human label per change type (form options + badges). */
export const CHANGE_TYPE_LABEL: Record<ChangeType, string> = {
  standard: "Standard — pre-authorized, low-risk",
  normal: "Normal — assessed + approved",
  emergency: "Emergency — expedited",
};

/** The change lifecycle states. */
export const CHANGE_STATUSES: readonly ChangeStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "scheduled",
  "completed",
  "cancelled",
] as const;

/** Human label per status (badge text). */
export const CHANGE_STATUS_LABEL: Record<ChangeStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Human label per approval status (#659). */
export const CHANGE_APPROVAL_LABEL: Record<ChangeApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

/** Narrow an arbitrary string to a known change type (form/route guard). */
export function asChangeType(value: string | undefined): ChangeType | null {
  return value && (CHANGE_TYPES as readonly string[]).includes(value)
    ? (value as ChangeType)
    : null;
}

/**
 * Effective risk = override ?? derived (the same override-wins resolution as the CMDB
 * criticality overlay). Null when neither is set (not yet assessed — #658 populates these).
 */
export function effectiveRisk(
  derived: number | null,
  override: number | null,
): number | null {
  return override ?? derived;
}
