# Stage 02 — draft

**Job:** draft one paid action — a boost (audience, budget, creative reuse) or a budget
change (pause / raise / lower / hold) — fully specified with its exact dollar figure.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Paid brief | stage 01 output | all | performance vs target, path, the case |
| Ad-spend rules | `./skills/ad-spend-rules.md` | all | budget/pacing rules, the consequence-preview floor |
| Brand voice | `../../skills/brand-voice.md` | all | a boosted post is still the brand's voice (domain-tier skill) |
| Source post (boost path) | `` `okf:social_post` `` | the post to reuse | the creative being amplified |
| Live ad (change path) | `` `okf:ad` `` | the live ad | the ad whose budget/state changes |

## Process

1. `[sonnet]` **Boost path (01-B):** draft the boost — creative reuse (the published
   post), audience, and the **exact budget**; or **change path (01-C):** draft the
   recommendation — pause, raise, lower, or hold, with the **exact new budget / delta**.
   Per `ad-spend-rules.md`; no fabricated capability/claim in reused creative (A5/B7).
2. `[sonnet]` State the **rationale** tied to the brief's performance-vs-target, and the
   **consequence preview**: the exact dollar figure and the irreversibility flag (settled
   money, A10 no-clean-undo).
3. `[script]` Stage the draft as an `ad` record (boost: a new `ad` reusing the post;
   change: the proposed delta on the live `ad`) — **internal, reversible — L2**; nothing
   is committed and no spend occurs here.

## Outputs

`paid-action.md` — the path, the fully specified action (boost: creative + audience +
budget; change: pause/raise/lower/hold + new-$ / delta), the rationale tied to
performance-vs-target, and the consequence preview (exact $ + irreversibility flag).

## Audit

- [ ] Action fully specified (boost: creative + audience + budget; change: action + new-$/delta)
- [ ] Exact dollar figure stated; consequence preview carries the irreversibility flag
- [ ] Rationale ties to the brief's performance-vs-target (cited)
- [ ] Reused creative carries no fabricated claim (substantiation on file)
- [ ] Draft staged internally only — nothing committed, no spend
