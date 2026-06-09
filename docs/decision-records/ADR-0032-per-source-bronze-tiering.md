# ADR-0032: Per-source bronze tables for contacts and companies

- **Status:** Superseded by [ADR-0039](./ADR-0039-per-source-bronze-tables.md)
- **Date:** 2026-06-08

> **Superseded:** the single enum-discriminated `contact_source`/`account_source` described here
> were replaced by one physical bronze table per (source, entity) + a `device` entity in ADR-0039
> (migrations 0036/0037).

## Problem
A contact or company is assembled from several source systems (Imperion CRM-entered
data, Apollo, M365, Autotask, IT Glue). We need to retain each source's **raw** record,
normalize it, and merge it into a single silver record — without losing provenance or
letting one source clobber another.

## Context
CLAUDE.md §4 mandates a bronze → silver → gold pipeline. The codebase already applies
inline bronze/silver/gold columns to `interaction`, `assessment_artifact`, `ticket`,
and `lead_capture_event`. The silver records here are the existing `contact` and
`account` tables; `external_identity` (ADR-0012) is the cross-system identity
crosswalk. The enrichment/ingestion engine is deliberately deferred (a later priority).

## Options considered
1. Per-source bronze landing tables (`contact_source`, `account_source`) carrying
   bronze/silver/gold + match metadata, merged into the silver `contact`/`account`
   (this decision).
2. Inline bronze columns on `contact`/`account` (rejected — a silver record has MANY
   sources; inline columns can hold only one and lose per-source provenance).
3. Store raw payloads only in object storage (rejected — not queryable; no SQL merge,
   dedupe, or confidence tracking).

## Tradeoffs
- (1) one row per source per entity, each with `payload_bronze`/`normalized_silver`/
  `summary_gold`, `external_ref` (unique per source), and `matched_at`/
  `match_confidence`. Clean provenance; deterministic merge. Cost: a normalization job
  (deferred) and a second grain to reason about.
- (2)/(3) simpler now but lossy.

## Decision
- Migration **`0032`** adds `contact_source`
  (sources: imperion_crm_entered, apollo, m365_synced, autotask, itglue) and
  `account_source` (imperion_crm_entered, apollo, autotask, itglue). Each row FKs the
  resolved silver record (null until matched), carries bronze/silver/gold columns,
  `external_ref` with `UNIQUE(source, external_ref)`, and match metadata.
- A future normalization job projects `normalized_silver`, deterministically matches
  each source row to a `contact`/`account` (email / company domain), upserts silver,
  and stamps `matched_at`/`match_confidence`. **Apollo writes both tables.**
- Relationship to `external_identity`: that table is the identity crosswalk (our id ↔
  external id); `*_source.external_ref` is the raw-row grain.

## Security impact
Bronze payloads may contain PII; access is audit-logged (ADR-0016) and the same
consent/lawful-basis gates (ADR-0014/0025) apply when silver facts are used.

## Cost impact
JSONB storage proportional to source volume; no compute until ingestion is wired.

## Operational impact
Migration `0032` creates the tables. Ingestion connectors and the merge job belong to
the back-end repo (ADR-0028) and are tracked in
`docs/integrations/frontend-driven-backend-requirements.md`.

## Future considerations
Embeddings/gold over merged records; survivorship rules for conflicting fields;
per-source freshness and retention; surfacing "sources" on the Contact/Company 360.
