---
adr: 0130
title: "Renewals motion & opportunity-consistency model — app-native contract_renewal linked to a kind=renewal opportunity, single-opportunity Autotask↔KQM guarantee, dual-run rank-guarded merge, layered repricing"
status: accepted
date: 2026-06-27
repo: frontend
summary: "Resolves the #1324 design fork (epic #1304): a contract renewal is NOT a flavor of opportunity — it is a first-class app-native satellite entity (`contract_renewal`, Imperion is SoR, the opportunity merge never writes it) holding the renewal lifecycle (identified → priced → quoted → sent → renewed | repriced | churned) + pricing, linking the expiring `contract` (required), an optional `kind=renewal` `opportunity` (new discriminator), and an optional `esign_envelope`. A two-stage trigger keeps Autotask clean: the renewals radar (#1323, over `contract.term_end`) creates the app-only `contract_renewal` at a 90-day lead time; pursuit mints the opportunity. The Autotask↔KQM single-opportunity SOP (quote attaches to a pre-existing opportunity, never 'create new') keeps the `autotask_opportunity_id` join key at ONE silver row, with a #1403 integrity guard. The silver `opportunity` merge is dual-run (LP timed cycle + cloud website-event), deterministic + rank-guarded on precedence website>autotask>kqm — neither plane owns it. Repricing is layered (per-contract clause % ELSE 5% baseline + term incentive + cost pass-through), auto-proposed and human-overridable, with the full derivation in `proposed_pricing` jsonb. Revenue columns are financial-gated."
tags: [sales, renewals, opportunity]
---
# ADR-0130: Renewals motion & opportunity-consistency model

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-27 |
| **Cross-references** | ADR-0080 (sale→delivery orchestration; KQM=quote SoR, status==3 fires the spine), ADR-0026 (corrected pipeline-parity framing — planes differ by trigger, not ownership), ADR-0103 (registry — house style only) · epic #1304 · design fork #1324 · radar #1323 · spike #427 · collector probe #1325 · repricing #1326 · worklist #1327 · quote→e-sign #1328 · integrity guard #1403 · cost pass-through #1041/#1082 · churn-risk #1046 |

## Problem

Contract renewals are the **#1 MSP growth lever**, but the model was undecided (the #1324
design fork): is a renewal **its own entity** or **a flavor of opportunity**? And the
opportunity record itself risked **duplication** across KQM (Kaseya Quote Manager — the
quote system of record) and Autotask — two parents, two silver rows, a polluted forecast.
We need four things settled together: an **app-native renewal record**, a clean
**single-opportunity guarantee** across KQM and Autotask, a **repricing model**, and an
**opportunity merge both pipeline planes can run** without clobbering each other.

## Context

- Silver `opportunity` is **externally merged** from `kqm_opportunities` +
  `autotask_opportunities` + `website_opportunities`, SoR precedence
  **`website` > `autotask` > `kqm`** (ADR-0080), join key `autotask_opportunity_id`
  (migration `0083`). See the [opportunity concept](../database/semantic-layer/tables/opportunity.md).
