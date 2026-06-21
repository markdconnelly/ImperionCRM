---
adr: 0108
title: "LinkedIn integration — identity, outbound share, ad-library intel"
status: proposed
date: 2026-06-21
repo: frontend
summary: "Wire LinkedIn into the agentic OS by reusing existing structure, not building a LinkedIn silo: the connected member's OIDC profile lands in external_identity + contact_social_identity (provider/platform='linkedin'); posts/comms ride the unified interaction timeline (source='linkedin'); a 'Share on LinkedIn' outbound action plugs into the ADR-0107 action plane (catalog action + grant + autonomy dial, mark_gated); our own paid ads reuse campaign/ad. The ONLY net-new silver entity is ad_library_record (public Ad Library competitive intel). Scope is disciplined to what LinkedIn actually grants today — OIDC own-profile, w_member_social outbound-only, Ad Library read — with inbound feed / org analytics / people-search parked on partner-tier approval. Token lifecycle is ~60-day with no refresh token, so the connection needs an expiry surface, not silent death."
tags: [integration, marketing, agents]
---

# ADR-0108: LinkedIn integration — identity, outbound share, ad-library intel

> **Number is a placeholder.** ADR-0108 is claimed at MERGE per system CLAUDE.md §10.3 —
> the branch that merges second renumbers. Any migration this epic authors (the
> `ad_library_record` bronze+silver) is authored against a placeholder number likewise and
> renumbered at merge.

| Field | Value |
|---|---|
| **Repo** | frontend (schema + this ADR + OKF); Pipeline/LocalPipeline = collectors+merge; Backend = outbound action |
| **Status** | Proposed |
| **Date** | 2026-06-21 |
| **Epic** | #1007 (slices S1 #1008 · S2 #1009 · S3 #1010 · S4 #1011) |
| **Cross-references** | ADR-0042 (four-repo split + bronze envelope), ADR-0103 (connection credential registry), ADR-0107 (governed action/tool-grant plane), ADR-0087 (orchestration matrix + autonomy dial), ADR-0086 (OKF semantic layer), LP ADR-0026 (merge co-locates with ingestion), migration 0020 (`connection`, `external_identity`), 0021 (`contact_social_identity`), 0023 (`campaign`/`ad`/`campaign_metric`), 0075 (Meta bronze precedent) |

## Problem

The personal LinkedIn connection is **live** — OIDC token custodied in Key Vault, `/v2/userinfo`
verified 2026-06-21. The goal is to interact with LinkedIn as much as the granted products allow
and to build the tables + intelligence to do it inside the agentic OS. The open question is
**shape, not feasibility**: do we model a LinkedIn-specific silo (a parallel set of `linkedin_*`
silver tables and a bespoke action path), or fold LinkedIn into the structures the platform
already has for social comms, external identity, campaigns, and governed actions?

Two hard external constraints bound the answer, and the design must encode them so expectations
don't outrun what the API delivers:

1. **Granted products are narrow.** A standard app gets **Sign In with LinkedIn (OIDC)** →
   the connected member's *own* profile only (`sub`, name, email, picture, locale); **Share on
   LinkedIn** (`w_member_social`) → **outbound posting only**, no inbound feed read; **Ad
   Library** → read public ad records. Richer surfaces (inbound member feed, organization-page
   posts/analytics, people-search, arbitrary-profile enrichment) require **Marketing Developer
   Platform / Talent / Community-Management partner approval** — a business gate, not a code task.
2. **The OIDC token is ~60-day with no refresh token** (the stored secret is
   `{accessToken, expiresAt, scope, tokenType, obtainedAt}`; refresh tokens need separate
   approval). The connection will expire and must be re-authed, so it needs a visible expiry +
   re-auth prompt rather than a silent death.

## Context

- **The unified interaction timeline already spans channels** (migration 0018; Meta lands here via
  0075). `interaction.source` is an enum that already includes `linkedin`; FB/IG posts, DMs, and
  comments are rows with `source='facebook'|'instagram'`. LinkedIn comms are the same shape.
- **External identity is already modeled twice and both know LinkedIn** — `external_identity`
  (provider enum includes `linkedin`; correlates account/contact → external id, ADR-0012) and
  `contact_social_identity` (platform free-text incl. `linkedin`; handle/profile_url/external_id,
  ADR-0025). Personal data attaches with a lawful-basis stamp via the `contact_enrichment` EAV
  path (the existing `new-contact` guardrail).
