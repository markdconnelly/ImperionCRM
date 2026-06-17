---
adr: 0038
title: "Per-connection poll cadence"
status: accepted
date: 2026-06-08
repo: frontend
summary: "`connection.poll_interval_minutes` (0 = manual/paused) with an auto-saving cadence selector per connection card."
tags: [medallion]
---
# ADR-0038: Per-connection poll cadence

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-08 |
| **Cross-references** | — |

## Problem

The ingestion pipeline polls each connection (personal and company) for new data,
but how often was implicit and uniform — there was no operator control over polling
frequency per connection. Different sources warrant different cadences: an Autotask
ticket feed may want every 15–30 minutes, a daily enrichment source once a day, and a
flaky or quota-limited source should be pausable without disconnecting it. Operators
needed a UI to tune this, and the pipeline needed a value to read.

## Context

`connection` (ADR-0012/0024/0036) already models user- and company-scope connections
and is the single source of truth for the schema (CLAUDE.md §7); the
`ImperionCRM_Pipeline` repo is a consumer. The integration UI lives under **Settings →
Your connections / Company credentials** (ADR-0036). "Ingest vs poll" is described in
`docs/integrations/README.md`. No secret or token is involved in a cadence setting.

## Options considered

1. **Per-connection column + UI selector**, stored as minutes on the `connection` row;
   the pipeline reads it.
2. **Global polling interval** in app config / env, one value for all connections.
3. **Cron-style expression per connection** for arbitrary schedules.

### Tradeoffs

- (1) gives operators per-source control with a tiny additive schema change and a
  preset dropdown; the pipeline reads one integer. Matches the existing connection model.
- (2) is simplest but can't reflect that sources differ; one noisy source forces the
  whole fleet to its cadence.
- (3) is the most flexible but overkill for v1 and a worse UX (free-text cron); a small
  set of presets covers the real cases and can be widened later.

## Decision

- Add `connection.poll_interval_minutes integer NOT NULL DEFAULT 60` with a
  `>= 0` check constraint (migration `0035`). **`0` = manual / paused** (no automatic
  polling). The frontend persists the operator's choice; the pipeline consumes it.
- Surface a **poll-frequency selector** on each connection card (personal) and each
  configured company-credential card — presets Manual / 15 min / 30 min / hourly /
  6 h / 12 h / daily. It **auto-saves on change** via the `setPollIntervalAction`
  server action (no separate save button); a non-preset stored value is shown as an
  extra option rather than snapped to a preset.
- Carried on `ConnectionRow.pollIntervalMinutes` through the typed repositories
  (`setPollInterval(id, minutes)` on both the Postgres and mock implementations).

## Consequences

### Security impact

None. The value is a non-secret integer cadence; no token or credential is read or
written. The input is clamped non-negative server-side. Setting is gated by the
existing admin-only Settings route (company) / the signed-in employee's own
connections (personal).

### Cost impact

A shorter cadence means more frequent pipeline runs and more external API calls
(possible rate-limit / cost pressure on the source). The default of hourly is
conservative; `0` (manual) lets an operator stop polling a source entirely.

### Operational impact

Migration `0035` must be applied to prod as a deploy step (0001–0034 already applied).
The column is additive with a default, so existing rows poll hourly until changed. The
pipeline must read `poll_interval_minutes` and honour `0` as paused — tracked in the
pipeline repo; until then the value is recorded but not yet acted on.

## Future considerations

Surface the next scheduled poll / last poll outcome on the card once the pipeline acts
on the value; consider per-source minimum-cadence guards to protect rate-limited APIs,
and a global pause switch for maintenance windows.
