# Agent-quality eval — pass-criteria reference

Human-readable mirror of the machine criteria. The **authoritative, importable** copy is
the pure data in [`scripts/agent-quality-eval.mjs`](../../../scripts/agent-quality-eval.mjs)
(`ENTITY_CRITERIA`, `BOARD_CRITERIA`, `RAG_CRITERIA`) — the harness and the vitest suite
both import it, so this table can never silently drift from a "second source": the pure
test (`validateCriteria`) fails if the cards stop covering the nine gold entity types.

> Trigger queries are **synthetic** (a placeholder "Contoso" tenant). No client PII or
> identifiers live in the criteria — real, volatile answers resolve against live data at
> run time (system CLAUDE.md §8).

## Check 1 — orchestrator across the nine gold entity types

Entity types are the `entity_type` set in
[`db/migrations/0045_gold_knowledge_vectors.sql`](../../../db/migrations/0045_gold_knowledge_vectors.sql)
(the gate's nine; `itglue_doc` and other "…" types are out of scope here).

| `entity_type` | Expected routing (substring of `routedTo`) | Citations? | Pass criterion |
| --- | --- | --- | --- |
| `account` | `crm` | yes | Routes to CRM; answer names the account and cites gold account knowledge. |
| `contact` | `crm` | yes | Routes to CRM; identifies a contact and cites the dossier (no PII fabrication). |
| `device` | `itglue` | yes | Routes to IT Glue; enumerates devices from gold device knowledge with citations. |
| `contract` | `autotask` | yes | Routes to Autotask; states contract term/renewal and cites the contract record. |
| `ticket` | `autotask` | yes | Routes to Autotask; lists open tickets with status and cites the records. |
| `proposal` | `proposal` | yes | Routes to the Proposal agent; summarizes the proposal and cites the document. |
| `exposure` | `posture` | yes | Routes to security/posture; lists exposures and cites the findings. |
| `assessment` | `posture` | yes | Routes to posture/security; summarizes assessment findings with citations. |
| `posture` | `posture` | yes | Routes to posture; reports posture vs benchmark and cites the snapshot. |

For each row the harness asserts the answer text contains the card's keywords
(case-insensitive), `routedTo` includes the expected routing substring, and — where
`expectCitations` is true — at least one gold-knowledge citation is returned.

> The expected-routing values describe the **single orchestrator's** sub-agent fan-out
> (CRM, Autotask, IT Glue, Proposal, posture/security — CLAUDE.md §4). They are matched as
> substrings, so a `routedTo` like `crm-agent` or `posture/security` still passes; tune
> them in `ENTITY_CRITERIA` when the backend's actual sub-agent names are finalized.

## Check 2 — board session over a real packet

- **Topic:** "Should we expand the managed-security offering to Contoso next quarter?"
- **Real packet** = reporting snapshot + campaign metrics + security posture + topic
  knowledge retrieval, persisted to `board_session.packet_md`.
- **Pass:** `POST /api/board/sessions` returns a session whose `status` is terminal
  (`complete`/`completed`/`done`) and whose `recommendation` is non-empty.

## Check 3 — RAG citation spot-checks

Each spot-check query must come back **grounded** — at least one citation resolving to a
gold `knowledge_object` of the expected `entity_type`:

| Query intent | Expected cited `entity_type` |
| --- | --- |
| Source of Contoso's contract renewal date | `contract` |
| Source of Contoso's latest posture score | `posture` |
| Where the open-ticket count is recorded | `ticket` |

## Status

These criteria are **shipped and green** as pure checks. The live verdicts are
`pending_no_backend` until `AGENT_EVAL_BASE_URL` points at a reachable backend — see the
[README](./README.md).
