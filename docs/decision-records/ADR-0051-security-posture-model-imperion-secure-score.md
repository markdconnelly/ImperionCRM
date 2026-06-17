---
adr: 0051
title: "Security posture model — tenant mapping, posture silver, and the Imperion Secure Score"
status: accepted
date: 2026-06-10
repo: frontend
summary: "Explicit admin-managed tenant mapping, pipeline-maintained posture silver, and a versioned pillar-based Imperion Secure Score snapshotted immutably per account."
tags: [security-posture]
---
# ADR-0051: Security posture model — tenant mapping, posture silver, and the Imperion Secure Score

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted (2026-06-10, decisions locked with Mark in design session for issue #86) |
| **Date** | 2026-06-10 |
| **Cross-references** | — |

## Context

**Context and decision**

Posture bronze (secure scores, five policy families + golden baselines, exposures) is keyed by Microsoft tenant GUID, but the app navigates by account, and no tenant→account link existed. We also want client-facing quarterly benchmarking across *all* security tooling (M365, network, vulnerability scanning, phishing, dark web), not just Microsoft's number.

We decided: an explicit admin-managed tenant mapping; pipeline-maintained silver posture tables (not views); a versioned, pillar-based composite score (**Imperion Secure Score**) snapshotted immutably per account; and per-device truth only from Intune device compliance — never proxied from tenant level. Vocabulary is defined in `CONTEXT.md` (Customer Tenant, Tenant Mapping, Imperion Secure Score, Posture Pillar, Posture Snapshot, Score Model, Golden State, Device Compliance).

## Decision

1. **Tenant Mapping is explicit.** `account_tenant` maps tenant GUID → account; tenant is the PK (one account per tenant; an account may own several tenants). Managed by admins in Settings; never inferred from domains (rejected: the credential_exposure-style domain match — silent mismatches on posture are unacceptable). Tenants present in posture bronze with no mapping surface in an "unmapped tenants" admin list rather than disappearing.

2. **Bronze is raw, silver is curated, and refresh is two-tier (system-wide principle).** Bronze tables hold the source system's data unreduced. Silver holds the normalized, GUI-shaped read model. The **on-prem pipeline owns scheduled bulk merges** (loop all tenants/records on a cadence; it has the resources). The **cloud pipeline owns narrow on-demand refreshes** (single record/account, e.g. after a GUI edit or a "refresh now" click; it shares an App Service plan, so overhead stays minimal). Objects with a single data feed (email, Teams messages, Plaud conversations) skip the merge layer. The two implementations are deliberately scope-asymmetric but MUST implement the same classification rules — keep the classification in one shared SQL expression both invoke wherever practical.

3. **Policy classification** (per tenant + family + policy): `compliant` (observed content_hash = golden_hash), `drift` (both exist, hashes differ), `ungoverned` (observed, no golden), `missing` (golden, not observed) — the FULL OUTER JOIN semantics of `Get-ImperionPolicyDrift`, now canonical in silver.

4. **The Imperion Secure Score is a versioned, pillar-based composite per account.** Pillars: `m365_secure_score`, `policy_compliance`, `network`, `vulnerability`, `phishing`, `darkweb`. A pillar enters the **Score Model** (versioned: pillar set + weights) only once Imperion can deliver that tooling; within a model version, an account with no data for a pillar scores **0** — no coverage is not "fine" (rejected: averaging only covered pillars, which lets an M365-only customer outscore a fully-covered one and reads "we can't see it" as "it's fine"). Reports render uncovered pillars as **"No coverage"** (grey), never as failure (red). Composite trend charts compare only within one model version; pillar trends span versions, so onboarding a new tool fleet-wide never reads as fleet-wide slippage.

5. **Posture Snapshots are immutable, per account.** Taken by the on-prem quarterly job (calendar quarters), on demand, and automatically when a Business Review is created (every QBR carries a fresh posture record). The snapshot stores composite, **stored letter grade**, model version, and one row per pillar (normalized score, weight, covered flag, report-ready headline metrics). Grades/composites are never recomputed after capture — formula changes only affect future snapshots. M365-keyed pillars aggregate the account's mapped tenants; other pillars key off their own feeds.

6. **Device-level posture comes only from Intune Device Compliance.** A new on-prem bulk feed lands Intune `managedDevices` in bronze **per device, unreduced**; the device page shows that device's compliance; the account page shows the tenant-level overview. Until the feed lands, device pages show no per-device indicator (rejected: tenant-proxy — a green dot on a non-reporting laptop is worse than no dot).

**Score Model v1**

- Pillars and weights: `m365_secure_score`, `policy_compliance`, `darkweb` — equal weight. (`network`, `vulnerability`, `phishing` join in later model versions when UniFi / Kaseya vulnerability / phishing-campaign feeds exist.)
- Normalization: m365_secure_score = licensed-user-weighted mean of `current/max × 100` across the account's mapped tenants; policy_compliance = `compliant / (compliant + drift + ungoverned + missing) × 100` across all families and mapped tenants; darkweb = `max(0, 100 − 10 × open exposures)`.
- Grade bands: A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, else F.

**Table specifications (migration 0058+, verify next number on disk)**

```sql
account_tenant (
  tenant_id     text PRIMARY KEY,                 -- Microsoft tenant GUID
  account_id    uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  display_name  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

posture_policy (                                  -- current state, replaced on each merge
  tenant_id      text NOT NULL,
  policy_family  text NOT NULL CHECK (policy_family IN
    ('conditional_access','intune_security','device_configuration','autopilot','defender_xdr')),
  policy_id      text NOT NULL,
  policy_name    text,
  classification text NOT NULL CHECK (classification IN ('compliant','drift','ungoverned','missing')),
  observed_hash  text,
  golden_hash    text,
  observed_modified_at timestamptz,
  golden_approved_at   timestamptz,
  refreshed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, policy_family, policy_id)
);

tenant_posture (                                  -- current rollup, one row per tenant
  tenant_id            text PRIMARY KEY,
  secure_score_current numeric,
  secure_score_max     numeric,
  licensed_user_count  integer,
  active_user_count    integer,
  policies_compliant   integer NOT NULL DEFAULT 0,
  policies_drift       integer NOT NULL DEFAULT 0,
  policies_ungoverned  integer NOT NULL DEFAULT 0,
  policies_missing     integer NOT NULL DEFAULT 0,
  exposures_open       integer NOT NULL DEFAULT 0,
  refreshed_at         timestamptz NOT NULL DEFAULT now()
);

posture_snapshot (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  taken_at            timestamptz NOT NULL DEFAULT now(),
  trigger             text NOT NULL CHECK (trigger IN ('scheduled','on_demand','business_review')),
  business_review_id  uuid,                       -- FK to the business-review table; implementer confirms table name
  score_model_version integer NOT NULL,
  composite_score     numeric NOT NULL,
  grade               text NOT NULL,
  UNIQUE (account_id, taken_at)
);

posture_snapshot_pillar (
  snapshot_id uuid NOT NULL REFERENCES posture_snapshot(id) ON DELETE CASCADE,
  pillar      text NOT NULL CHECK (pillar IN
    ('m365_secure_score','policy_compliance','network','vulnerability','phishing','darkweb')),
  covered     boolean NOT NULL,
  score       numeric NOT NULL,                   -- 0–100; 0 when covered = false
  weight      numeric NOT NULL,
  metrics     jsonb NOT NULL DEFAULT '{}'::jsonb, -- report-ready headline metrics for the quarterly report
  PRIMARY KEY (snapshot_id, pillar)
);
```

Grants: on-prem pipeline role writes posture_policy / tenant_posture / posture_snapshot(_pillar); cloud pipeline MI gets the same writes for on-demand refresh; web MI reads all + writes account_tenant (admin Settings surface).

## Consequences

- Issues #93 (posture overview page) and #94 (roll-ups) unblock against this silver; the per-device half of #94 additionally depends on the new Intune managedDevices feed (local-pipeline issue).
- The on-prem repo gains a posture merge + quarterly snapshot job; the cloud pipeline gains a single-account posture refresh in its on-demand path.
- Business Review creation gains a snapshot side-effect.
- Adding a pillar = new Score Model version + ADR note, never a rewrite of history.

## Addendum (#259, 2026-06-14): information-protection surface — sensitivity labels + custom security attributes

Mark's per-source review (2026-06-12) asked for **M365 sensitivity labels** and **Entra custom
security attributes** surfaced on the company posture page — *concisely*, and with the custom
attributes **benchmarked against the MSP standard set** (the golden-baseline pattern of §3, the
same shape as the secure-score control golden list).

- **Read surface only (this PR, #259).** `src/lib/security/sensitivity-csa.ts` joins two future
  bronze feeds — `m365_sensitivity_labels` and `entra_custom_security_attributes` — through
  `account_tenant` (the same ADR-0051 tenant scoping every posture read uses) and routes through
  the optional-enrichment seam (#301/#302): a not-yet-migrated table → **empty result, not a
  blanked page**. This reader does **not** go through the shared repository barrel; it is a
  self-contained server-only read keyed off `getPool()`, so it adds nothing to the data-layer
  interface.
- **Benchmark.** `benchmarkCustomAttributes()` is a pure function comparing observed attribute
  definitions (by name, case-insensitive, set-agnostic) against the MSP standard set
  `STANDARD_CSA_SET` (`DataClassification`, `OwnerTeam`, `Environment`, `Confidentiality`) — a
  small, slow-moving policy constant held in code, not the DB. It yields present/missing + a 0–1
  coverage fraction, surfaced as a single "% of standard" read with present/absent chips.
- **Concise card.** `SensitivityCsaCard` renders active label names as inline chips and the
  benchmark as standard-attribute chips — no exhaustive per-tenant table. It lives in the
  tenants-mapped branch of the posture page, below the secure-score controls.
- **Bronze ownership.** The two bronze tables follow the 0080 DNS-posture envelope (flat text
  columns, `tenant_id/source/external_id/collected_at/raw_payload/content_hash`, PK). Their
  **migration is NOT authored here** — the on-prem collector lane (LocalPipeline #141) owns the
  DDL + the collector; the front-end migration to land that bronze is tracked by follow-up
  issue #575. Until both land, every account renders the honest "absent" state. No silver entity
  shape/authority/join changes, so the semantic-layer gate is not engaged.
