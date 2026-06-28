# Stage 01 — identify-update

**Job:** identify the update or knowledge asset worth sharing and resolve the client + recipient contact.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Sharing opportunity | the triggering signal (advisory/notice, knowledge-asset fit, or a client-360 churn-save flag) | full | what may be shared |
| Sharing rubric | `./skills/sharing-rubric.md` | all | is this worth sharing + which kind (advisory / how-to / churn-save) |
| Client | silver `account` · `okf:account` | the referenced account | resolve + confirm the client |
| Recipient | silver `contact` · `okf:contact` | the contact to share with | resolve the recipient |
| Engagement signal | silver `interaction` · `okf:interaction` | recent engagement, where a churn-save is driven | label measured signal vs inference |

## Process

1. `[sonnet]` Classify the opportunity per `sharing-rubric.md`: an advisory/notice, a
   knowledge-asset how-to (1Password, M365, etc.), or a churn-save outreach. If it is
   really a marketing send (Belle) or a service-incident notice (Felix), end with a
   routing note — stay in Celeste's relationship scope.
2. `[script]` Resolve the client `account` and the recipient `contact`. A missing
   resolvable client or recipient ends the run with the reason — never fabricate a subject.
3. `[sonnet]` Where a churn-save drives the share, state the **measured signal** (the
   `interaction` evidence) vs your **inference** (celeste.md guardrail 3). Never invent a
   reason to reach out.

## Outputs

`subject.md` — the share kind (advisory / how-to / churn-save), the resolved client id,
the recipient contact id, and (for a churn-save) the signal-vs-inference note.

## Audit

- [ ] Share kind classified (advisory / how-to / churn-save) — in scope, not Belle's or Felix's
- [ ] Resolved client `account` id and recipient `contact` id stated (not blank)
- [ ] A churn-save share labels measured signal vs inference
