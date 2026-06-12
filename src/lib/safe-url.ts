/**
 * URL-scheme validation for untrusted, integration-sourced links (#191).
 *
 * Rows like `contact_social_identity.profile_url` are written by ingestion/imports
 * (ADR-0025) and must be treated as untrusted external data: rendering them straight
 * into an anchor `href` lets a malicious source record plant `javascript:`/`data:`
 * (or other non-web-scheme) links in the UI. `rel="noopener noreferrer"` does not
 * protect against unsafe schemes — only scheme validation does.
 */

/**
 * Return the URL if it parses as absolute `http:`/`https:`, else `null`.
 * Callers render an anchor only for a non-null result and plain text otherwise.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? url : null;
  } catch {
    return null; // relative or unparseable — not a renderable external link
  }
}
