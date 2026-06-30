# Stage 01 — intake

**Job:** turn the raw request/event into one grounded intake record — what is
asked, the entities it concerns, the recalled thread, and the asking human's
authority.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The request | the inbound ask/event | the verbatim ask + who is asking | what to route |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | entities named in the ask | resolve the real subjects across systems |
| Accounts | silver `account` · `okf:account` | accounts named/implied | who the request is about |
| Contacts | silver `contact` · `okf:contact` | people named/implied | who the request is about |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this thread's history + related context | recall, always cited |

## Process

1. `[sonnet]` Parse the ask into intent + subject + any constraints (consent,
   budget, deadline, urgency). Separate the request from the noise.
2. `[script]` Resolve named/implied entities via `entity_xref` → attach `account`/
   `contact` id + name only. Read-only.
3. `[haiku]` Recall the thread and related prior context via the retrieval tier;
   attach each item with its source reference. A miss is recorded as "no recall,"
   never filled with a guess.
4. `[script]` Record the asking human and their authority scope (used by stage 02
   for the most-restrictive bar).

## Outputs

`intake.md` — the parsed intent + constraints, the resolved entity ids in scope,
the cited recall items (or an explicit "no recall"), and the asking human + their
authority.

## Audit

- [ ] Intent and any constraints (consent/budget/deadline) are stated explicitly
- [ ] Every entity reference states its id; none invented
- [ ] Every recall item carries a source reference; a miss is recorded as "no recall," not a guess
- [ ] The asking human and their authority scope are recorded
- [ ] Read-only — nothing actuated, nothing written outside the run record
