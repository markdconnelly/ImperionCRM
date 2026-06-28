# MQL→SQL qualification rubric (Mark-editable)

> DEFAULTS authored by the agent 2026-06-27 — Mark: edit freely. This file is the
> canonical MQL→SQL bar (stage 01 cites it, nothing restates it). It decides when a
> marketing-qualified lead is sales-qualified enough to open an `opportunity`. It is
> NOT the ICP fit rubric (`../../lead-response/skills/icp.md`, which scores fit) — fit
> is an input here, not the whole test.

## The bar — an SQL clears ALL of these

1. **Fit** — ICP fit score ≥ 3 (a viable motion, not residential/spam). Score 1–2 → not-SQL.
2. **Authority/relevance** — the contact is plausibly a decision-maker or influencer for IT
   spend (title, role, or stated buying intent), not a job seeker / vendor / tyre-kicker.
3. **Need** — a concrete, statable need or trigger (migration, security posture, managed/
   co-managed IT, a pain in the inbound message), not a generic "tell me more".
4. **Engagement** — at least one real two-way signal (a reply, a booked call, a form with
   specifics) — `lead_score` above Belle's routing threshold corroborates but does not by
   itself clear the bar.

## Not-SQL → park with the reason (no opportunity)

- Fit 1–2, or no resolvable account, or pure information-gathering with no need/authority.
- A bad-fit deal is future churn (Chase's guardrail) — do not open an opportunity to pad the
  pipeline. Park it back to nurture (Belle) with the gap named.

## Notes

- **Show the runner-up.** When close to the line, state why it cleared (or didn't) and the
  nearest rejected reading — a bare verdict is not qualification.
- **Amount is optional.** Clearing the bar does not require a known deal size; never invent
  one to create the opportunity (the figure is grounded or unset, stage 02).
