# Scripted agent-quality eval — the v1 AI-first acceptance gate

This is the **re-runnable artifact** behind ADR-0057's explicit v1 gate: before the v1.0
"Complete" cut, the orchestrator must answer across all **nine gold entity types**, run a
**board session over a real packet**, and pass **RAG citation spot-checks** — run green,
plus Mark's hands-on UX sign-off ([ADR-0057 §2](../../decision-records/ADR-0057-v1-complete-product-recut.md),
"v1 ships AI-first").

It is a script, not a one-off chat: the criteria are versioned data, the harness is
re-runnable, and results are recorded on the originating issue (#186).

[← Testing](../README.md) · [Testing strategy](../testing-strategy.md) ·
[ADR-0057](../../decision-records/ADR-0057-v1-complete-product-recut.md)

---

## Why two layers: pure vs live

The orchestrator + board runtime live in the **backend repo** (`ImperionCRM_Backend`)
and are **deploy-dormant in prod**; the front-end CI has **no backend reachable**. So the
harness can't run fully green yet. ADR-0057's intent is that the **script is the gate
artifact** — shipped now — and the live green run + Mark's sign-off happen against a
configured backend just before the cut. To honor that without breaking CI, the harness is
split:

| Layer | What it checks | When it runs | Status when no backend |
| --- | --- | --- | --- |
| **Pure** | Criteria are well-formed and **total/consistent over the nine gold entity types**; the per-response verdict logic is correct; the results document has the right shape. | Always, in CI (`npm test`). | **PASS** (asserted green) |
| **Live** | Drives the orchestrator (`POST /api/agent`), a board session (`POST /api/board/sessions`), and RAG citation spot-checks against a real backend. | `npm run eval` with `AGENT_EVAL_BASE_URL` set. | **`pending_no_backend`** (not fail) |

The guard is a single env var, **`AGENT_EVAL_BASE_URL`**. Unset ⇒ the live checks are
reported `pending_no_backend` and the runner exits 0; `npm test` stays green in CI.

---

## The three checks (ADR-0057)

1. **Orchestrator across the nine gold entity types.** One pass-criteria card per
   `entity_type` from [`db/migrations/0045_gold_knowledge_vectors.sql`](../../../db/migrations/0045_gold_knowledge_vectors.sql):
   `account, contact, device, contract, ticket, proposal, exposure, assessment, posture`.
   Each card has a synthetic trigger query, the sub-agent the orchestrator should route
   to, keywords the answer must contain, whether a gold-knowledge citation is expected,
   and a plain-English pass criterion. See [criteria reference](./criteria.md).
2. **Board session over a real packet.** `POST /api/board/sessions` over a real packet
   (reporting snapshot + campaign metrics + security posture + topic-knowledge retrieval,
   persisted to `board_session.packet_md`). Pass = a terminal session status with a
   non-empty recommendation.
3. **RAG citation spot-checks.** A handful of queries that must come back **grounded** —
   the answer carries at least one citation that resolves to a gold `knowledge_object`
   whose `entity_type` is the expected one.

Pass criteria are defined **per entity type** (and per board / per spot-check) in
[`scripts/agent-quality-eval.mjs`](../../../scripts/agent-quality-eval.mjs)
(`ENTITY_CRITERIA`, `BOARD_CRITERIA`, `RAG_CRITERIA`) and mirrored for humans in
[criteria.md](./criteria.md).

---

## The contracts driven

The harness drives the backend through the same contracts the GUI uses via
[`src/lib/services/external-client.ts`](../../../src/lib/services/external-client.ts)
(managed-identity caller-auth, ADR-0028):

```
Orchestrator: POST /api/agent
  { message, actingUserId, agent?, context?, conversationId? }
    → { text, routedTo, routingReason, usage, conversationId? }

Board:        POST /api/board/sessions
  { topic, actingUserId, personaAgentIds?, context?, cisoPosition?, advisorAgentIds? }
    → { sessionId, status, recommendation, usage }
```

---

## How to run

### In CI / no backend (the default, stays green)

```bash
npm test           # runs the PURE checks via vitest (scripts/agent-quality-eval.test.mjs)
npm run eval       # prints criteria + a pending-results document, exits 0
```

`npm run eval` with `AGENT_EVAL_BASE_URL` **unset** prints the criteria summary and a
results document where every live check is `pending_no_backend`, then exits 0.

### Against a configured backend (the gate run, before the v1 cut)

```bash
AGENT_EVAL_BASE_URL="https://<backend-host>" \
AGENT_EVAL_ACTING_USER_ID="<entra-user-guid>" \
  npm run eval
```

The runner calls the orchestrator for each of the nine entity types, runs one board
session, and runs the RAG spot-checks, printing a full results JSON and exiting **non-zero
on any failure**. Optional `AGENT_EVAL_BEARER` supplies a bearer token for a manually
fronted backend (it is **never logged**); in the deployed app the managed-identity token
is applied by `external-client.ts`.

> Even an all-green live run is **not** the whole gate: ADR-0057 also requires Mark's
> hands-on UX sign-off before the cut.

---

## Results — shape and recording

The harness emits a results document (see [`sample-results.json`](./sample-results.json)
for the shape). Every check carries `pass | fail | pending_no_backend` plus a `summary`
roll-up. The backend URL is **never** recorded in the artifact (no endpoint leakage).

Per the issue's "record results in the issue" requirement, the run output is pasted into
**issue #186**. The committed `sample-results.json` shows the current state: pure check
**pass**, all live checks **pending backend runtime**.

---

## Status: PENDING backend runtime

As of this commit the live checks are **pending** — the backend orchestrator/board runtime
is deploy-dormant and unreachable from FE CI. The pure checks are **green**. The gate
flips to a real green/red once `AGENT_EVAL_BASE_URL` points at a backend that exposes
`/api/agent` and `/api/board/sessions`.

## See also

- [criteria.md](./criteria.md) — the human-readable per-entity-type pass cards.
- [Testing strategy](../testing-strategy.md) — the layered approach and conventions.
- [ADR-0057](../../decision-records/ADR-0057-v1-complete-product-recut.md) — the v1 recut
  that makes this a gate.
