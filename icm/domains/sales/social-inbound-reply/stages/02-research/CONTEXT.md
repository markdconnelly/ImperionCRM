# Stage 02 — research

**Job:** assemble a short dossier on the author and pick one reply angle.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Intent | `intent.md` (stage 01 output) | full | the confirmed sales-intent + contact link |
| Prior interactions | silver `interaction` · `okf:interaction` | this author/account history | what we already know |
| Account context | silver `account` · `okf:account` | the linked account if any | fit + relationship context |

## Process

1. `[script]` Pull prior interactions + account context for the linked contact (or note
   "cold — no history" when `new`).
2. `[sonnet]` Pick ONE angle for the reply: the specific question asked, the most relevant
   offer, or a qualifying question if the intent is under-specified. One angle, stated — no
   new outreach, no multi-thread.

## Outputs

`dossier.md` — a 3–5 line dossier (who, what we know, the chosen angle + why). No drafting yet.

## Audit

- [ ] Exactly one angle chosen and justified in one line
- [ ] Cold authors are marked `cold` rather than padded with invented context
