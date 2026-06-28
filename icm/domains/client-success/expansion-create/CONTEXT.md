# Workflow: expansion-create (client-success v1)

**Job:** when Celeste reads **real client-interest expansion value** in an active
account, **auto-create** the internal expansion `opportunity` (the `opportunity.write`
**L2 auto-internal** seam, celeste.md §Seams), triage it, and assign it to a
salesperson — then hand the close to **Chase**. This is the one Celeste playbook that
uses `opportunity.write`: an internal, reversible CRM write with no customer-facing
side effect (the Chase ↔ Celeste seam, ADR-0096).

**Trigger:** Celeste detects expansion value in a client she already holds the 360 on —
a standing-picture signal (usage trend, capacity/EOL, a need surfaced in `interaction`,
an `opportunity` of `kind=renewal` approaching with headroom) or an expansion-class
cross-agent handoff folded into the client-360. One run per detected expansion.

**What this is NOT:** no client-facing send, no pricing, no quote, no spend commitment —
those are always-gated and not in this workflow (NO-COMMITS-EVER + MSSP-advisory-only are
dial-proof, celeste.md guardrails 1–2). It does **not** close the deal — Chase owns the
transaction. A **non-interest upsell** (spend that grows Imperion's revenue but is not in
the client's interest) is **flagged and declined**, never auto-created (guardrail 4).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | detect-expansion | Read the account picture; detect real expansion value from signals | — |
| 02 | qualify-triage | Qualify against the rubric; a non-interest upsell is flagged + declined | — |
| 03 | create-assign-handoff | L2 auto-create the internal `opportunity`, triage, assign → hand to Chase | **Teams-loop / L2 self-approve** |

## Autonomy

Starts `draft` (ADR-0061). The flip to `auto` is admin-only and reversible
(`autopilot_policies`). At **L2**, stage 03 may self-approve the `opportunity.write`
ONLY when stage 02 qualifies it as **real client-interest** expansion and the audit is
green — the write is internal, reversible, and idempotent, with no customer-facing side
effect (celeste.md ladder L2). A **non-interest upsell**, any pricing/spend/commitment,
any client-facing touch, and any audit failure park for a human in every mode (anything
not named here parks by default). The NO-COMMITS-EVER and MSSP-advisory-only ceilings are
dial-proof — no rung crosses them (celeste.md guardrails 1–2). Strict
client-confidential boundary: one client's signals never enter another's context.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `expansion-rubric.md` (how to detect real
client-interest expansion vs a non-interest upsell, how to qualify + triage, and the
assignment routing). Mark-editable business content; stages cite, never restate. Rules of
the format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed workflow prose is `prose.md`.