- **Connections + KV are settled** (ADR-0103): a `connection` row carries
  `keyvault_secret_ref`; collectors resolve the token from Key Vault at invoke time via the
  user-assigned managed identity. The LinkedIn user connection already exists and is `active`.
- **The action plane exists** (ADR-0107): a deny-by-default `agent_tool_grant`, a typed
  action-contract catalog, the `agent/actions/execute` human-gated executor, and the 1–5 autonomy
  dial on `autopilot_policies`. An outbound LinkedIn post is a *catalog action*, not a new endpoint.
- **Marketing already has campaign structure** (0023): `campaign`/`ad`/`campaign_metric` with a
  `platform` enum — our *own* LinkedIn paid ads belong here, not in a new table.
- **Merge co-locates with ingestion** (LP ADR-0026): whichever plane ingests a source's bronze
  owns its bronze→silver merge. Low-volume/on-demand → cloud Pipeline; scheduled bulk → LocalPipeline.
- **Meta (0075) is the working precedent** for a social source end-to-end (bronze envelope →
  merge → silver interaction/identity/metric), so LinkedIn follows a proven path.

## Options considered

1. **LinkedIn silo** — new `linkedin_post`, `linkedin_profile`, `linkedin_message` silver tables and
   a bespoke send path.
2. **Reuse + one net-new** — LinkedIn rides `interaction`/`external_identity`/`contact_social_identity`/
   `campaign`; outbound posting rides the ADR-0107 action plane; the single genuinely-new entity is
   `ad_library_record` for the public Ad Library. (Chosen.)

### Tradeoffs

| Option | Pro | Con |
|---|---|---|
| 1 Silo | self-contained per-source tables | duplicates the unified timeline + identity model; agents must learn N per-channel shapes; a second send path outside the governed action plane; drifts from OKF archetypes; more schema, more merge code |
| 2 Reuse + one new | one timeline + one identity model reasoned over uniformly; outbound is governed/audited by the existing plane (least-privilege, autonomy-gated) for free; only one migration; matches the Meta precedent and OKF conventions | requires care that LinkedIn's narrow scope maps cleanly onto general tables (handled by `source`/`provider` discriminators) |

## Decision

Adopt **Option 2 — reuse, don't silo** — and encode the granted-scope constraints as first-class.
Six decisions across slices S1–S4 of epic #1007. This ADR slice ships **docs only** (no code, no
migration applied), the ADR-0107 / access-spine slice-1 precedent.

### D1 — Identity reuses the existing tables (S1 #1008)
The connected member's OIDC profile (`/v2/userinfo`) is ingested by a **cloud-Pipeline** collector
(live/on-demand — low volume), landed in a thin bronze (`linkedin_profile`, ADR-0042 envelope), and
merged into **`external_identity`** (`provider='linkedin'`, `external_id`=`sub`/member URN, metadata
= name/picture/locale) and **`contact_social_identity`** (`platform='linkedin'`, `profile_url`,
`external_id`) for the owning `app_user`'s contact, with the personal fields stamped through the
existing lawful-basis enrichment path. **No new tables.** Scope reality: own profile only — no
people-search, no arbitrary-profile enrichment.

### D2 — Comms ride the unified interaction timeline (S1/S2)
LinkedIn posts/comments/DMs are `interaction` rows with `source='linkedin'` and the existing `kind`
vocabulary (`social_post`/`social_comment`/`dm`), keyed by `(source, external_ref)`. Because
`w_member_social` is outbound-only, the inbound feed is **not** populated today; the rows that exist
are the **posts we publish** (logged by D3). Inbound feed lands here unchanged once S4 unlocks it.

### D3 — Outbound "Share on LinkedIn" is a governed action, not a new path (S2 #1009)
Publishing a LinkedIn post is a **catalog action on the ADR-0107 plane**, not a bespoke endpoint:
- an `imperion-skills:linkedin-share` skill reads the `connection` (linkedin) → KV token → LinkedIn
  Posts API and returns `{postId, url}`;
- a typed action `kind:'send_linkedin'` (channel `linkedin`) is added to the action catalog; the
  existing human-gated `agent/actions/execute` executor invokes the skill and logs the result to
  `interaction` (source=linkedin, direction=outbound) + `audit_log`;
