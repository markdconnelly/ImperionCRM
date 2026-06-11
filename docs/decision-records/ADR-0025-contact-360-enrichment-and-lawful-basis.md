# ADR-0025: Contact-360 enrichment dossier & lawful-basis gating

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-07 |
| **Cross-references** | — |

## Problem

Sales wants to know as much as practical about a person **before** the first human
conversation — employer, role, interests, tech stack, social presence — assembled
from M365, public LinkedIn/YouTube, and web sources. Building such a profile on a
person is a real legal/compliance surface (GDPR, CAN-SPAM/TCPA for any follow-up).
We need a rich, agent-consumable dossier **and** a defensible record of *why* we are
allowed to hold and use each fact.

## Context

Builds on the unified timeline (ADR-0011), per-user connections (ADR-0024), and the
append-only consent ledger (ADR-0014). Gold-layer per CLAUDE.md §4 — agents consume
distilled facts, not raw bronze. The company-centric spine (ADR-0010) still holds:
the dossier hangs off the contact, the relationship off the account.

## Options considered

1. EAV dossier where **every fact carries provenance + a lawful basis**, and the
   consent ledger is extended to gate enrichment and ad use (this decision).
2. Wide typed columns on `contact` (rejected — every new attribute is a migration;
   no per-fact provenance/confidence).
3. Provenance only, no lawful-basis gating (rejected — indefensible; chosen against
   by the product owner).

### Tradeoffs

- (1) editable, normalized, one fact = one row with confidence, source, and basis;
  mirrors the existing `engagement_answer` pattern. Cost: value-type handling and a
  consent check on use.
- (2)/(3) cheaper now, but brittle and legally weak.

## Decision

- **`contact_enrichment`** — one row per discovered fact: `attribute_key`,
  `value_text`/`value_json`, `confidence`, `source`, `source_connection_id`, and
  **`lawful_basis`** (`consent | legitimate_interest | contract | public_data`),
  with `observed_at`/`expires_at`. The dossier is the gold profile.
- **`contact_social_identity`** — one contact → many linked platforms.
- Profile header columns on `contact` (`title`, `headline`, `location`, `avatar_url`,
  `lifecycle_status` stranger→known→engaged→customer, `last_enriched_at`).
- **`contact_embedding`** (vector 1536, HNSW) for semantic profile / audience match.
- The **consent ledger (ADR-0014) is extended** with `data_enrichment` and
  `ad_targeting` channels; the `lawful_basis` enum is shared. Outbound sends, and ad
  use (ADR-0026), are blocked unless the relevant consent is current.

Enrichment **execution** (LLM/web scraping, embeddings) runs in external functions
(ADR-0018) later; this scaffold defines the store, contracts, and gates.

## Consequences

### Security impact

Facts are PII; access is audit-logged (ADR-0016). Each fact's `lawful_basis` and
`source` make holding it auditable; `expires_at` supports retention limits. Use is
consent-gated at the point of send/targeting, not just at collection.

### Cost impact

JSONB + a small per-contact vector. Enrichment compute/embeddings accrue when wired.

### Operational impact

Adds migration `0021` (enrichment, social identities, embedding, contact header) and
extends `0019` (consent channels). A `contacts` repository (profile, CRUD, social,
enrichment with required lawful basis) and the extended `consent` repository carry the
contracts; the Contact-360 UI follows.

## Future considerations

Live enrichment agents and confidence calibration; per-jurisdiction basis rules;
contact-facing preference center; embedding generation + audience similarity search;
automatic `expires_at`-driven purge.
