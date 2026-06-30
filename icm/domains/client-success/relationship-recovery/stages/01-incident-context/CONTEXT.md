# Stage 01 — incident-context

**Job:** assemble the incident + relationship picture from the Felix seam and label
measured signal vs inference. (💤 dormant until the substrate hydrates — #991 +
#1369/#1370, ADR-0123.)

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Incident | silver `ticket` · `okf:ticket` | the major-incident / SLA-breach ticket(s) for this account | the triggering rupture facts (Felix seam, source) |
| Account + contacts | silver `account` / `contact` · `okf:account` `okf:contact` | the at-risk client | who the relationship is with + the exec/decision contact |
| Sentiment + history | silver `interaction` · `okf:interaction` | recent history for this account | sentiment drop + the relationship signal behind the rupture |
| Strategic record | silver `strategic_business_review` · `okf:strategic_business_review` | latest SBR for this account | the strategic context the recovery re-frames against |
| Recovery rubric | `./skills/recovery-rubric.md` (cites `../../client-360/skills/health-signals.md`) | all | signal-vs-inference + the acute-rupture indicators |

## Process

1. `[script]` Pull the triggering incident `ticket`(s), the account + contacts, recent
   `interaction` sentiment, and the latest `strategic_business_review` for the client. Stay
   within THIS client (strict confidential boundary — never read across clients). A
   missing / unresolvable incident or client **parks** the run with the reason — never a
   best-effort assemble on a phantom rupture.
2. `[sonnet]` Assemble the incident + relationship picture per the rubric (which reads the
   acute indicators from `health-signals.md`). For every read, **label measured signal vs
   your inference** — the rupture severity carries the signals that produced it (celeste.md
   guardrail 3). Never invent dissatisfaction or sentiment.
3. `[script]` Set the disposition seed: the rupture facts (the incident, the relationship
   signal) + the exec/decision contact. This seeds stage 02's posture choice.

## Outputs

`incident-context.md` — the incident facts, the relationship context (account, contact,
sentiment, SBR), the at-risk relationship signal (measured signal vs inference labeled), and
the resolved exec/decision contact. Missing incident/client → run parks here.

## Audit

- [ ] Only this client's data was read (no cross-client leakage)
- [ ] The triggering incident resolved to a real `ticket` (else the run parks)
- [ ] Every rupture read labels measured signal vs inference
- [ ] The at-risk relationship signal carries the signals that produced it (no unsourced read)
- [ ] No outreach drafted or sent here (assemble + read only)
