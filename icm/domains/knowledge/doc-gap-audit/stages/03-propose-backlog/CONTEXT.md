# Stage 03 — propose-backlog

**Job:** assemble the documentation-gap backlog from the stale / missing units and
surface it to a human. **Publishing the backlog and notifying anyone are gated.**

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Coverage record | stage 02 `coverage.md` | `stale` / `missing` units | the gaps to turn into backlog items |

## Process

1. `[script]` Filter to the `stale` and `missing` units — each is one documentation
   gap. `covered` units carry no backlog item.
2. `[sonnet]` For each gap, write one backlog row: the asset (by CI id), the account,
   the gap kind (`stale` / `missing`), and a one-line proposed action — **refresh** the
   stale doc, or **author** a new runbook for a missing asset. On a `missing` asset,
   propose *authoring* — **never invent a doc path or location**, and never write the
   doc's content.
3. `[script]` Mark the run **gated**: the backlog is propose-only. Publishing it to the
   SoR (IT Glue) and notifying anyone await a human — no publish, no notify, no send
   happens here.

## Outputs

`backlog.md` — one row per documentation gap: CI id, account (by reference), gap kind
(`stale` / `missing`), proposed action (`refresh` / `author`), and proposed status
`awaiting-human`. All references by id; no invented path, no secret, no PII. The run
ends gated — Alivia has proposed the backlog; disposition is the human's.

## Audit

- [ ] Every `stale` / `missing` unit from stage 02 has exactly one backlog row
- [ ] No backlog row invents a doc path / location — a `missing` asset proposes `author`, not a fabricated location
- [ ] No secret value, no PII, no client identifier in any backlog row (reference only)
- [ ] Run is marked gated — no publish, no notify, no send executed in this stage

## Checkpoint

A human reviews the proposed backlog and prioritizes the work. **Publishing the
backlog to the SoR (IT Glue) and notifying anyone are gated — `auto` may never
self-approve a publish or a notify; both park in every mode** (ADR-0128 hard ceiling).
This workflow holds no write tool and no send path: `auto` may assemble and surface the
internal backlog, but only a human-approved publish changes the SoR and only a human
sends. The actual doc-drafting of any approved item is `doc-sync`'s job, not this run's.
