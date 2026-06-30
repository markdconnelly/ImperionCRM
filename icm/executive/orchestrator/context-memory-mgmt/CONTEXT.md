# Workflow: context-memory-mgmt (Orchestrator / Nova, the cross-turn grounding contract)

**Job:** for an active conversation/thread, assemble the grounded working context
Nova reasons over — recall the thread's prior turns and any deliberate memory,
drill from gold summaries to their verbatim bronze source by reference (ADR-0113),
cite everything, and mark recall misses as "no data" (never fill the gap). Then
curate: **propose** what from this thread is worth persisting to long-term memory
for future turns. Nova recalls but does not write memory — the capture is a proposal
that parks.

**Trigger:** invoked when a conversation needs grounding (turn start / context
refresh) or at conversation close for the curation pass. Per thread, not on a fixed
schedule.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | recall | Pull the thread's prior turns + deliberate captures + relevant gold summaries via the retrieval tier; attach a source reference (and the bronze drill ref per ADR-0113) to every item | — |
| 02 | ground | Assemble the working context — the cited picture for the current turn; flag every gap as "no data / no recall" | — |
| 03 | curate | Propose the durable facts/decisions worth persisting for future turns, each as a parked deliberate-capture proposal with its source; park | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Nova holds no
actuation tool, so the ceiling is *structural*. This workflow runs narrower still —
**L1 propose**: it recalls, grounds, and proposes what to persist. It **writes
nothing** (memory writes are out of Nova's budget — there is no store tool, ADR-0116)
and **actuates nothing**. Drill-to-source is by reference, not by copying verbatim
text into the reasoning substrate (ADR-0113). A recall miss is "I don't know," never
a guess (CONSTITUTION §8). The curation pass is a checkpoint — the persistence
proposals park for the human / Memory-MCP path; they are never written here.

## Runtime skills

None (Tier 3 empty). The job is recall → ground → propose; the voice and the
grounding discipline come from the composed Nova persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
prose is `prose.md`.
