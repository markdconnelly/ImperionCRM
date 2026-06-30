# Stage 01 — qualify-confirm

**Job:** confirm the routed lead clears the MQL→SQL bar, with the decision logic shown.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Routed lead | the triggering row (lead-response triage / Nova post-score handoff) | full payload | the subject |
| Lead score | silver `lead_score` · `okf:lead_score` | this lead's score + factors | the routing threshold Belle scored to |
| Contact / account | silver `contact` / `account` · `okf:contact` `okf:account` | the linked records | who, fit, account context |
| Prior interactions | silver `interaction` · `okf:interaction` | this contact/account history | grounding the fit call |
| MQL→SQL bar | `./skills/qualification-rubric.md` | all | the qualification rubric |

## Process

1. `[script]` Resolve the lead → its `contact`/`account` + `lead_score` row. Missing a
   resolvable contact OR account → audit fail (cannot open an opportunity against nothing).
2. `[sonnet]` Apply the `qualification-rubric`: does this clear MQL→SQL? Weigh the score,
   account fit, and prior interactions. Write the **decision logic** — the signals weighed,
   why this is (or is not) a real opportunity, and the closest runner-up call rejected.
3. `[script]` Emit a binary verdict `sql` | `not-sql` + the linked `contact_id`/`account_id`.

## Outputs

`qualification.md` — verdict (`sql` / `not-sql`), the decision logic, and the resolved
`contact_id` / `account_id`. `not-sql` ends the run with the reason (no opportunity created —
never a speculative write).

## Audit

- [ ] Exactly one verdict (`sql` / `not-sql`) present
- [ ] Resolved `contact_id` AND `account_id` stated (not blank)
- [ ] Decision logic present and cites the rubric signals (not a bare verdict)
