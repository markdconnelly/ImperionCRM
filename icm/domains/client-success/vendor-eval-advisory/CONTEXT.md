# Workflow: vendor-eval-advisory (client-success v1)

**Job:** Celeste's **vCIO vendor/solution evaluation advisory** — assemble a structured
evaluation of vendor/solution options for a client need (options, weighted criteria,
tradeoffs, fit-to-client-need) and park a **recommendation only**. This is advisory: it
frames the choice and recommends a direction; it never commits, never sources, never buys.

**Trigger:** a client need surfaces for a technology/solution decision — a `relationship.*`
handoff (often **Vance → Celeste**, a vendor/procurement change: price hike, EOL, vendor
risk; seam → Vance #1398) or a standing-account advisory ask. Vendor pricing/terms arrive
as a **Vance handoff** (plain payload), never re-derived here. One run per need.

**What this is NOT:** no commitment, no procurement, no buy, no client-facing send. The
evaluation surfaces options + a parked recommendation; **Vance sources/procures** the
chosen direction and **the buy is human-gated money** (CONSTITUTION §5.4). NO-COMMITS-EVER
and MSSP-advisory-only are dial-proof (celeste.md guardrails 1–2).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | need-context | Frame the client need from the account + strategic record (vendor facts arrive from Vance) | — |
| 02 | evaluate-options | Build the options / weighted-criteria / tradeoff evaluation (signal vs inference) | — |
| 03 | recommend | Park the recommendation; seam → Vance for procurement (human-gated money) | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient** (a human co-shapes + approves).
At **L2**, the internal evaluation assembly and the options/tradeoff compute auto-execute
(reversible, signal-labeled). **Every** recommendation, binding commitment (spend / a
procurement direction that costs money), and client-facing touch parks for a human in every
mode — the NO-COMMITS-EVER ceiling is dial-proof (celeste.md). The **buy itself is not
Celeste's seam at all**: the recommendation hands to Vance, who sources/procures under
human-gated money. Strict client-confidential boundary: one client's need never enters
another's context.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `evaluation-rubric.md` (how to structure a
vendor/solution evaluation — options, weighted criteria, tradeoffs, fit-to-client-need;
signal-vs-inference; the Vance pricing/terms boundary). Mark-editable; stages cite, never
restate. Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed prose is `prose.md`.