- `contract` is **first-class silver** (Autotask SoR). The renewals radar (#1323) reads
  `contract.term_end` to know when a contract is coming up for renewal.
- **KQM requires an Autotask Opportunity as the quote's parent**, and *updates the same
  opportunity* when the quote is won — it never creates a duplicate. Spike #427 confirmed
  this in production: **16/16 quotes were already linked** to a pre-existing Autotask
  opportunity. The duplication risk is therefore a **process** risk (a human creating a
  second opportunity), not a tooling one.
- **Pipeline planes have parity** (corrected ADR-0026 framing): the LP *can* run every
  merge; the planes differ by **trigger**, not by ownership — the LP runs on a **timed
  cycle**, the cloud Pipeline runs **event-driven** on website edits.

## Options considered

1. **Renewal = a flavored `opportunity`/`proposal`** that reuses that surface. **Rejected:**
   the opportunity is **externally merged every cycle** (precedence website>autotask>kqm),
   so the merge would **clobber app-native renewal fields** (lifecycle, proposed pricing)
   on every run — there is nowhere on a merged row that Imperion owns.
2. **Renewal = a first-class app-native entity that LINKS to an opportunity.** **Chosen.**
   Imperion owns the renewal row outright; the opportunity stays the externally-merged
   sales artifact, linked by id. No write contention with the merge.

## Decision

**D1 — `contract_renewal` is a first-class, app-native satellite entity.** Imperion is its
source of record; **the opportunity merge never writes it**. It holds the renewal
**lifecycle** (`identified → priced → quoted → sent → renewed | repriced | churned`) and
its **pricing**, and links `contract_id` (**required**), `opportunity_id` (**nullable**),
and `esign_envelope_id` (**nullable**). It is the one place renewal-specific data lives.

**D2 — Add an `opportunity.kind` discriminator** (`new` | `renewal` | `upsell` | …). A
renewal **is** an opportunity *kind*: the contract's expiration is the **sales event** that
spawns it, the **opportunity is the ticket** that documents the pursuit, while
`contract_renewal` holds the renewal-specific data. The two are complementary, not
alternatives.

**D3 — Two-stage trigger keeps Autotask clean.** When the renewals radar (#1323, over
`contract.term_end`) crosses a **lead-time threshold** (default **90 days**,
per-contract overridable), it creates a `contract_renewal` at `status=identified` —
**app-only, no opportunity yet**. **Pursuit** (a human, or **Chase** the Sales agent,
prices it) mints the `kind=renewal` **opportunity** — created in the app and **documented
back to Autotask** — and sets `contract_renewal.opportunity_id`. This avoids creating
Autotask opportunities 90 days early and littering the pipeline with un-worked deals.

**D4 — Opportunity-consistency SOP (Autotask↔KQM), the single-opportunity guarantee.**
**Opportunity-first**: create the opportunity in Autotask (or in the app and document it
back to Autotask). Attach the **KQM quote to the EXISTING opportunity** — never "create
new". Confirm **Synced** (the **Primary Quote** field populates on the Autotask
opportunity = link proof). **Won** updates the **SAME** opportunity (`status==3` fires the
sale→delivery spine, ADR-0080). Because the quote attaches to a pre-existing opportunity,
the `autotask_opportunity_id` join key keeps it **ONE silver opportunity row** — no
duplicate. **Integrity guard (#1403):** detect an Autotask opportunity set **closed/lost
while a KQM quote is still linked** (at which point KQM stops syncing) and surface it for
recovery. The operator-facing SOP is the runbook shipped in this PR
([sales-kqm-autotask-opportunity-sop](../runbooks/sales-kqm-autotask-opportunity-sop.md)).

**D5 — Opportunity merge = dual-run pipeline parity.** The **LP runs the merge on a timed
cycle** over all three bronze sources; the **cloud Pipeline runs the SAME merge
event-driven** on website manual edits. The merge is **deterministic + rank-guarded** on
precedence (`website > autotask > kqm`) so a lower-precedence source **never clobbers** a
higher one and **concurrent dual-run converges** to the same result. **Neither plane
"owns" it** (corrected ADR-0026 framing). The merge DML is granted to **BOTH** pipeline DB
roles — `imperion-localpipeline` and `mgid-imperioncrmpipeline`.

**D6 — Repricing is layered, auto-proposed, human-overridable.** The proposed renewal price
is built in layers: **base** = `current_revenue`; **escalation %** = the per-contract
clause **ELSE a baseline 5%**; a **term incentive** gives multi-year (e.g. 3-year) deals a
better effective rate / lifetime value to reward lock-in; **plus cost pass-through**
(#1041/#1082). A human may **override the escalation %** OR the **overall quote number**
before it goes to the client. **`proposed_pricing` (jsonb)** records the full derivation
(base · applied % · source-of-% · term incentive · cost delta · final) for margin display
and audit.

**D7 — `data_class`.** `contract_renewal` is **operational**; its **revenue columns**
(`current_revenue`, `proposed_revenue`, `proposed_pricing`) are **financial-gated** at the
column/RBAC level — exactly like `opportunity.amount_mrr`.

## Consequences

### Security impact

Revenue fields (`current_revenue`, `proposed_revenue`, `proposed_pricing`) are
**financial-gated** at the column/RBAC level (D7), so the renewal worklist and any
margin display respect the same revenue boundary the rest of sales does. The **#1403
integrity guard** catches a human **breaking KQM sync** (an Autotask opportunity set
closed/lost while a quote is still linked) and surfaces it for recovery rather than
letting the link rot silently. **Secret and PII rules are unchanged** — no secret or
client-identifying value enters the renewal row, the OKF concept, or this ADR (CLAUDE.md
§5 / ADR-0086).

### Cost impact

**Additive** — a new `contract_renewal` table plus one `opportunity.kind` column. **No new
store**, no new external service. The merge runs on existing pipeline compute on both
planes.

### Operational impact

The renewal **worklist (#1327)**, the **quote → e-sign (#1328)** flow, and the Autotask
**write-back** all ride on this model. The **two-stage trigger (D3)** keeps Autotask clean
— no opportunities created 90 days early. The sales team gets a concrete **opportunity-first
SOP** (the runbook in this PR) so the single-opportunity guarantee holds in practice. The
work is **cross-repo**: the **front end** owns the migration (`contract_renewal` +
`opportunity.kind`) and the radar routine; the **LP and cloud Pipeline** both run the
rank-guarded opportunity merge, and the LP also builds the **Autotask-opportunity
collector** (#1325 probe); the **backend** owns the renewal **repricing derivation** and
the **Autotask write-back**.

## Future considerations

- **Per-account vs per-contract** escalation overrides (an account-level default escalation
  that contracts inherit).
- **Churn-risk scoring** feeding the radar (#1046) — prioritize at-risk renewals, not just
  near-term ones.
- **Multi-year term modeling** on `contract` so the term incentive reads structured term
  data rather than inferring it.
- The **OKF `contract_renewal` concept file + the coverage-matrix row land with the #1324
  migration PR** (the §11 same-PR semantic-layer gate) — this docs PR adds neither, only
  notes the obligation.
