# Stage 01 — recall

**Job:** pull the thread's prior turns, any deliberate memory, and the relevant
gold summaries into one cited recall record, each item carrying a source reference
(and the drill reference to its verbatim bronze source).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The active thread | the conversation/thread in scope | thread id + current turn | what to ground |
| Thread transcript | bronze `agent_message` (drill target, ADR-0113) | this thread's prior turns | the verbatim turns a gold summary drills to |
| Deliberate captures | bronze `memory_drawer` (drill target, ADR-0113) | captures relevant to the thread | human notes + deliberate memories the agent may recall |
| Gold summaries | retrieval tier (`knowledge.search` / `memory.recall`) | conversation/knowledge summaries for the thread | the reasoning substrate; each keeps its bronze drill ref |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | entities named in the thread | resolve the real subjects across systems |
| Accounts | silver `account` · `okf:account` | accounts named/implied | who the thread concerns |
| Contacts | silver `contact` · `okf:contact` | people named/implied | who the thread concerns |

## Process

1. `[script]` Identify the thread in scope (thread id + current turn). Read-only.
2. `[haiku]` Recall the thread's prior turns and any deliberate captures via the
   retrieval tier; attach each item with its source reference. A miss is recorded as
   "no recall," never filled with a guess.
3. `[haiku]` Pull the relevant gold summaries; for **each** summary keep its drill
   reference to the verbatim bronze source (`agent_message` for transcripts,
   `memory_drawer` for deliberate captures) so faithful recall can resolve it later
   (ADR-0113). Do not copy verbatim bronze text into the record — keep the reference.
4. `[script]` Resolve named/implied entities via `entity_xref` → attach `account`/
   `contact` id + name only. Read-only.

## Outputs

`recall.md` — the thread's recalled prior turns, deliberate captures, and gold
summaries (each with its source reference + bronze drill ref), the resolved entity
ids in scope, and an explicit "no recall" for any miss.

## Audit

- [ ] Every recalled item carries a source reference; a miss is recorded as "no recall," not a guess
- [ ] Every gold summary keeps a drill reference to its verbatim bronze source (ADR-0113); no verbatim text copied in
- [ ] Every entity reference states its id; none invented
- [ ] Read-only — nothing actuated, no memory written (recall only)
