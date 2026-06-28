# Expansion rubric (Mark-editable — real expansion vs non-interest upsell + triage/routing)

> DEFAULTS authored by the agent 2026-06-27. The rubric for `expansion-create`: how to
> detect REAL client-interest expansion value, how to qualify + triage it, and the
> assignment routing. Mark: edit freely; stages cite this, nothing restates it. This is
> NOT the churn/health rubric (`../../client-360/skills/health-signals.md`) — health is a
> signal that may *feed* an expansion read, not the test itself.

## The discipline: in the client's interest, not Imperion's revenue

Celeste advises as a trusted advisor, not an account up-seller (celeste.md guardrail 4).
The whole test is **whose interest does this spend serve?**

- **Real client-interest expansion** = the client has a concrete need or headroom this
  spend genuinely serves: outgrowing a tier, an EOL/capacity wall, a new site/headcount,
  a security/posture gap the client should close, a stated intent in a recent
  `interaction`. The client is materially better off.
- **Non-interest upsell** = spend that grows Imperion's revenue but does **not** serve the
  client's interest: padding seats they won't use, a tier they don't need, re-selling
  what they already own. **Flag it explicitly and decline** — it never becomes an
  opportunity (guardrail 4). Surface it to a human with the reason; do not carry it forward.

## The bar — a real expansion clears ALL of these

1. **Grounded signal** — a concrete signal in a source row (usage/headroom in
   `interaction`/telemetry, an EOL/capacity trigger, a stated need, a renewal with
   headroom in `opportunity` `kind=renewal`). Label **measured signal vs your inference**
   (guardrail 3) — a bare "they could use more" is not a signal.
2. **Client interest** — the spend materially serves the client, not just the top line.
   Fails this → **non-interest upsell** → flag + decline.
3. **Resolvable subject** — a real `account` + the relevant `contact`, so the opportunity
   has a home. No resolvable account → park (cannot mint against nothing).
4. **Not already tracked** — no open expansion `opportunity` already covers this candidate
   (idempotency — re-run updates, never duplicates).

## Not-a-real-expansion → park or decline (no opportunity)

- Non-interest upsell → flag with the reason + decline (the explicit guardrail-4 path).
- No grounded signal, or no resolvable account → park with the gap named.
- Never mint a speculative opportunity to pad the pipeline (mirrors Chase's bad-fit
  guardrail: a non-interest deal is future churn).

## Triage + assignment routing

- **Triage** — set urgency (signal recency / EOL clock / renewal proximity) and
  size-if-grounded (never invent a figure — grounded or unset). Carry the qualification
  rationale into the opportunity's documentation note.
- **Assign to a salesperson** — route by account ownership where known (the existing
  account owner / Chase as the sales seat), else the default sales queue. The assignment
  is the handoff: **Chase owns the close** (the Chase ↔ Celeste seam, ADR-0096) — you mint
  + assign, Chase runs the transaction.
- **Stay in seam** — no pricing, no quote, no client-facing send here. Those are a
  separate, always-gated motion (celeste.md guardrails 1–2, dial-proof).
