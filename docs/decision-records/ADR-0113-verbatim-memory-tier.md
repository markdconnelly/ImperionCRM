---
adr: 0113
title: "Verbatim memory — bronze turns, gold summaries, drill-down recall"
status: proposed
date: 2026-06-21
repo: frontend
summary: "Verbatim memory is bronze, split by origin: agent-run transcripts stay in the existing agent_conversation/agent_run/agent_message ledger (0056/0163); a new memory_drawer holds NON-agent verbatim (user notes + captured human conversations). Neither is summarized in place. The SUMMARY of each conversation lives in gold (knowledge_object, entity_ref=conversation_id, embedded + hybrid-searchable via 0166). Retrieval is two-level: search the gold summary, then drill to the verbatim bronze rows (memory_drawer or agent_message) via the reference. Amends §4 'consume Gold only' to 'reason/search over Gold; drill to bronze verbatim via references for faithful recall.' Two-axis RLS (ADR-0105); capture=backend, summary embedding=LocalPipeline; PII-bearing, RLS is the control, out of OKF."
tags: [meta, architecture, agents, memory, security]
---

# ADR-0113: Verbatim memory — bronze turns, gold summaries, drill-down recall

> **Number is a placeholder.** ADR-0113 is claimed at MERGE per system CLAUDE.md §10.3 —
> the branch that merges second renumbers. The companion migration is authored as
> `0167_memory_drawer_bronze.sql` against a placeholder and renumbered the same way.

| Field | Value |
|---|---|
| **Repo** | frontend (schema + doctrine owner, ADR-0042) |
| **Status** | Proposed |
| **Date** | 2026-06-21 |
| **Cross-references** | ADR-0041 (gold vector store / pinned Voyage 1024 contract) · ADR-0043 (settled AI stack) · ADR-0086/0104 (OKF semantic layer + grounding cortex) · ADR-0105 (two-axis RLS access spine) · ADR-0042 (four-repo split) · ADR-0100 (broad-employee-read posture) · #1153 / migration 0166 (hybrid-search substrate) · epic #966 · #968 (personal data model) · #969 (memory hygiene) |

## Problem

Today the agent reads **summarized** memory by design. CLAUDE.md §4: *"Most agent reasoning
should consume Gold only,"* and Gold (`knowledge_object`, ADR-0041) is *AI-ready knowledge:
summaries, embeddings, knowledge objects* — curated, paraphrased text. That is the right
substrate for "tell me about account X," but it is the **wrong** substrate for the questions a
second-brain must answer:

- *"What exactly did the client say on the call?"*
- *"What did I decide last week, in my words?"*
- *"What were Felix's exact reasoning steps on that ticket?"*

A summary cannot answer these faithfully — the original wording, hedges, numbers, and ordering
**are** the answer. The reference systems we benchmarked (MemPalace, OpenBrain / OB1) are built
on the opposite thesis: **store turns verbatim, never summarize, recall the original text**. We
have **no verbatim memory with recall**: `personal_note` (migration 0153) is a stub — a
`body text` column with `ORDER BY created_at DESC`, no capture, no path to a summary.

## Context

- **The medallion already places verbatim in BRONZE** (CLAUDE.md §4): bronze is *raw source
  data… no transformations; store original payloads.* A conversation turn is exactly that.
  Verbatim memory is therefore **not a new tier** — it is a bronze table. The SUMMARY belongs
  in **gold** (where summaries + embeddings already live). The link between them is the win.
- **The agent transcript already exists.** `agent_conversation` → `agent_run` → `agent_message`
  (0056/0163, the Jarvis 3-level ledger) captures agent-run turns verbatim (`agent_message.content`),
  and `agent_memory` holds per-agent fact/summary. So agent verbatim is **already solved** — a
  new table for it would duplicate the ledger. The genuine gaps are (a) **non-agent** verbatim
  (user notes + captured human conversations), (b) the gold-summary **reference** + two-level
  recall, (c) **two-axis RLS** for personal scoping. Hence the split below.
