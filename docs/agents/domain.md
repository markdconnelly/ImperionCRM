# Domain docs (for the engineering agents)

> **Scope.** A **developer-crew** convention: how the engineering skills consume
> this repo's domain documentation when exploring the codebase. Not part of the
> runtime AI suite — for that, start at [The AI suite](README.md).

[← The AI suite](README.md)

## Before exploring, read these

- **`CLAUDE.md`** at the repo root (and the system-level `CLAUDE.md` one level up).
- **`docs/decision-records/`** — this repo's ADRs (`ADR-NNNN-slug.md`). Read the
  ones that touch the area you're about to work in. The agent/ICM decisions are
  consolidated in
  [ADR-0091](../decision-records/ADR-0091-agent-icm-platform-consolidated.md).

This is a single-context repo: one `CLAUDE.md`/`CONTEXT.md` at the root and one ADR
directory at `docs/decision-records/` (NOT `docs/adr/`), no `CONTEXT-MAP.md`.

If any of these files don't exist, **proceed silently.** Don't flag their absence;
don't suggest creating them upfront. The producer skill (`/grill-with-docs`)
creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CLAUDE.md
├── docs/decision-records/
│   ├── ADR-0001-example-decision.md
│   └── ADR-0002-another-decision.md
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (an issue title, a refactor proposal, a
hypothesis, a test name), use the term as defined in the glossary / `CLAUDE.md`.
Don't drift to synonyms the glossary explicitly avoids. For the *business*
vocabulary of the silver tier, the canon is the OKF semantic layer
([agent-rooms-okf.md](agent-rooms-okf.md)).

If the concept you need isn't in the glossary yet, that's a signal — either you're
inventing language the project doesn't use (reconsider) or there's a real gap (note
it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than
silently overriding:

> _Contradicts ADR-0007 (example decision) — but worth reopening because…_
