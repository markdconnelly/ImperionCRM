/**
 * Company-provider key → cloud-pipeline refresh source (pipeline ADR-0011).
 *
 * Scheduled bulk ingestion runs on the on-prem pipeline; the cloud pipeline's
 * `POST /api/refresh` serves targeted "fresh data NOW" requests from the Settings cards.
 * Providers without a mapping (myitprocess, quotemanager) have no on-demand sync yet,
 * so their cards render no Refresh button.
 *
 * `RefreshSource` is the full `POST /api/refresh` contract: the provider sources the
 * Settings cards can trigger via `REFRESH_SOURCES`, plus the `merge` sweep that manual
 * edits fire directly (pipeline ADR-0012) and the account-scoped `posture`
 * re-classification (pipeline ADR-0015) — neither is a provider and neither may
 * appear in the map.
 */
export type RefreshSource =
  | "autotask"
  | "itglue"
  | "apollo"
  | "darkwebid"
  | "televy"
  | "m365"
  | "merge" // bronze→silver merge sweep (pipeline ADR-0012) — not a provider, so never in REFRESH_SOURCES
  | "posture" // account-scoped posture re-classification (ADR-0051 §2, pipeline ADR-0015) — requires accountId, never in REFRESH_SOURCES
  | "posture_snapshot"; // account-scoped immutable Imperion Secure Score snapshot (ADR-0051 §5, pipeline #38) — requires accountId (+ trigger), never in REFRESH_SOURCES

export const REFRESH_SOURCES: Record<string, RefreshSource> = {
  autotask: "autotask",
  itglue: "itglue",
  darkwebid: "darkwebid",
  televy: "televy",
  gdap: "m365",
};
