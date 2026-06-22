---
adr: 0113
title: "Verbatim memory tier — agent recall alongside gold summaries"
status: proposed
date: 2026-06-21
repo: frontend
summary: "Introduce a verbatim memory tier (memory_drawer) that stores conversation/agent turns ORIGINAL-text, never summarized, recalled via the hybrid ranker — amending the 'agents consume Gold only' principle so the orchestrator can drill from gold summaries down to verbatim source. Wing/room scoping over the two-axis RLS access spine; capture is a backend process, vectorization is LocalPipeline; PII-bearing, RLS is the control, out of OKF."
tags: [meta, architecture, agents, memory, security]
---

# ADR-0113: Verbatim memory tier — agent recall alongside gold summaries

> **Number is a placeholder.** ADR-0113 is claimed at MERGE per system CLAUDE.md §10.3 —
> the branch that merges second renumbers. The companion migration is authored as
> `0167_memory_drawer.sql` against a placeholder and renumbered the same way.

| Field | Value |
|---|---|
| **Repo** | frontend (schema + doctrine owner, ADR-0042) |
| **Status** | Proposed |
| **Date** | 2026-06-21 |
| **Cross-references** | ADR-0041 (gold vector store / pinned Voyage 1024 contract) · ADR-0043 (settled AI stack) · ADR-0086/0104 (OKF semantic layer + grounding cortex) · ADR-0105 (two-axis RLS access spine) · ADR-0042 (four-repo split) · #1153 / migration 0166 (hybrid-search substrate) · epic #966 · #968 (personal data model) · #969 (memory hygiene) |

## Problem

Today the agent reads **summarized** memory by design. CLAUDE.md §4: *"Most agent reasoning
should consume Gold only,"* and Gold (`knowledge_object`, ADR-0041) is *AI-ready knowledge:
summaries, embeddings, knowledge objects* — one curated text **per entity**, paraphrased and
chunked. That is the right substrate for "tell me about account X," but it is the **wrong**
substrate for the questions a second-brain must answer:

- *"What exactly did the client say on the call?"*
- *"What did I decide last week, in my words?"*
- *"What were Felix's exact reasoning steps on that ticket?"*

A summary cannot answer these faithfully — the original wording, hedges, numbers, and
ordering are the answer. The reference systems we benchmarked against (MemPalace, OpenBrain /
OB1) are built on the opposite thesis: **store turns verbatim, never summarize, recall the
original text** (MemPalace cites 96.6% R@5 raw on LongMemEval doing exactly this). We have
**no verbatim memory tier with recall**: `personal_note` (migration 0153) is a stub — a
`body text` column with `ORDER BY created_at DESC` and no embedding, no search, no capture.

## Context

