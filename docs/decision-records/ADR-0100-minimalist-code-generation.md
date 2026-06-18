---
adr: 0100
title: "Minimalist-code generation discipline (vendored \"ponytail\")"
status: proposed
date: 2026-06-18
repo: frontend
summary: "Vendor the MIT-licensed ponytail ruleset into a new on-demand skill (imperion-minimal-code) in the imperion-skills canon rather than installing the upstream marketplace plugin. Agents run a stack-tuned deliberation ladder (YAGNI -> reuse what exists -> native platform -> installed dependency -> one line -> minimum) before writing non-trivial code, with a non-negotiable list (trust-boundary validation, error handling, security baseline, executor idempotency, accessibility, explicit requests) that overrides minimalism. Cuts generated code -> smaller diffs -> less review, the bottleneck per CLAUDE.md section 10.4."
tags: [agents, skills]
---
# ADR-0100: Minimalist-code generation discipline (vendored "ponytail")

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-18 |
| **Cross-references** | ADR-0060 (skills canon), frontend CLAUDE.md §3.2 / §10.4 |

> ADR number is a placeholder — claimed at merge per system CLAUDE.md §10.3.

## Problem

Agents tend to over-produce: speculative abstractions, unrequested config, new dependencies,
and re-implementations of patterns the codebase already has. Every extra line is reviewed by
Codex and counts against the ~400-line micro-PR budget (§3.2). Review — not typing — is the
real throughput cap (§10.4), so gratuitous code is the most expensive kind.

## Context

The open-source **ponytail** ruleset (DietrichGebert/ponytail, MIT) encodes a "lazy senior
dev" discipline: a deliberation ladder run before writing code, plus areas where laziness is
forbidden. It ships as a marketplace plugin that auto-injects via Node lifecycle hooks across
many agent hosts.

We already have a single canonical home for agent capabilities — the `imperion-skills` plugin
in this repo (ADR-0060, §9) — explicitly to avoid out-of-canon, single-machine, unreviewed
agent behavior.

## Options considered

1. **Adopt the upstream plugin** via `extraKnownMarketplaces` / `enabledPlugins` per machine.
2. **Vendor the ruleset** as a new on-demand skill in `imperion-skills`, tuned to our stack.
3. **Do nothing** — rely on the micro-PR budget + reviewer to catch over-engineering after
   the fact.

### Tradeoffs

- (1) lowest authoring effort, but adds an external dependency that updates outside our
  control, sits outside the ADR-0060 canon, and can't be tuned to our four-repo boundaries.
- (2) keeps the capability reviewed, versioned, ADR-disciplined, and reachable on every agent
  machine via the existing marketplace; lets the ladder reference our data layer / service
  barrels / ADR patterns. Cost: we maintain the copy. Upstream is MIT, so vendoring is clean.
- (3) cheapest now, but pushes all the cost onto review — the exact bottleneck we want to
  relieve — and catches waste only after it's written.

## Decision

Vendor the ruleset (option 2) as `plugins/imperion-skills/skills/imperion-minimal-code/`.
Agents are expected to run the deliberation ladder before writing non-trivial code, observe
the minimalist rules, and never apply minimalism to the non-negotiable areas (trust-boundary
validation, error handling, security baseline, executor idempotency, accessibility, anything
the issue explicitly asked for). The skill is **on-demand** (loaded by its description
trigger), not an auto-injecting hook — consistent with how every other skill in the canon
works. We do not install the upstream plugin.

## Consequences

### Security impact

None direct. The skill explicitly subordinates minimalism to the unified-security-standard
baseline and the non-negotiable list, so it cannot be read as license to cut security corners.
No secrets or PII (skills replicate to every agent machine, ADR-0060).

### Cost impact

Net reduction: less generated code → fewer review round-trips and lower token spend, the
benefit ponytail measures upstream (80–94% less code, 42–75% cheaper on Claude models). One-off
authoring + ongoing skill maintenance is the only cost.

### Operational impact

A new skill in the canon; `imperion-skills` plugin version bumped. Changing the ladder later is
a normal micro-PR in this repo. Attribution to upstream ponytail (MIT) is kept in the skill.

## Future considerations

If we ever want generation-time *enforcement* (not just on-demand guidance), revisit the
upstream lifecycle-hook approach as a separate ADR. Could also wire a `review`-mode pass into
CI as an advisory check.
