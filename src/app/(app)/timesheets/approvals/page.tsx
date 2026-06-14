import { redirect } from "next/navigation";

/**
 * The standalone Time Approvals queue was folded into the unified timesheet
 * administration surface (ADR-0082, #539). This route now redirects there,
 * forwarding a `?review=<id>` deep link so existing links still open the review.
 */
export default async function TimeApprovalsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ review?: string }>;
}) {
  const { review } = await searchParams;
  redirect(review ? `/timesheets/admin?review=${review}` : "/timesheets/admin");
}
