/**
 * Shared GDAP admin-consent constants (ADR-0036). Kept out of the Settings
 * `"use server"` actions module because those files may only export async functions.
 */

/** Cookie that proves a GDAP admin-consent flow was started from this app (CSRF guard). */
export const GDAP_CONSENT_COOKIE = "gdap_consent_pending";