- **Phase 0 just landed** (#1153, migration 0166): the gold vector store is now
  hybrid-capable — GIN on `metadata`, generated `tsvector` on chunk text. The ranker
  primitives exist; nothing yet *writes* verbatim turns to recall over.
- **The access spine exists** (ADR-0105): two-axis Postgres RLS — owner axis (`app.user_id`,
  for personal data) and company axis (`app.groups`, role-scoped) — injected per-request via
  `withIdentity` GUCs, enforced by policies. App roles are non-BYPASSRLS (verified live
  2026-06-20). This is the floor a verbatim memory tier needs: one employee's verbatim
  drawer **must** be invisible to another even when both have full company access.
- **Four-repo contract** (ADR-0042 / §1): this repo owns schema + GUI reads; **processes**
  live in the backend; **ALL vectorization** lives in LocalPipeline.
- **The decision to borrow patterns, not dependencies** is already taken (knowledge-tiers
  design, 2026-06-20): own the substrate (pg + pgvector + MCP + RLS), steal MemPalace's
  structural scoping (wings→rooms→drawers) + incremental hybrid ranker, and OB1's write-time
  enrichment; reject local-first; promise none of their benchmark numbers on our data.

## Options considered

1. **Status quo — gold summaries only.** Agents keep reasoning over paraphrase.
2. **Make Gold itself verbatim.** Stop summarizing in `knowledge_object`; store raw text there.
3. **A distinct verbatim memory tier** (`memory_drawer`) recalled *alongside* Gold, on the
   shared vector space and the existing RLS spine.

### Tradeoffs

- **(1)** cannot answer the second-brain questions above — faithfully reproducing what was
  said is the product. Rejected.
- **(2)** conflates two jobs. Gold's value is the curated, deduped, per-entity rollup the
  orchestrator reasons over; making it verbatim destroys that and explodes its size. The
  medallion tiers are deliberately distinct. Rejected.
- **(3)** keeps Gold as the summary/index layer and adds a verbatim layer beneath it — the
  two-level shape already approved (cheap summary → drill to original). Reuses the 0166
  ranker primitives, the ADR-0041 vector space, and the ADR-0105 RLS floor. Chosen.

## Decision

Adopt a **verbatim memory tier** as a first-class part of the medallion + agent-memory model.

1. **`memory_drawer` table (this repo).** One row = one verbatim unit (a conversation turn, an
   agent step, or a user note), stored **original-text, never summarized**. It supersedes the
   `personal_note` pilot (0153) as the real drawer.

2. **Scoping = MemPalace structure mapped onto our model.**
   - `wing` — the entity the memory belongs to (a person, a project, or an **agent**;
     mirrors MemPalace wings and the per-agent diary).
   - `room` — the topic within a wing (scoped recall, not flat-corpus search).
   - The **two-axis RLS** (ADR-0105) is the hard boundary: personal drawers are
     **owner-scoped** (`owner_user_id` = `app.user_id`); company/shared drawers are
     role-scoped on `app.groups`. Both axes active at once, fail-closed.

3. **Verbatim recall is sanctioned alongside Gold — §4 is amended.** The orchestrator MAY
   consume `memory_drawer` rows in addition to Gold. Canonical pattern is **two-level**: Gold
   summary for breadth → drill to the verbatim drawer for the exact words. This is the one
   principle this ADR changes; the §4 text and `data-design-for-agents.md` are updated to say
   "Gold + the verbatim memory tier," not "Gold only."

4. **One vector space (ADR-0041).** Drawer rows embed into the pinned **Voyage `voyage-3-large`
   @ 1024** space. Because a drawer row is a **short verbatim unit** (a turn, not a document),
   the embedding is stored **inline** on `memory_drawer` (`embedding vector(1024)`), not
   chunked into `knowledge_embedding` — no chunking needed, simpler recall. A generated
   `english` `tsvector` (`fts`) gives the keyword stage, same shape as 0166.

5. **Capture is a backend process; vectorization is LocalPipeline (§1).** This repo ships only
   the table + RLS + GUI read path. The **sweep/capture loop** (idempotent per-turn write +
   OB1-style write-time metadata extraction with Haiku) is a **backend** issue; **embedding
   drawer rows** is a **LocalPipeline** issue (ALL vectorization lives there). Filed as
   sibling issues, proposed from here like any cross-repo schema consumer.

6. **PII + boundaries.** Verbatim memory **will** contain client PII and personal content —
   **RLS is exactly the control** (ADR-0105). The tier is **out of the OKF bundle** (the OKF
   PII rule, ADR-0086): OKF describes *meaning*, never holds content. Personal→company
   promotion is **never silent** — only the privileged curation service identity crosses the
   wall (ADR-0105 slice 3c), append-only ledgered, human-approved.

## Consequences

- **Positive.** The agent gains faithful recall (the MemPalace capability Mark named as the
  one to extract). Reuses the substrate end-to-end (0166 ranker, ADR-0041 vectors, ADR-0105
  RLS) — no new datastore, no new vector space, no new auth model. Replaces the dead
  `personal_note` stub with a real drawer; gives the 49-file flat auto-memory mess (#969) a
  governed home.
- **Negative / cost.** A new write path to maintain across three repos; verbatim storage
  grows faster than summaries (mitigated: short turns, retention policy is a later decision);
  embedding spend per turn (mitigated: content-hash idempotency, same as Gold). Amending the
  "Gold only" principle widens what the orchestrator reads — the two-level pattern keeps token
  cost bounded (summary first, drill on demand).
- **Security impact.** Net positive: verbatim memory without RLS would be the worst leak
  surface in the system; this ADR makes the RLS floor a precondition of the tier, not an
  afterthought. No new grants beyond the table's own role grants. No secrets.
- **Operational impact.** Retention/forgetting of verbatim memory and a "right to delete"
  path are real obligations deferred to a follow-up (not v1-blocking). Apply is Mark-gated and
  dormant on merge, like every migration.

## Future considerations

- **Memory MCP write surface** (Phase 4) — a write+recall memory MCP so Claude Code / Cursor /
  the orchestrator share one governed brain — is its **own ADR**, not this one.
- **Temporal validity windows** (Phase 3) — point-in-time "what was true when" over the
  memory graph — its own issue.
- **Recall benchmark** — a recall eval on redacted prod traces via the eval plane (#983) so
  "did the brain remember" is measured, not asserted.
