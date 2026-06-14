import { redirect } from "next/navigation";

/**
 * The standalone Payroll Approval queue was folded into the unified timesheet
 * administration surface (ADR-0082, #539). This route now redirects there,
 * forwarding a `?match=<id>` deep link so existing links still open the payment
 * confirmation panel.
 */
export default async function PayrollApprovalRedirect({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>;
}) {
  const { match } = await searchParams;
  redirect(match ? `/timesheets/admin?match=${match}` : "/timesheets/admin");
}
