/**
 * The opt-in / consent language for the public capture page (#217).
 *
 * This text is the crux of the ACS toll-free SMS verification submission — the
 * exact language a visitor agrees to. It lives in ONE place so the words the
 * page renders are byte-for-byte the words stored as consent proof on the
 * bronze `lead_capture_event` payload (ADR-0024). Bump `CONSENT_LANGUAGE_VERSION`
 * whenever the wording changes so each capture records which version was shown.
 */

export const CONSENT_LANGUAGE_VERSION = "2026-06-17.v1";

export const ORG_NAME = "Imperion";

/** Per-channel consent statements, shown beside each checkbox and stored verbatim. */
export const SMS_CONSENT_TEXT =
  "I agree to receive recurring automated text messages (e.g. appointment reminders, " +
  "service updates, and occasional offers) from Imperion at the mobile number provided. " +
  "Consent is not a condition of purchase. Message frequency varies. Message & data " +
  "rates may apply. Reply STOP to unsubscribe or HELP for help.";

export const EMAIL_CONSENT_TEXT =
  "I agree to receive emails (e.g. updates, newsletters, and occasional offers) from " +
  "Imperion at the email address provided. I can unsubscribe at any time using the link " +
  "in any email.";

/** Standalone support/help line for the SMS program (HELP keyword response). */
export const SMS_HELP_TEXT =
  "For help, reply HELP to any message or email support@imperion.example. " +
  "To stop receiving texts, reply STOP at any time.";

export const PRIVACY_URL = "/story";
export const TERMS_URL = "/story";
