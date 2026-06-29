# Stage 01 — ground

**Job:** parse the RFP's requirements and ground each one in sourced capability evidence
— citing source + as-of, parking (never fabricating) on an empty recall.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| RFP / bid invitation | trigger payload | the one RFP | the requirements being answered |
| Opportunity | the tied `opportunity` · `okf:opportunity` | this deal | the bid's deal context + attribution |
| Account | silver `account` · `okf:account` | the bidding account | who we're bidding to + relationship context |
| Prior wins + capability evidence | `[knowledge.search]` / `[memory.recall]` | this domain | reusable grounded answers + capability proof |

## Process

1. `[sonnet]` Parse the RFP into a requirement checklist — each item is a question the
   response must answer (capability, approach, pricing ask, security/compliance ask).
2. `[knowledge.search]` `[memory.recall]` For each requirement, recall prior winning
   responses + capability evidence. **Cite each source + its as-of** (A5).
3. `[sonnet]` Map each requirement → grounded evidence | **gap**. On an **empty recall**
   for a capability/certification requirement, **park that section to a human** with reason
   `awaiting-evidence` — **never fabricate a capability or certification claim** (A5b,
   refusal-class). Tag every security/compliance requirement as **`→ Grace` (#1557)** — not
   answered here.

## Outputs

`requirements.md` — the parsed requirement checklist, each marked grounded (with cited
source + as-of), `gap` (parked `awaiting-evidence`), or `→ Grace` (security/compliance,
routed to the stage-02 seam). No claim is asserted without a source.

## Audit

- [ ] Every requirement parsed and classified (grounded | gap | → Grace)
- [ ] Each grounded answer cites a source + as-of (A5); none fabricated
- [ ] Empty recall on a capability/cert requirement → parked `awaiting-evidence`, never invented
- [ ] Every security/compliance requirement is tagged `→ Grace`, not self-answered