- seed rows wire it into governance: `source_skill(provider='linkedin')`, an `agent_tool_grant` for
  the social agent, and an `agent_autopilot_policy` with **`mark_gated=true`, rung ≤ L2** —
  publishing publicly is customer-facing, so it **never** auto-executes without Mark and routes to
  the native approval cockpit above the ceiling.
- The standing **no-live-sends-until-Mark-opens-the-test-stage** rule applies: S2 ships the action
  draft/disabled (propose-only) until Mark opens it.

### D4 — Ad Library is the one net-new entity (S3 #1010)
The public **LinkedIn Ad Library** (competitor/market intel) has no home today, so it gets a new
bronze `linkedin_ad_library` (ADR-0042 envelope) + a new silver **`ad_library_record`**
(advertiser, creative jsonb, country, run-date + impression/spend ranges, `external_ref`),
**OKF archetype B** (single-source-of-record), Marketing domain, **PII-free** (public ad metadata
only). Its concept file + `coverage-matrix.md` row land in the same migration PR (§11). The
collector is **scheduled bulk → LocalPipeline**, which therefore owns the bronze→silver merge
(LP ADR-0026). This is explicitly distinct from our **own** paid LinkedIn ads, which reuse
`campaign`/`ad`/`campaign_metric` with `platform='linkedin'`.

### D5 — Token lifecycle is surfaced, not assumed (cross-slice)
The OIDC token is ~60-day with no refresh token. `connection.status` reflects expiry
(`expired` when `expiresAt` passes), the connection card shows the expiry + a re-auth prompt, and
collectors fail soft (mark `expired`, don't crash) when the token is dead. Re-auth is the existing
personal-OAuth reconnect flow.

### D6 — Build only to granted scope; park partner-tier (S4 #1011)
Only the three granted products are built (D1–D4). Inbound member feed, organization-page
posts/analytics, and people-search are **blocked on partner-tier approval** and tracked as S4; when
approval lands they decompose into ingest slices that reuse `interaction` / `social_metric` /
`external_identity` exactly like the Meta precedent — no new architecture, just newly-granted scope.

## Consequences

### Security impact
- **Outbound posting is governed by default.** Publishing rides the ADR-0107 deny-by-default plane:
  least-privilege grant, tier ceiling, `mark_gated`, human approval, audit — a public post can't be
  emitted by a mis-routed/injected agent without a grant and (for customer-facing tiers) a human.
- **Personal data stays lawful-basis-stamped.** Profile fields enter via the existing
  `contact_enrichment` path (lawful basis recorded), and the OKF Ad Library entity is **PII-free**.
- **No secrets in schema, ADR, skill, or grants** — the literal rule: **Never commit secrets**. The
  token stays in Key Vault, referenced by name (ADR-0103).
- **Expiry is a visible state, not a silent failure** — a dead token surfaces as `expired`, not as
  mysterious empty data.

### Cost impact
- Negligible. Identity fetch is one userinfo call on demand; Ad Library is a scheduled read; outbound
  posting is event-driven. No new vendor, no model calls added by the plumbing.

### Operational impact
- **One** new migration (the `ad_library_record` bronze+silver), Mark-gated prod apply like every
  migration; everything else is rows/config on existing tables.
- OKF: one new concept file + one coverage-matrix row (S3), timestamp touches on
  `contact_social_identity`/`external_identity`/`interaction` concept files if their notes change
  (§11, docs-gate enforced).
- Sibling issues per slice (Pipeline collector for S1, LocalPipeline Ad-Library collector for S3,
  Backend action for S2) per the cross-repo decomposition rule.

## Future considerations
- **Partner-tier unlock (S4)** turns on inbound feed + org analytics + people-search — all of which
  land in the *existing* tables, proving the reuse thesis.
- **Outbound media + rich posts** (documents, polls) extend the `linkedin-share` skill, not the schema.
- **Ad Library → competitive-intel agent room** (OKF): once `ad_library_record` is vectorized into
  gold, an agent can reason over competitor ad activity alongside our own campaign metrics.
- **Capability honesty in the GUI** — the connector surface should show *which* LinkedIn products are
  granted vs pending, so operators see why inbound is empty until S4.
