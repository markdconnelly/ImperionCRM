# Stage 02 — qualify

**Job:** assess the expansion-specific signals on the grounded opportunity —
entitlement/whitespace gaps, usage growth, account health, relationship context —
and decide qualify or disqualify. Explicitly **not** cold ICP fit.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Grounding | stage 01 `ground.md` | all | the expansion opp + carried signals being assessed |
| Account/history | silver `account` / `interaction` timeline · `okf:account` `okf:interaction` | this account only | confirm health + relationship context behind the call |
| Expansion rules | `./skills/expansion-rules.md` | all | the signal set · qualify/disqualify bar · pool-never-bleed |

## Process

1. `[sonnet]` Assess the four expansion signals (`expansion-rules.md`):
   entitlement/whitespace gap, usage growth, account health, relationship context.
   **Do NOT apply an ICP fit score** — an existing customer is already a fit.
2. `[sonnet]` Label each signal **signal vs inference**: a number carried on the
   opportunity/account is signal; anything reasoned toward is inference. **Never
   fabricate a health or usage number** — a missing number is information
   (chase.md §5).
3. `[script]` Pool-never-bleed: any cross-account benchmark stays aggregate; reads
   are tenant-isolated — never carry one account's row-level data into another's
   call (A7).
4. `[sonnet]` Decide **qualify** or **disqualify** against the bar in
   `expansion-rules.md`, naming the signals that carried it. Ambiguous (signals
   can't ground a qualify call) → disqualify.

## Outputs

`qualification.md` — the four signals (each marked signal/inference, with its
value or "unknown"), the decision (qualify | disqualify), and a 2–3 sentence
rationale naming the carrying signals — for stage 03's stamp/route.

## Audit

- [ ] No ICP fit score applied (this is expansion, not net-new)
- [ ] Each signal marked signal-vs-inference; no fabricated health/usage number
- [ ] No cross-account row-level bleed (pool-never-bleed, A7)
- [ ] Exactly one decision (qualify | disqualify) with a grounded rationale
