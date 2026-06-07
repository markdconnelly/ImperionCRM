# ADR-0012: External integration identity map, ingest-vs-poll, and demand gen

- **Status:** Accepted
- **Date:** 2026-06-07

## Problem
Decide how Meridian connects to external clouds to assemble a client's history and
demand-gen data, given the rule "augment, don't duplicate" (CLAUDE.md §1) — notably
that Autotask ticket history must be referenced, not copied.

## Context
Systems: Microsoft 365 (email/Teams), Plaud (call recordings), Facebook (ads/leads),
Autotask (service tickets), IT Glue (assets/docs). Some are sources of truth we must
not duplicate; others are signals we want in the timeline.

## Options considered
1. **Central identity map + per-source ingest/poll policy.**
2. Ingest everything (including Autotask tickets) into Postgres.

## Tradeoffs
- (1) `external_identity` correlates an Account to its IDs across systems; each
  source is classified **ingest** (flows into the `interaction` stream) or **poll**
  (fetched live, cached briefly, never the system of record). Honors §1.
- (2) duplicates authoritative data (stale, sync burden, ownership confusion);
  explicitly rejected for Autotask.

## Decision
Adopt the **identity map + ingest/poll policy.**
- **Ingest** → timeline: M365 email + Teams (background), Plaud calls, Facebook
  lead/ad data.
- **Poll** on demand, not duplicated: Autotask tickets, IT Glue assets/docs.
- `integration_connection` holds per-system config with credentials **referenced
  from Key Vault** (never in the DB or repo); `sync_state` tracks cursors for
  incremental ingest.
- **Demand gen:** `campaign`/`ad`/`campaign_metric` (Facebook, polled metrics) plus
  `attribution` on contacts/opportunities, and agentic web-scrape `enrichment`
  stored as refreshable gold records for lead briefs.

## Security impact
All external credentials live in Azure Key Vault and are referenced by
`integration_connection.keyvault_secret_ref`. Polled data inherits the source
system's authorization; Meridian requests it with least-privilege app credentials.

## Cost impact
API call volume for polling (cache to bound it); Facebook Marketing API usage.

## Operational impact
Per-connection health/backoff; Autotask/IT Glue availability affects live reads —
degrade gracefully (show cached/last-known with a staleness marker).

## Future considerations
Additional ad platforms; bidirectional sync where it genuinely adds value;
webhook-driven ingest to replace polling where supported.
