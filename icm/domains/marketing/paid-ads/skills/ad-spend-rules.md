# Skill (Tier 3, workflow-local): ad-spend-rules

Mark-editable money rules for any paid action in this workflow — a boost (01-B) or a
budget change (01-C). Binds the persona's "money always parks" doctrine and BO-01 §5
(ad-spend authorization) into the draft and gate stages. Stages cite this; they never
restate the policy. The principle: **the spend is settled money with no clean undo —
the agent does the full setup, a human commits every dollar, always.**

## The money-gate rule (dial-proof)

1. Every spend — boost deploy, ad deploy, pause, or budget change — is **money-class,
   `always_gate`** (A2 class-1; ADR-0109 no clean undo). It **never** self-approves at
   any dial, in any mode, and never recedes — a human commits it on the platform.
2. A *pause* is reversible in isolation but is a money-lifecycle commit, so it gates
   with the rest — the workflow gates conservatively (01-C).
3. Only the **internal, reversible** work climbs (to L2 at `auto`): the draft/recommendation
   and the post-approval operational steps (actuate read-back, reconcile). The commit
   itself does not.

## The easy-button floor (every money gate)

The 4-part easy-button (A4) MUST carry: the drafted action + the grounded why
(performance-vs-target, cited + as-of) + one-click **Commit** + the **consequence
preview** — the **exact dollar budget / delta** and the **irreversibility flag**
(settled money, A10). No money gate is presented without the exact $ and the
irreversibility flag.

## Budget / pacing discipline

1. Every drafted budget ties to the campaign target/envelope and the cited spend pace —
   no budget proposed without grounded performance-vs-target.
2. Never propose a spend above the campaign's approved envelope; an over-envelope spend
   escalates to the campaign owner, not self-drafted as routine.
3. A boost reuses a **published** post as creative — substantiation already on file
   (cite-or-cut still applies; no new unsourced claim is introduced in the boost).

## Actuation safety

1. Actuate **idempotency-keyed (procedure + ad + period)** so a replay is a no-op,
   **never a double-spend** (A9b).
2. **Read back** the live ad id / budget / state from Meta (the external SoR) and
   confirm it matches the committed amount before close (A9c). A mismatch parks.
3. A dormant/missing Meta token or ad-account scope → skip and flag, never silently drop.

A paid action whose budget cannot be tied to a grounded target, or whose read-back does
not match the committed amount, **parks** — that is the audit failure, never a
best-effort spend.
