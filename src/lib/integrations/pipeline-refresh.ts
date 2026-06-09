/**
 * Company-provider key → cloud-pipeline refresh source (pipeline ADR-0011).
 *
 * Scheduled bulk ingestion runs on the on-prem pipeline; the cloud pipeline's
 * `POST /api/refresh` serves targeted "fresh data NOW" requests from the Settings cards.
 * Providers without a mapping (myitprocess, quotemanager) have no on-demand sync yet,
 * so their cards render no Refresh button.
 */
export type RefreshSource = "autotask" | "itglue" | "apollo" | "darkwebid" | "televy" | "m365";

export const REFRESH_SOURCES: Record<string, RefreshSource> = {
  autotask: "autotask",
  itglue: "itglue",
  darkwebid: "darkwebid",
  televy: "televy",
  gdap: "m365",
};