- **Phase 0 landed** (#1153, migration 0166): the gold store is now hybrid-capable — GIN on
  `metadata`, generated `tsvector` on chunk text. That is the search index for the **summary**;
  bronze needs no index of its own.
- **The access spine exists** (ADR-0105): two-axis Postgres RLS — owner axis (`app.user_id`)
  and company axis (`app.groups`) injected per-request via `withIdentity`, enforced by
  policies; app roles are non-BYPASSRLS (verified live 2026-06-20). One employee's verbatim
  drawer **must** be invisible to another even with full company access.
- **Four-repo contract** (ADR-0042 / §1): this repo owns schema + GUI reads; **processes** live
  in the backend; **ALL vectorization** lives in LocalPipeline.
- **Borrow patterns, not dependencies** (knowledge-tiers design, 2026-06-20): own the substrate
  (pg + pgvector + RLS), take the **two-level shape — cheap summary index → verbatim
  drill-down, which gold/bronze already gives** — reject local-first; promise no benchmark
  numbers on our data.

## Options considered

1. **Status quo — gold summaries only.** Agents keep reasoning over paraphrase.
2. **A standalone verbatim store outside the medallion**, with its own inline embeddings, that
   the agent vector-searches directly (the literal MemPalace shape).
3. **Verbatim in BRONZE + summary in GOLD + a gold→bronze reference.** Capture turns raw in
   `memory_drawer` (bronze, no embedding); produce one gold `knowledge_object` summary per
   conversation (embedded, hybrid-searchable via 0166); link them by the gold object's
   polymorphic `entity_ref = conversation_id`. Recall is **two-level**: search the summary,
   then drill to the verbatim rows.

### Tradeoffs

- **(1)** cannot answer the second-brain questions — faithfully reproducing what was said is
  the product. Rejected.
- **(2)** duplicates the vector store, invents a tier outside the medallion, and makes every
  short turn its own embedding (cost + noise) — and it discards the curated summary layer that
  makes retrieval *cheap*. It fights the architecture we already have. Rejected.
- **(3)** fits the medallion exactly: bronze stays raw (no transform), gold stays the
  summary/search index (reusing 0045/0166 unchanged), and the **reference is the retrieval
  mechanism**. The agent searches few, dense summaries → drills to many, faithful turns only
  when needed. Bounded token cost, faithful recall, zero new vector space. Chosen.

## Decision

Adopt **bronze verbatim + gold summary + gold→bronze reference** as the memory model, with the
verbatim bronze **split by origin**.

1. **Two verbatim bronze stores, split by origin** (Mark, 2026-06-21).
   - **Agent-run transcripts stay where they are** — `agent_conversation` → `agent_run` →
     `agent_message` (0056/0163). No new table; no migration of the live ledger.
   - **`memory_drawer` (new, this repo)** is the verbatim store for **non-agent** memory:
     user-authored notes and captured human conversations (a call/meeting not run through an
     agent). One row = one original-text turn/note, grouped by `conversation_id`, ordered by
     `turn_index`; **no embedding, no tsvector** — bronze is the faithful store, not a search
     index. Supersedes the `personal_note` stub (0153).

2. **Gold summary — existing path, for either store.** Each conversation's summary is a gold
   `knowledge_object` chunked + embedded into the pinned **Voyage `voyage-3-large` @ 1024**
   space (ADR-0041) and hybrid-searchable (0166), with `entity_ref` = the conversation id and
   `entity_type` naming the origin (`memory` for a `memory_drawer` conversation, `conversation`
   for an `agent_conversation`). **No gold schema change** — the polymorphic
   `entity_type`/`entity_ref` already models this.

3. **The reference is the system.** Retrieval is **two-level**: hybrid-search the gold
   summaries → for a hit, follow `entity_ref` to load the verbatim rows from the store its
   `entity_type` names (`memory_drawer` or `agent_message`). This summary→verbatim drill is the
   "quick retrieval" the whole model exists for. Richer cross-memory references (a memory
   graph) are Phase 3.

4. **Scoping = MemPalace structure mapped onto our model.** `wing` = the entity the memory
   belongs to (`user:<id>` / `project:<id>` / `agent:<slug>` — person, project, or per-agent
   diary); `room` = the topic within a wing (scoped recall). The **two-axis RLS** (ADR-0105) is
   the hard boundary: personal drawers are **owner-scoped** (`owner_user_id = app.user_id`,
   invisible cross-employee); agent/company drawers (`owner_user_id` NULL) are visible to any
   **identified** caller. Fine-grained `required_group` role-scoping is **reserved** and
   enforced when access-spine slice 3a (#979) lands — matching today's broad-employee-read
   posture (ADR-0100). Fail-closed.

5. **§4 is amended.** *"Most agent reasoning should consume Gold only"* becomes *"reason and
   search over Gold; for faithful recall, drill from a Gold summary to its verbatim Bronze
   source via references."* This is the one principle the ADR changes; §4 and
   `data-design-for-agents.md` are updated in this PR.

6. **Capture = backend; summary embedding = LocalPipeline (§1).** This repo ships the bronze
   table + RLS + GUI reads + one owner-scoped user-note write. The **sweep/capture loop**
   (idempotent per-turn write, resume-safe; OB1-style write-time metadata extraction with
   Haiku into `source_metadata`/the gold summary) is a **backend** issue (#303). Producing +
   embedding the gold **summary** from the bronze rows is a **LocalPipeline** issue (#300) —
   ALL vectorization lives there.

7. **PII + boundaries.** Verbatim memory **will** contain client PII and personal content —
   **RLS is exactly the control** (ADR-0105). The tier is **out of the OKF bundle** (OKF PII
   rule, ADR-0086): OKF describes *meaning*, never holds content. Personal→company promotion is
   **never silent** — only the privileged curation service identity crosses the wall (ADR-0105
   slice 3c), append-only ledgered, human-approved.

## Consequences

- **Positive.** Faithful recall (the MemPalace capability to extract) with **no new datastore,
  no new vector space, no new tier, no gold schema change** — bronze gains one raw table, gold
  reuses 0045/0166, access reuses ADR-0105. The summary→verbatim reference keeps retrieval
  cheap (search few summaries, drill on demand). Replaces the dead `personal_note` stub and
  gives the 49-file flat auto-memory mess (#969) a governed home.
- **Negative / cost.** A capture write path to maintain across repos; verbatim storage grows
  faster than summaries (mitigated: short turns; retention/forgetting is a later decision);
  summary embedding spend (mitigated: content-hash idempotency, same as Gold). Widening §4
  beyond "Gold only" is bounded by the two-level pattern (summary first, drill on demand).
- **Security impact.** Net positive: verbatim memory without RLS would be the worst leak
  surface in the system; this ADR makes the RLS floor a precondition. No new grants beyond the
  table's own role grants. No secrets.
- **Operational impact.** Retention/forgetting and a "right to delete" path are real
  obligations deferred to a follow-up (not v1-blocking). Apply is Mark-gated; dormant on merge.

## Future considerations

- **Memory MCP write surface** (Phase 4) — a write+recall memory MCP so Claude Code / Cursor /
  the orchestrator share one governed brain — is its **own ADR**.
- **Memory reference graph + temporal validity windows** (Phase 3) — cross-memory references
  and point-in-time "what was true when" — its own issue.
- **Recall benchmark** — a recall eval on redacted prod traces via the eval plane (#983) so
  "did the brain remember" is measured, not asserted.
