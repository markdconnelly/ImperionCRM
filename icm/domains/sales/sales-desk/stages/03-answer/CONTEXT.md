# Stage 03 — answer

**Job:** synthesize a persona-shaped, fully-cited answer to Nova's question from the evidence
set — abstaining and routing on any uncitable fact, fabricating nothing — and return it as the
workflow's terminal output to the delegating agent. Terminal stage; no checkpoint (nothing to
approve).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Cited evidence set | stage 02 output | the question | the cited facts + recall result + gaps to reason from |
| Interpretation | stage 01 output | the question | the judgment ask + caller scope to answer within |

## Process

1. `[sonnet]` Synthesize the answer in **Chase's voice with his qualification judgment** (the
   fit call, the deal-risk read, the next best touch) — reasoning over the evidence set, not
   restating it. The answer addresses **Nova**, the delegating agent, never the customer.
2. `[sonnet]` **Cite every claim** — each factual claim carries its `opportunity` / `account`
   / `interaction` / `contact` id + as-of (or a gold knowledge-object / memory ref) (A5). Any
   fact the evidence set couldn't ground is **abstained** — "I don't know / I'd need X" — and
   **routed** to the agent or human who would know (A5b); never fabricated to sound complete.
   Carry the stage-02 stale-recall flag through so dormant recall reads as dormant.
3. `[script]` Return the answer as the workflow's **terminal output to the delegating agent
   (Nova)**. This is internal orchestration, not a send (no ADR-0058). **No side effect:** no
   send, no write, no booking, no parked proposal, no okf write.

## Outputs

`answer.md` — the persona-shaped, fully-cited answer addressed to Nova (every claim carrying
its source id + as-of), with uncitable facts abstained + routed (not fabricated), the carried
stale-recall flag, and anonymized/aggregated-only cross-deal context — returned to the
delegating agent, nothing actuated.

## Audit

- [ ] Every factual claim in the answer cites its source id + as-of (A5)
- [ ] Uncitable facts abstained + routed to who would know — not fabricated (A5b)
- [ ] Stale/dormant recall carried through and labeled dormant, not presented as live (A5c)
- [ ] No client's specifics bleed into another's answer — pool, never bleed (A7)
- [ ] Answer addressed to the delegating agent (Nova), not a customer; within the caller's read scope (§5.2)
- [ ] No send, no write, no booking, no parked proposal, no okf write — terminal output only, no side effect
