# Stage 01 — detect-expansion

**Job:** read the standing account picture and detect a concrete expansion candidate
grounded in a signal.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Account | silver `account` · `okf:account` | the client account | resolve + confirm the subject |
| Contacts | silver `contact` · `okf:contact` | the account's contacts | who the expansion serves |
| Opportunities | silver `opportunity` · `okf:opportunity` | open/recent for this account (incl. `kind=renewal`) | headroom, renewals, what is already tracked |
| Engagement / need | silver `interaction` · `okf:interaction` | recent engagement + stated need/usage | the grounded expansion signal |
| Expansion read | silver `lead_score` · `okf:lead_score` | this account's score/factors, if any | corroborates intent (does not by itself clear the bar) |
| Expansion rubric | `./skills/expansion-rubric.md` | the detection section | what counts as a real, grounded signal |

## Process

1. `[script]` Resolve the client `account` + the relevant `contact`. Missing a resolvable
   account → audit fail (cannot mint an opportunity against nothing).
2. `[sonnet]` Read the standing picture (account, contacts, open/recent opportunities,
   recent `interaction` engagement/need). Identify a concrete expansion candidate grounded
   in a **measured signal** (usage/headroom, EOL/capacity, a stated need, a renewal with
   headroom) — **labeling signal vs your inference** (celeste.md guardrail 3). No grounded
   signal → park with the gap named (never fabricate an expansion to pad the pipeline).
3. `[script]` Emit the candidate: the resolved `account_id`/`contact_id`, the signal it
   rests on, and a one-line statement of the expansion value.

## Outputs

`candidate.md` — resolved `account_id`/`contact_id`, the grounding signal (labeled
signal vs inference), and the one-line expansion-value statement. No grounded candidate →
park here with the reason (no opportunity).

## Audit

- [ ] Resolved `account_id` AND `contact_id` stated (not blank)
- [ ] A grounded expansion signal is present and **labeled signal vs inference**
- [ ] One-line expansion-value statement present (not a raw row dump)
