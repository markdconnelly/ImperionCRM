# Workflow: stakeholder-mapping (client-success)

> 💤 **DORMANT until its write twin + data substrate land (ADR-0123 built-but-inert).**
> This playbook is authored **capability-complete** but stays **inert** in production
> until (a) the backend **stakeholder-mapping write executor** exists — this workflow
> only **PROPOSES** the map; the silver `stakeholder` WRITE is backend-owed
> (approval-gated, server-side, **never a direct silver write** — exactly like
> cyber-risk-register's register store) — and (b) the **interaction / comms collectors**
> (#1369 / #1370) that hydrate the derivation signals (who communicates, who approves,
> who went silent). Until then there is no measured signal to derive a map from, so the
> workflow never wakes — it is built, registered, and reviewable, not running. Do not
> read its dormancy as "deferred/broken"; it lights up the moment its executor + source
> signals land (CLAUDE.md §6 deploy-dormant; celeste.md grounding, ADR-0123).

**Job:** Celeste maintains the per-account **stakeholder map** — for each client, who is
the **champion**, **economic_buyer**, **technical_decision_maker**, **influencer**, plain
**user**, or **detractor**, plus their **influence**, **sentiment**, and **active-vs-departed**
status (the `stakeholder` silver entity). CS effectiveness depends on knowing the human map:
who to route a QBR to (08-C), whose departure is a churn risk (08-D), who to cultivate for a
reference (the advocacy seam, #1692). A health verdict without a stakeholder map misses the
most important churn signal there is: **the champion just left**. This is **propose-only** —
the workflow assesses from MEASURED signals and parks a PROPOSED map update; the silver write
is the backend executor's (celeste.md guardrail 1, propose-not-commit posture). Issue #1695.

**Trigger:** a periodic relationship-map refresh over an active account (the cockpit cadence)
**or** a fresh signal that may change the map — a new `contact`, a sentiment shift, or a
contact departure detected in `interaction`/comms. One run per account.

**What this is NOT:** no silver write (the executor persists; this workflow proposes — propose-only).
No client-facing send, no commitment. No role asserted without evidence — an unsupported read is
`unknown`, **never** a guess (celeste.md guardrail 3). Champion-departure is surfaced as a
**churn signal** routed to 08-D health-intervention; it is not acted on here. The map feeds 08-A
(client-360), 08-C (QBR targeting), and advocacy targeting (#1692) — those workflows act, this one maps.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | relationship-read | Resolve the client; read contacts, interaction patterns, the SBR, and the EXISTING map | — |
| 02 | map-assess | Assess role / influence / sentiment / status per contact from MEASURED signals (signal vs inference; `source=derived`) | — |
| 03 | propose-map | Produce the PROPOSED map update as a parked draft for the backend executor; route champion-departure to 08-D | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient** (a human co-shapes + approves).
At **L2**, the relationship read + map assessment + the PROPOSED map update auto-execute
(internal, reversible, signal-labeled — `source=derived` vs human-`curated`). **No silver
write here in any mode** — the map proposal parks for the backend stakeholder-mapping executor
/ human; the write is backend-owed (propose-only). **No role is ever asserted without evidence**
— an unsupported read is `unknown`, not a guess (the signal-vs-inference discipline; celeste.md
guardrail 3). NO-COMMITS-EVER is dial-proof (celeste.md guardrail 1). Strict client-confidential
boundary: one client's stakeholders never enter another's context (celeste.md guardrail 5).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `stakeholder-rubric.md` (how to classify role / influence /
sentiment / relationship_status from MEASURED interaction signals vs inference, the never-assert-a-
detractor-without-evidence rule, and champion-departure detection). Mark-editable; stages cite,
never restate. Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed prose is `prose.md`.
