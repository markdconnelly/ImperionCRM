# ADR-0026: Demand-gen audiences & ad-targeting consent

- **Status:** Accepted
- **Date:** 2026-06-07

## Problem
The business wants to launch ads against the **aggregated enriched profiles** it has
assembled, using the combined knowledge of many contacts to make each campaign more
effective. That means modelling campaigns/ads/metrics (ADR-0012 demand gen) *and* a
new concept — an **audience** built over the dossier — while ensuring we never target
someone who hasn't consented to ad use.

## Context
Builds on demand gen (ADR-0012), the enrichment dossier (ADR-0025), and the consent
ledger (ADR-0014, extended with an `ad_targeting` channel in ADR-0025). Ad-platform
metrics are polled, never the system of record (ADR-0012). Attribution already exists
as `attribution` JSONB on contact/opportunity.

## Options considered
1. `audience` + `audience_member`, with ad eligibility derived from current
   `ad_targeting` consent at launch (this decision).
2. Push raw contact lists to ad platforms with no consent gate (rejected — legally
   indefensible).
3. Materialize "ad-ready" as a stored flag (rejected — duplicates the consent ledger;
   derive it instead).

## Tradeoffs
- (1) audiences are reusable, static or dynamic (criteria over `contact_enrichment`),
  and eligibility is always computed from the live ledger — a member who opts out is
  immediately excluded. Cost: a join to `current_consent` at launch/preview.
- (3) faster reads but stale and divergent from the ledger.

## Decision
- **`campaign` → `ad` → `campaign_metric`** (polled spend/impressions/clicks/leads),
  plus `campaign_id` attribution columns on contact/opportunity.
- **`audience`** (`kind` static|dynamic, `definition` JSONB criteria) and
  **`audience_member`**. "Launch ad against audience" filters members to those with
  **current `ad_targeting` opt-in** (via the `current_consent` view); non-consenting
  members are excluded and surfaced, never silently dropped.
- Actual ad-platform pushes and metric polling run in external functions (ADR-0018);
  this scaffold defines the store, the audience model, and the consent gate.

## Security impact
Targeting is consent-gated at launch, reading the live ledger. Audience definitions
operate over PII facts (ADR-0025) and inherit its access controls/audit. No ad-platform
credentials in the DB — Key Vault only (ADR-0012).

## Cost impact
Storage for campaigns/metrics/audiences; ad spend and Marketing-API volume accrue when
live pushes are wired (out of scope here).

## Operational impact
Adds migration `0023` (campaigns/ads/metrics/audiences + attribution FKs). A
`campaigns` repository (campaigns/ads/metrics + audiences, `previewAudienceMembers`,
consent-gated `launchAudience`) carries the contracts; the Campaigns/Audiences UI
follows. Honor opt-out immediately by deriving eligibility, never caching it.

## Future considerations
Dynamic-audience evaluation engine over enrichment criteria + embeddings; live
platform sync (custom audiences); multi-platform attribution; lookalike modelling on
`contact_embedding`; suppression lists.
