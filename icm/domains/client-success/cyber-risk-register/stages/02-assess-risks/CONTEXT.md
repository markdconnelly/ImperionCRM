# Stage 02 — assess-risks

**Job:** assess and prioritize each risk (signal vs inference; likelihood/impact).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Findings | `findings.md` (stage 01 output) | full | Vera's findings + resolved client + standing frame |
| Risk rubric | `./skills/risk-register-rubric.md` | all | the register structure + signal-vs-inference discipline + MSSP boundary |
| Engagement context | silver `interaction` · `okf:interaction` | recent for this account | business context for impact framing (read-only) |

## Process

1. `[sonnet]` For each finding Vera handed off, assess **likelihood** and **impact** per
   `risk-register-rubric.md`. For every rating, **label the measured signal (Vera's finding)
   vs your inference** (your reading of likelihood/impact) — a rating without its evidence is
   not advice (celeste.md guardrail 3). Never invent a posture finding Vera did not measure.
2. `[sonnet]` Prioritize: likelihood × impact gives an order; weigh, don't sum blindly. Frame
   impact in the client's business terms using the engagement context — not raw scan jargon.
3. `[script]` Record each risk with its measured signal, likelihood, impact, and priority rank.
   No mitigation is committed here — assessment only.

## Outputs

`assessment.md` — each risk with measured signal vs inference labeled, likelihood, impact,
and priority rank. The ordered input to the curated register.

## Audit

- [ ] Every risk labels measured signal (Vera's finding) vs inference
- [ ] No risk asserted beyond what Vera measured (none fabricated)
- [ ] Each risk carries a likelihood + impact + priority rank
- [ ] Only this client's data was read (no cross-client leakage)
