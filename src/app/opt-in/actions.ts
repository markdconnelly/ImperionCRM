"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getRepositories } from "@/lib/data";
import { checkbox, str, strOrNull } from "@/lib/form-data";
import {
  CONSENT_LANGUAGE_VERSION,
  EMAIL_CONSENT_TEXT,
  SMS_CONSENT_TEXT,
} from "./consent-language";

/**
 * Public opt-in submit (#217). UNAUTHENTICATED by design — this is the page the
 * ACS toll-free SMS verification reviewer screenshots, so it has to be reachable
 * without a session. It is the ONLY unauthenticated write in the app, so it is
 * deliberately minimal and low-risk:
 *
 *  - It writes only an append-only BRONZE `lead_capture_event` (ADR-0024) — it
 *    never touches the consent ledger or creates a contact. The backend owns
 *    those processes (ADR-0028) and resolves the capture later.
 *  - Inputs are validated and stored as the raw payload; the consent proof
 *    (exact language version, per-channel consent, source URL, timestamp) is
 *    captured for the verification submission.
 *  - Next.js server actions are CSRF-safe by default (origin-checked POST).
 *
 * Residual abuse vector: an unauthenticated public POST can be spammed. Edge /
 * backend rate-limiting is the mitigation and is out of front-end scope — see
 * the follow-up issue noted in the PR. The bronze table is append-only and
 * carries no privileged effect until the backend resolves it.
 */
export async function submitOptInAction(formData: FormData): Promise<void> {
  const name = str(formData, "name");
  const email = strOrNull(formData, "email");
  const phone = strOrNull(formData, "phone");
  const consentSms = checkbox(formData, "consentSms");
  const consentEmail = checkbox(formData, "consentEmail");

  // Validate: a real channel must be consented and its identifier supplied.
  // On any validation miss, bounce back with a flag (no PII in the query string).
  const smsValid = consentSms && phone != null;
  const emailValid = consentEmail && email != null;
  if (!name || (!smsValid && !emailValid)) {
    redirect("/opt-in?error=1");
  }

  const hdrs = await headers();
  const payload = {
    schema: "public_opt_in",
    name,
    // Only the identifiers for channels actually consented are retained.
    email: emailValid ? email : null,
    phone: smsValid ? phone : null,
    consent: {
      languageVersion: CONSENT_LANGUAGE_VERSION,
      sms: smsValid ? { agreed: true, text: SMS_CONSENT_TEXT } : { agreed: false },
      email: emailValid ? { agreed: true, text: EMAIL_CONSENT_TEXT } : { agreed: false },
    },
    proof: {
      submittedAt: new Date().toISOString(),
      sourceUrl: hdrs.get("referer") ?? "/opt-in",
      userAgent: hdrs.get("user-agent") ?? null,
    },
  };

  const { leads } = getRepositories();
  await leads.recordWebFormCapture(payload);

  redirect("/opt-in?submitted=1");
}
