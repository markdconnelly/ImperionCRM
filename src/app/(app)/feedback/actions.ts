"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ticketsService } from "@/lib/services";

/**
 * Feedback files an Autotask ticket in the app-dev queue (#100, ADR-0078 —
 * supersedes ADR-0013's GitHub-issue coupling).
 *
 * - Open to every signed-in employee (no capability gate by design — feedback
 *   intake is universal; the session check still fails closed).
 * - Idempotent on retry: the form carries a per-render submission id; the
 *   backend's server-side ledger (backend #19, origin {feedback, submissionId})
 *   returns the existing ticket on a re-post instead of filing twice.
 * - Degrades honestly: when the backend or the internal account mapping is not
 *   configured, the user sees a clear failure notice — never a fake success.
 */
export async function submitFeedbackAction(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/feedback?status=error");

  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "enhancement").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  if (!title || !/^[A-Za-z0-9-]{1,64}$/.test(submissionId)) {
    redirect("/feedback?status=error");
  }

  // The internal Imperion account the app-dev queue tickets belong to — must be
  // linked to an Autotask company (backend resolves the companyID from it).
  const accountId = process.env.FEEDBACK_ACCOUNT_ID?.trim();
  if (!accountId) {
    console.error("[feedback] FEEDBACK_ACCOUNT_ID is not configured — cannot file");
    redirect("/feedback?status=unconfigured");
  }

  const kind = ["enhancement", "bug", "documentation"].includes(type) ? type : "enhancement";
  let ticketRef: string;
  try {
    const res = await ticketsService.createTicket({
      queue: "app-dev",
      title: `[${kind}] ${title}`.slice(0, 255),
      description: `${detail || "(no detail)"}\n\nSubmitted via the Imperion CRM Feedback page by ${email}.`,
      accountId,
      origin: { type: "feedback", id: submissionId },
    });
    ticketRef = res.ticketRef;
  } catch (err) {
    console.error(`[feedback] app-dev ticket failed for ${submissionId}:`, err);
    redirect("/feedback?status=error");
  }
  redirect(`/feedback?status=filed&ref=${encodeURIComponent(ticketRef)}`);
}
