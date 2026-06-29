# Workflow: paid-ads (marketing v1)

**Job:** ground one paid action against its target, draft it (a **boost** of a
performing post into an Ad, or a **budget change** on a live Ad — pause / raise /
lower / hold), gate the **spend** to a human, then actuate idempotently and reconcile
the spend. Drafted by Belle, the spend committed by a human, **always** — this is the
money procedure of the marketing plane. (Stream 01-B + 01-C; archetype B6 money-gate;
ADR-0109 money has no clean undo.)

**Trigger:** a Published Social Post crosses a Social Metric threshold (or an operator
elects to amplify it) — the **boost** path (01-B); or a live Ad under-/over-performs
vs target CPL, a pacing alert fires, or a campaign ends — the **budget-change** path
(01-C). One run per paid action.

**Sender identity:** the spend is committed on **our own** Meta ad account, through the
one gauntlet-gated Social Action path (`social_dispatch` → Meta Marketing API,
ADR-0124 / ADR-0058). Meta is the external system of record; the write idempotently
mirrors it (A9). There is no second spend path, and Belle never commits the spend —
the human does, on the platform, every time.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ground | Ground the post's/ad's Social Metrics + the campaign target vs spend pace | — |
| 02 | draft | Draft the boost (audience, budget, creative reuse) OR the budget change (pause/raise/lower/hold) | — |
| 03 | money-gate | Emit a money-class Social Action → gauntlet → cockpit; a human commits the spend | **Yes** |
| 04 | actuate | Idempotency-keyed deploy/change; read back the live budget/state before close | — |
| 05 | reconcile | Reconcile spend → `campaign_metric`; close the run | — |

## Autonomy

Starts `draft` (ADR-0061). The **spend itself** — any boost deploy, ad deploy, pause,
or budget change — is **money-class, dial-proof `always_gate`** (BO-01 §5; ADR-0109 no
clean undo): it never self-approves at any dial, in any mode, and never recedes — a
human commits every spend on the platform. What *may* climb (to **L2**) when an admin
flips the workflow toward `auto` is only the **internal, reversible** work: the
recommendation/draft itself (a boost candidate or a budget-change recommendation) and
the post-approval operational steps (idempotent actuate + read-back, reconcile). A
*pause* is reversible in isolation but is still a money-lifecycle commit, so it gates
with the rest (01-C). Any audit failure parks for a human in every mode.

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `brand-voice.md` (a boosted post is still the
brand's voice). Workflow-local (Tier 3, `./skills/`): `ad-spend-rules.md` (the
money-class gate, the budget/pacing/idempotency rules, the consequence-preview floor).
Mark-editable business content; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
