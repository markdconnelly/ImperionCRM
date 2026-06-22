---
adr: 0112
title: "Client Mapping — one unified, admin-curated per-connector account identity surface"
status: proposed
date: 2026-06-21
repo: frontend
summary: "Client Mapping is the explicit admin-curated link from a connector's external unit (company / tenant / site / domain) to an account. It generalizes the M365-only Tenant Mapping (ADR-0051) into one reusable surface across every per-client connector, backed by two stores: entity_xref (orgs/tenants/sites; backend-written per migration 0160 — web is SELECT-only) and account_domain (domains; GUI-written). Three connector shapes (fan-out / per-client-credential / domain-keyed); per-client connectors get an Edit-client-mappings button, system/company connectors do not. Suggestions + one-click Accept + manual override, every curated link match_method='manual'. account_tenant is backfilled into entity_xref (migration 0165) and kept readable during a deferred cutover, not dropped."
tags: [data, integrations, security, identity]
---

# ADR-0112: Client Mapping — one unified, admin-curated per-connector account identity surface

> **Number is a placeholder.** ADR-0112 is claimed at MERGE per system CLAUDE.md §10.3 — the
> branch that merges second renumbers. The companion migration
> `0165_client_mapping_account_tenant_to_entity_xref.sql` is likewise a placeholder number.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-21 |
| **Amends** | ADR-0051 (Tenant Mapping — now the M365 instance of Client Mapping) |
| **Cross-references** | ADR-0042 (four-repo split / schema ownership) · ADR-0103 (connection credential registry) · migration 0160 / epic #1049 / #1054 (entity_xref identity spine) · migration 0061 / ADR-0051 (account_tenant / Tenant Mapping) · backend ADR-0035 (Easy Auth + caller allowlist) · epic #1141 (this ADR = unit C) · ImperionCRM_Backend#295 (unit D write path) · #1143 (unit E page) · #1144 (unit F adapters) · Pax8 epic #1042 |

## Problem

