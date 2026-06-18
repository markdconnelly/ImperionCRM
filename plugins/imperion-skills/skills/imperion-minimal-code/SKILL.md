---
name: imperion-minimal-code
description: Imperion's minimalist-code discipline (vendored from the open-source "ponytail" ruleset) — a deliberation ladder to run BEFORE writing code (YAGNI → reuse what exists → native platform → installed dependency → one line → minimum that works), the areas laziness must never touch, and lightweight review/audit passes for over-engineering. Use before generating non-trivial code, when a change feels like it's growing too big for the ~400-line micro-PR budget, when asked to simplify / trim / de-engineer a diff, when reviewing a PR for over-engineering, or auditing a module for accidental complexity — in any ImperionCRM repo.
---

# Imperion: minimalist-code discipline ("ponytail")

Vendored from the MIT-licensed **ponytail** ruleset (DietrichGebert/ponytail) and tuned
to this four-repo system (ADR-0101). We keep the *idea*, not the dependency: this is an
on-demand skill inside the skills canon (ADR-0060), not the upstream auto-injecting plugin.
The goal is the house bottleneck — **review, not typing** (CLAUDE.md §10.4). Less generated
code = smaller diff = fewer Codex round-trips = it fits the ~400-line micro-PR budget (§3.2).

## The deliberation ladder — stop at the first rung that holds

Run this **before** writing non-trivial code. Tuned to our stack at each rung:

1. **Does this need to exist at all?** (YAGNI) — is there an issue asking for it, or are you
   inventing scope? Work you *discover* becomes a new issue (§3.1), not speculative code now.
2. **Does something we already have do this?** Reuse before you write: the typed data layer
   / repositories, a service barrel, `external-client.ts` (FE→backend), an existing ICM
   workspace, an ADR-settled pattern, the OKF concept for the entity. Grep/`graphify explain`
   first — duplicating a pattern is the common defect, not a missing one.
3. **Does a native platform feature cover it?** Next.js / React / Postgres+pgvector / Entra /
   Graph / Azure Functions — use the platform before hand-rolling (e.g. RBAC via Entra, not a
   bespoke gate; SQL set logic over app-side loops).
4. **Does an already-installed dependency solve it?** Use it. **No new dependency** if it can
   be avoided — a new package is an ADR-worthy supply-chain decision (§5), not a casual import.
5. **Can it be one line?** Make it one line.
6. **Only then:** write the minimum code that works, in the *right repo* (§1 boundary).

## Minimalist rules

- No abstractions, indirection, or config knobs nobody asked for. Deletion over addition.
  Boring over clever. Fewest files possible.
- No boilerplate nobody requested. No "framework" for a one-off.
- Question complex requests: "do you actually need X, or does an existing Y cover it?"
- When two solutions are the same size, pick the edge-case-correct one.
- Mark a deliberate simplification with a `ponytail:` comment noting the ceiling and the
  upgrade path — then file the follow-up as an issue (§3.1), never a bare TODO.

## Never lazy about (non-negotiable — these override the ladder)

Minimalism is about *gratuitous* code, not corner-cutting on correctness or safety. Always
do the full job on: **input validation at trust boundaries** · **error handling that prevents
data loss** · **security & the unified-security-standard baseline** (never commit secrets;
caller-gated routes; per-tenant isolation; no client PII — see `imperion-code-review`) ·
**executor / write-path idempotency** (backend ADR-0044) · **accessibility** · **anything the
issue explicitly asked for**. Migrations stay additive + idempotent regardless of size.

## Modes (adjust intensity to the work)

- **lite** — light touch; reuse-first nudge only. Default for trivial/mechanical edits.
- **full** — standard: run the full ladder, push back on unrequested scope. Default for
  hand-written feature/logic code.
- **ultra** — aggressive de-engineering; use on a module that's already over-built.
- **off** — skip the discipline. Appropriate for generated code (migrations, lockfiles,
  scaffolds) — which is also where `size-exception` legitimately applies.

## review — flag over-engineering in a diff

Read the diff (or `git diff <base>`) and report, concisely, only real findings: new
abstraction/dependency/config that nothing requested; logic that duplicates an existing
data-layer/service/ADR pattern; multi-line code reducible to one; a process in the wrong repo
(§1). Each finding: what to cut + the smaller replacement. Don't touch the non-negotiables
above. Pairs with `/code-review` (bugs) and `/simplify` (applies cleanups) — this one judges.

## audit — scan a module for accidental complexity

Sweep a directory/module for the same smells at rest (not a diff): dead code, unused exports,
speculative generality, near-duplicate helpers, deps that could be dropped. Output a ranked
list. **Each finding worth doing becomes its own GitHub issue** (§3.1) — never a TODO comment,
never "mentioned in chat."
