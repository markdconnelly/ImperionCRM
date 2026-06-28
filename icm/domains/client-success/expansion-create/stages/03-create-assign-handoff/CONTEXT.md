# Stage 03 — create-assign-handoff

**Job:** L2 auto-create the internal expansion `opportunity`, triage it, assign it to a
salesperson, and hand the close to Chase.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Qualification | `qualification.md` (stage 02 output) | full | the `expansion` verdict + triage + assignment read + create/update flag |
| Candidate | `candidate.md` (stage 01 output) | full | the grounding rationale to carry into the note |
| Opportunity shape | silver `opportunity` · `okf:opportunity` | the record's fields + which source wins | write the right shape, no duplicate |
| Contact / account link | silver `account` / `contact` · `okf:account` `okf:contact` | the resolved ids | the opportunity's account/contact link + assignment routing |

## Process

1. `[script]` Guard: proceed ONLY if stage 02 verdict is `expansion`. `non-interest-upsell`
   or `not-qualified` → park (never reachable on a clean run, but fail-closed — a
   non-interest upsell never reaches a write).
2. `[script]` Honor the idempotency flag: existing open expansion → UPDATE; else CREATE (at
   most one open expansion opportunity per candidate).
3. `[sonnet]` Assemble the record: stage (first pipeline stage), `kind=expansion`, amount
   **only if grounded** (else unset — never invent a number), source, the `account`/`contact`
   link, and a documentation note carrying the stage-02 qualification rationale (signal vs
   inference) + the triage.
4. `[opportunity.write]` Create or update the expansion `opportunity` via the
   **approval-gated executor** — internal, reversible, idempotent; **never a direct silver
   write** (client-success room.md source-of-record posture). **L2 self-approve** per the
   autonomy contract; otherwise parks.
5. `[opportunity.write]` Apply the triage + **assign the opportunity to a salesperson** (the
   account owner / sales seat, else the default sales queue) — the assignment IS the handoff:
   **Chase owns the close** (the Chase ↔ Celeste seam, ADR-0096). No client-facing send; no
   pricing/spend/commitment (dial-proof, celeste.md guardrails 1–2).

## Outputs

`opportunity.md` — the created/updated expansion opportunity (id, stage, `kind=expansion`,
amount-if-known, account/contact link), the documentation note, the triage, and the
assigned salesperson + the Chase handoff marker. The `opportunity.write` (create/update +
assign) is the only external effect; no customer is contacted. Terminal stage — the run ends
with the opportunity in the pipeline and assigned; the close is Chase's separate motion.

## Checkpoint

A human approves the `opportunity.write` (the created/updated record + triage + salesperson
assignment) — the **Teams loop** where a human co-shapes/approves in draft mode. **`auto`
(L2) may self-approve** ONLY when stage 02's audit is green and the verdict is `expansion` —
the write is internal, reversible, idempotent, with no customer-facing effect. Any pricing,
spend, client-facing action, a non-interest upsell, or any audit failure parks for a human
in every mode (the dial-proof NO-COMMITS-EVER ceiling).

## Audit

- [ ] Stage 02 verdict was `expansion` (else parked — a non-interest upsell never written)
- [ ] At most one expansion opportunity touched for this candidate (create XOR update, idempotent)
- [ ] `opportunity.write` is internal + reversible + idempotent — not a direct silver write
- [ ] Amount is either grounded or unset — never an invented figure
- [ ] No client-facing send / customer-facing side effect emitted
- [ ] Opportunity assigned to a salesperson + handed to Chase for the close