Linking an external connector's records to the right internal `account` is curation that exists
today in exactly one place — `account_tenant` (migration 0061, "Tenant Mapping", ADR-0051), and
only for Microsoft 365 (tenant GUID → account). Every other per-client connector (Autotask,
IT Glue, Pax8, My IT Process, KQM/QuoteManager, Telivy, UniFi, Dark Web ID) has the **same**
problem — its companies/sites/domains must resolve to an `account` — but no shared surface to
curate it, and no single store an autonomous agent can trust. Meanwhile the identity spine
`entity_xref` (migration 0160, epic #1049) exists to *be* that single golden record, but the M365
tenant links are not in it. We need to settle: the **canonical concept**, the **backing store(s)
and write path**, how the **different connector shapes** map onto one surface, and what happens to
the legacy `account_tenant` table.

## Context

Grounded against prod (read-only DB) and the settled grill, 2026-06-21:

- **`entity_xref` is the chosen golden record (migration 0160, #1054).** One row per
  `(entity_type, source_system, source_key) → internal_entity_id`, with `match_confidence` and
  `match_method ∈ {deterministic, fuzzy, manual}`. The unique index
  `(entity_type, source_system, source_key)` is the integrity guarantee an agent relies on. By
  design (0160) the **web role is SELECT-only**: writes are the backend resolver's job — manual
  curation is the human arm of that resolver, not a GUI-direct write.
- **`account_domain` is GUI-written and stays so.** Domains are owned by the company, so Dark Web
  ID resolves exposure → domain → account; binding a domain to an account is a direct GUI write
  (it is not the agent identity spine and carries no cross-system source key).
- **`account_tenant` (0061) is live and shared.** It has WRITERS (admin Settings → Tenant mapping)
  and READERS in **both** pipeline repos (cloud + on-prem posture merges resolve account→tenants
  by GUID, ADR-0051). It cannot simply be deleted.
- **Prod data shape.** `entity_xref`, `account_tenant`, `account_domain`, `pax8_companies` all
  exist. Only `autotask_companies` is populated (21 rows / 25 accounts) → Autotask is the
  tracer-bullet vertical; the other connectors light up as their bronze hydrates.
- **Connectors are not uniform.** Some share one credential across many companies (fan-out); some
  carry the client's own credential (per-client-credential); one is keyed by domain. The surface
  must absorb all three without three separate pages.

## Options considered

1. **One new dedicated `client_mapping` table** for all connectors, GUI-written, separate from the
   identity spine.
2. **Per-connector mapping tables** (the `account_tenant` pattern repeated for each connector).
3. **Reuse the existing stores** — `entity_xref` (backend-written) for orgs/tenants/sites +
   `account_domain` (GUI-written) for domains — behind ONE reusable Client Mapping surface, and
   fold M365 Tenant Mapping into it.

### Tradeoffs

- **(1) New table** duplicates `entity_xref` (which already exists precisely to be the golden
  record) and forks identity into two competing spines — the exact distribution 0160 was created
  to end. It also re-opens the GUI-writes-identity question 0160 deliberately closed.
- **(2) Per-connector tables** is `account_tenant × N`: N schemas, N write paths, N reader
  contracts, and still no single spine for an agent. Maximum drift.
- **(3) Reuse the two existing stores** keeps one identity spine (`entity_xref`) with the
  backend-only write invariant intact, keeps domains where they already belong (`account_domain`),
  and turns "Tenant Mapping" into one instance of a general concept rather than a special case. The
  cost is a transition for `account_tenant` (it pre-dates the spine) — manageable and additive.

## Decision

**Adopt Client Mapping as one reusable, admin-curated surface backed by the two existing stores,
and make M365 Tenant Mapping its first instance.**

1. **Canonical term — Client Mapping.** The explicit, admin-curated link from a connector's
   external unit (company / tenant / site / domain) → an `account`. **Tenant Mapping** (ADR-0051)
   becomes the **M365 instance** of it (this ADR *amends* ADR-0051's framing; the posture decision
   — never infer tenant→account from domains — stands unchanged).

2. **Two backing stores, two write paths (unchanged invariants).**
   - `entity_xref` for **orgs / tenants / sites** (`entity_type='account'`, `source_system`,
     `source_key`). **Backend-written** (web SELECT-only per 0160). The GUI calls the backend
     manual-link endpoint (unit D, backend #295); every curated link is `match_method='manual'`,
     `match_confidence=1.000`.
   - `account_domain` for **domains**. **GUI-written** directly (it is not the agent spine).

3. **Three connector shapes, one surface.**
   - **Fan-out** — one credential → many companies (autotask, itglue, pax8, myitprocess,
     quotemanager, televy): each external company → one `entity_xref` account link.
   - **Per-client-credential** — the client's own credential (unifi, m365): binding the tenant/site
     **also sets `connection.account_id`** on the matching client-scope connection row, in the same
     backend transaction (unit D), so "which credential" and "which client" never drift.
   - **Domain-keyed** — darkwebid: bind a domain via `account_domain`.

4. **Per-client vs system-level split.** Per-client connectors (m365, autotask, itglue, pax8,
   myitprocess, quotemanager, televy, darkwebid, unifi) get an **Edit client mappings** button on
   their connector card. System/company-level connectors (qbo, meta, docusign, apollo, plaud,
   user-scope personal) **omit** it — they have no per-client unit to map.

5. **Suggestions + one-click Accept + manual override.** The surface proposes likely links
   (name + domain ranking) for one-click Accept, with manual override always available. Accepting
   or overriding writes a `match_method='manual'` link; **auto/fuzzy resolution stays the backend
   resolver's job** (epic #1049) — the GUI only curates the manual arm.

6. **`account_tenant` transition — backfill now, cutover later (the key reversibility call).**
   Migration **0165** backfills every `account_tenant` row into `entity_xref` as
   `('account','m365',tenant_guid)`, `match_method='manual'`, `ON CONFLICT DO NOTHING` (additive,
   idempotent). **`account_tenant` is NOT dropped and NOT replaced by a view in this slice** — it
   keeps its live writers and cross-repo readers. During the overlap both stores carry the M365
   links and the backend write path (unit D) keeps them in lock-step. The cutover — make
   `account_tenant` a read-only view over `entity_xref`, or drop it once every reader/writer (the
   two pipeline repos + Settings) moves onto the spine — is a **deferred later slice of epic #1049**
   (see Future considerations). This sequencing is deliberate: a hard-to-reverse store/write-path
   change ships behind an additive, idempotent step.

## Consequences

### Security impact

- The **identity-spine write invariant holds**: `entity_xref` stays backend-only (web SELECT-only,
  0160). Client Mapping does not re-open GUI-writes-identity; the GUI calls the MI-gated backend
  endpoint (ADR-0035) and every curated link is auditable (`match_method='manual'`,
  `audit_log` in unit D).
- `source_key` (tenant GUID, Autotask company id, …) is a **source identifier — not PII, not a
  secret**; `entity_xref` carries no business data. `account_domain` holds company-owned domains,
  not personal data.
- Correct mapping is itself a security control: an autonomous agent acting cross-client (#1038)
  must resolve the right `account` before acting — a wrong link is a cross-tenant data hazard, so
  manual curation is fail-closed (no link → the agent has no account, not the wrong one).

### Cost impact

Effectively zero: reuses two existing tables and the existing backend; no new infrastructure. One
additive migration on the existing PostgreSQL instance.

### Operational impact

- Prod-apply of `0165` is **Mark-gated** (standing turn-word). It is additive + idempotent and
  prod has 1 `account_tenant` row (home tenant), so the backfill is tiny and re-runnable.
- During the overlap, **both** `account_tenant` and `entity_xref` carry the M365 links — operators
  curating tenant mappings should do so through the Client Mapping surface (unit E) once it ships,
  which keeps both in lock-step; the legacy Settings → Tenant mapping page remains read-correct.
- No semantic-layer concept file changes: `entity_xref`/`account_tenant`/`account_domain` are
  identity/app-native tables, not silver business entities (the PR carries
  `semantic-layer-not-affected`).

## Future considerations

- **`account_tenant` cutover (epic #1049 slice).** Once the two pipeline repos and Settings read
  the spine, replace `account_tenant` with a view over `entity_xref` (or drop it). The view's read
  contract (`tenant_id`, `account_id`, `display_name`) maps to
  (`source_key`, `internal_entity_id`, —); `display_name` has no `entity_xref` column and is
  resolved at the cutover (drop it, or join `account.name`).
- **Unit D (backend #295)** — the manual-link upsert/delete endpoint + the per-client-credential
  `connection.account_id` consistency write.
- **Unit E (#1143)** — the reusable mapping page + Autotask tracer adapter + connector-card
  chain-status icons (credential · ingestion · discovery · mapping; step 5 silver-merge links out).
- **Unit F (#1144)** — the remaining connector adapters (itglue/pax8/kqm/televy/myitprocess/
  unifi/darkwebid) as each connector's bronze hydrates.
- **Other entity types.** `entity_xref` already spans contact/device/asset/opportunity; the same
  Client Mapping pattern can later curate those manually, not just accounts.
