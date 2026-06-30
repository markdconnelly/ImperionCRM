# Workflow: sales-desk (sales v1)

**Job:** field a sales-domain question delegated to Chase by the orchestrator (Nova) and
return a persona-shaped, **fully-cited** answer — interpret the question, ground it on the
sales read surface + semantic recall, then synthesize Chase's domain-expert *judgment*
(qualification instinct, deal-risk read) into an answer Nova structurally can't reproduce
herself. This is the **advisory desk** archetype (B10, ADR-0136 / CONSTITUTION §10): **L0,
read-only, NO actuation, NO side effect, NO send.** The answer is returned to Nova, never to
the customer.

**Trigger:** a sales-domain question is delegated to Chase by the orchestrator (Nova) — one
run per question. The delegate path rides the executive intake mechanism (Nova's
`intake-route` / the C-suite division-intake), and the answer returns to the delegating
agent, not to any external party.

**Dependency / dormancy:** the delegate path is **dormant** until the executive intake
mechanism lands; semantic recall (`knowledge.search` / `memory.recall`) is likewise dormant
until the retrieval tier + Voyage seed hydrate. Until then a recall returns empty — treated
as **absence of memory, not absence of fact** (A5c): the desk says so and still answers from
the structured `pg.read` rooms + persona reasoning.

## What this is NOT

- **NOT a procedure.** Unlike every other Chase workflow (trigger → staged flow → side
  effect), this desk actuates nothing — no stamp, no write, no parked proposal, no send.
- **NOT for plain facts or lookups, and not cross-domain.** Nova answers those herself; the
  desk is reserved for sales-domain-expert **judgment** (is this a real opportunity, what's
  the deal risk, what's the next best touch).
- **NOT customer-facing.** The answer addresses Nova (the delegating agent), never the user.
  Returning to the delegator is internal orchestration, not a send (no ADR-0058).
- **NOT a quote/pricing action.** A pricing or commitment *decision* is a procedure with its
  own gates; the desk only reads, reasons, and advises.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | interpret | Parse the delegated question; determine which sales rooms/facts it needs; scope to the asking user's read permission (never-exceed-caller, §5.2). Output: question restated + grounding plan | — |
| 02 | ground | Pull cited facts from the structured rooms (`pg.read`) + attempt semantic recall (dormant → empty → flag A5c); key each reading to its source id + as-of (A5); pool-never-bleed on cross-deal context (A7). Gaps flagged "unknown — would need X" | — |
| 03 | answer | Synthesize a persona-shaped, fully-cited answer; abstain-and-route on any uncitable fact; no fabrication; no side effect; return the terminal answer to Nova | — |

## Autonomy

**L0 — read, recall, advise; nothing to actuate.** This desk only reads the sales rooms,
attempts recall, and returns a cited answer; it never sends, writes, books, parks a proposal,
or commits a change. There is **no checkpoint because there is nothing to approve** — the
answer is the workflow's terminal output, returned to the delegating agent (Nova). The L3
ceiling of the domain (room.md) does not apply: the advisory contract tops this out at L0
read-only (ADR-0136 B10, CONSTITUTION §10). `tools` are read-only retrieval only
(`pg.read` / `knowledge.search` / `memory.recall`) — no send/write/booking/delegate tool is
in scope, and the conformance gate enforces it for `archetype: advisory`.

## Guards (every stage carries these in its Audit)

- **Always cite + cite-or-abstain (A5 / A5b, CONSTITUTION §8).** Every factual claim carries
  its source — the `opportunity` / `account` / `interaction` / `contact` id + as-of (or a gold
  knowledge-object / memory ref). A fact the desk cannot cite it does **not** assert: it says
  "I don't know / I'd need X" and routes the gap to the agent or human who would know. An
  uncited claim is a defect; fabricating to sound complete is never allowed.
- **Stale-honesty (A5c).** Semantic recall is dormant until the retrieval tier + Voyage seed
  hydrate; an empty recall is **absence of memory, not absence of fact** — say so and still
  answer from the structured rooms + persona reasoning.
- **Never-exceed-caller (§5.2).** A question delegated on a user's behalf is scoped to THAT
  user's read permission — the desk must not surface a deal the asker couldn't see.
- **Pool, never bleed (A7).** The desk may reason across the whole deal base internally, but
  no client's identifiable specifics bleed into another's answer; cross-deal context is
  delivered only anonymized/aggregated.

## Runtime skills

None. This desk grounds entirely on the sales read surface (its OKF rooms) + semantic recall
+ Chase's persona judgment; it composes no domain- or workflow-tier runtime skill. Rules of
the format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
