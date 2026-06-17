---
adr: 0035
title: "Apollo as the global contact & company enrichment provider"
status: accepted
date: 2026-06-08
repo: frontend
summary: "Apollo joins the provider enum as a company-scope connection and becomes the global enrichment source."
tags: [gtm]
---
# ADR-0035: Apollo as the global contact & company enrichment provider

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-08 |
| **Cross-references** | — |

> **Note:** references to `contact_source`/`account_source` below are pre-ADR-0039; Apollo now
> lands in the per-source tables `apollo_contacts`/`apollo_companies` (ADR-0039).

## Problem

Leads need automatic enrichment, and capturing a lead should also create and enrich a
**company** object. The business chose Apollo as the global enrichment service for both
contacts and companies.

## Context

External connections are modelled in `connection` (per-user or company scope), with
OAuth tokens held only in Key Vault (ADR-0024). Per-source bronze tables
(`contact_source`, `account_source`) already include an `apollo` source (ADR-0032). The
enrichment *pipeline* is explicitly a later priority; this decision only registers the
provider so the GUI and schema can reference it.

## Options considered

1. Register Apollo as a **company-wide** connection provider and an enrichment source
   for both contact and company bronze tables; defer the ingestion pipeline
   (this decision).
2. Per-user Apollo connections (rejected — enrichment is an org capability, not a
   personal mailbox; one billing/account).
3. Hard-code Apollo calls in the app (rejected — violates the GUI-only front end with
   external functions, ADR-0018; no token isolation).

### Tradeoffs

- (1) consistent with the existing connection/Key-Vault model; Apollo data lands in the
  same bronze→silver→gold pipeline as every other source. Cost: an enum value and a
  seeded connection now; the connector later.
- (2)/(3) misaligned with the architecture.

## Decision

- Migration **`0031`** adds `apollo` to the `connection_provider` enum and seeds a
  company-scope Apollo connection (two transactions in one file because a new enum
  label cannot be used in the transaction that adds it). The Integrations UI surfaces
  Apollo as a company system.
- Apollo is an enrichment source in `contact_source` and `account_source` (ADR-0032);
  the lead → company-creation → Apollo-enrich **pipeline** is deferred and tracked in
  `docs/integrations/frontend-driven-backend-requirements.md`.

## Consequences

### Security impact

Apollo's API key/token lives only in Key Vault, referenced by `keyvault_secret_ref`
(CLAUDE.md §5) — never in the DB or repo. Enrichment writes are PII and carry a lawful
basis (ADR-0025) when promoted to silver facts.

### Cost impact

Apollo is a paid third-party data service; spend accrues when the connector runs. No
in-app cost now.

### Operational impact

Migration `0031`. The connector (rate limits, mapping Apollo fields → silver, company
matching by domain) is back-end work. Apollo is a data service, not an identity
provider, so it does not conflict with the Entra-only IdP rule (CLAUDE.md §2.3).

## Future considerations

Company creation from a captured lead; domain-based company matching/dedupe;
enrichment scheduling and freshness; confidence calibration of Apollo facts.
