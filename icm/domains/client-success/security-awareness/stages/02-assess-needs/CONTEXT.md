# Stage 02 — assess-needs

**Job:** assess the client's security-awareness/enablement needs against the handed-off gap.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Handoff | `handoff.md` (stage 01 output) | full | the gap finding + resolved client |
| Account + contacts | silver `account` / `contact` · `okf:account` `okf:contact` | the client record | size the recommendation to the team |
| Engagement | silver `interaction` · `okf:interaction` | recent history for this account | awareness-relevant signals (user-error patterns, prior enablement touches) |
| QBR substrate | silver `strategic_business_review` · `okf:strategic_business_review` | latest for this account | whether security awareness is already on the strategic agenda |
| Rubric | `./skills/awareness-rubric.md` | all | gap → enablement mapping + signal-vs-inference discipline |

## Process

1. `[script]` Pull the account + contacts, recent interactions, and the latest
   `strategic_business_review` for the resolved client. Stay within THIS client (strict
   confidential boundary — never read across clients).
2. `[sonnet]` Assess the awareness/enablement needs the handed-off gap implies, per
   `awareness-rubric.md`. For every need, **label measured signal vs your inference** — a
   recommendation carries the signals (Vera's finding + the standing picture) that produced
   it (celeste.md guardrail 3). Never invent a gap beyond what Vera handed off.

## Outputs

`needs.md` — the assessed awareness/enablement needs (signal vs inference labeled), sized to
the client's contacts and standing relationship, with the gap finding each need traces back
to. Read-only assessment; nothing recommended or delivered yet.

## Audit

- [ ] Only this client's data was read (no cross-client leakage)
- [ ] Each need labels measured signal (Vera's finding + source rows) vs inference
- [ ] No gap asserted beyond the handed-off finding (no self-measured posture)
