---
adr: 0084
title: "Claim migration & ADR numbers at merge, not at authoring"
status: accepted
date: 2026-06-13
repo: frontend
summary: "Parallel sessions collide on self-allocated migration/ADR numbers; assign the real number at merge against current `main`. Issue/PR numbers stay GitHub-allocated."
tags: [meta]
---
# ADR-0084: Claim migration & ADR numbers at merge, not at authoring

| Field | Value |
|---|---|
| **Repo** | all four (cross-repo workflow rule; normative copy in the system CLAUDE.md §10.3) |
| **Status** | Accepted |
| **Date** | 2026-06-13 |
| **Cross-references** | ADR-0042 (four-repo division of labor), ADR-0056 (versioning standard), system CLAUDE.md §3 (change workflow) + §10 (parallel-session concurrency contract) |

## Problem

Multiple Claude Code sessions now run against the four repos at once. Two numeric
sequences in the workflow are **global monotonic counters that GitHub cannot
allocate**:

- migration files — `db/migrations/NNNN_*` (owned by the frontend repo, the schema
  system of record);
- decision records — `docs/decision-records/ADR-NNNN-*`.

When two concurrent branches each "take the next number" at the moment they start
work, they pick the **same** number. The branch that merges second then collides:
either a duplicate migration number (which breaks ordered apply and `migrate.mjs`),
or two ADRs with the same id. This already happened — ADRs 0067/0068/0071/0072 were
raced between parallel sessions on 2026-06-12, and migration-number near-misses have
recurred since. A lock would serialize all parallel authoring, which defeats the
point of running many sessions.

## Context

Issue numbers and PR numbers do **not** have this problem: GitHub assigns them
atomically on creation, so two sessions can never collide. The only counters we
allocate ourselves are migrations and ADRs. The race exists *only* at allocation
time — once a number is committed to `main`, it is settled. So the fix is to move
allocation as late as possible: to the merge step, against the current tip of
`main`, where exactly one PR merges at a time.

This is cheap because both artifacts are self-contained and reference-light at
authoring time: a migration is one SQL file plus a couple of doc mentions; an ADR is
one Markdown file plus an optional index row and inbound `ADR-NNNN` citations.

## Options considered

1. **Reserve the number at branch start (status quo).** Simple to write, but races
   under concurrency — the failure we are fixing.
2. **A reservation registry / lock** (a pinned issue or a file each session claims).
   Removes the race but serializes allocation and adds a manual handshake that is
   easy to forget; stale claims accumulate.
3. **Assign the number at merge time (chosen).** No lock, no serialization of
   authoring; the only serialization is the merge itself, which GitHub already
   serializes per branch.

## Decision

**Author against a placeholder; assign the real number last, at merge.**

For migrations and ADRs:

1. While developing, use a placeholder id (e.g. `00XX_*` / `ADR-00XX-*`) or simply
   the locally-next number, understanding it is provisional.
2. **Immediately before merging**, rebase the PR on the current `main`, take the next
   free number for that sequence, rename the file, and fix every reference (inbound
   `ADR-NNNN` citations, `migrate.mjs` ordering, the decision-records README index
   row, any CLAUDE.md/docs mention).
3. Squash-merge. The branch that merges second renumbers — never the first.

Never reserve a migration or ADR number when a branch is created. For all
cross-references prefer GitHub-assigned **issue/PR `#N`** (race-free) over
pre-claimed local numbers.

## Consequences

- **Positive.** Concurrent sessions can no longer collide on migration/ADR numbers
  without any lock or registry; parallel authoring stays fully parallel. Numbers on
  `main` remain dense and strictly ordered.
- **Cost.** A small, mechanical renumber step is required at merge for any PR that
  adds a migration or ADR. For migrations this also means the final number is not
  known until merge, so PR descriptions should refer to the migration by what it
  does, not its number, until merged.
- **Operational.** Because frontend owns the schema (ADR-0042), migration renumbering
  only ever happens in the frontend repo. ADR renumbering can happen in any repo but
  is scoped to that repo's own `docs/decision-records/` sequence.
- **Enforcement.** This is a working-agreement rule, not yet CI-enforced; a future
  check could fail a PR that adds a migration whose number is ≤ the current `main`
  max. Tracked as a follow-up if collisions recur.
