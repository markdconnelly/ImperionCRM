---
adr: 0120
title: "Eval→improvement feedback loop + PII-safe golden harvest"
status: proposed
date: 2026-06-22
repo: frontend
summary: "Close the eval loop: failed evals / low-scored agent_run rows open Mark-gated tuning candidates (prompt|grant|skill proposals) that never auto-apply, and golden cases are harvested from real traces through a fail-closed PII-redaction contract so no client row-level data enters the eval corpus. Extends ADR-0106 (eval plane)."
tags: [meta, agents, security]
---

# ADR-0120: Eval→improvement feedback loop + PII-safe golden harvest

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-22 |
| **Extends** | ADR-0106 (eval & quality plane), backend ADR-0077 (eval runner) |
| **Cross-references** | ADR-0043 (Claude+Voyage, no new provider), ADR-0091 (single orchestrator), ADR-0107/#1034 (data_class ceiling), #1036 (earned autonomy), system CLAUDE.md §8 (redaction rule) |

## Problem

The eval plane (ADR-0106) **measures** quality but does not **close the loop**:

1. A failing eval / low-scored `agent_run` produces no actionable artifact — a human has to
   notice the red gate and decide what to change. The signal evaporates.
2. The richest source of new golden cases is what agents have **actually done** — the
   `agent_run` / `agent_message` ledger (0056). But that ledger carries verbatim client data
   (`client_pii` / `financial`, #1034), and the eval corpus (`agent_eval_case`) is
   curated/synthetic-ONLY by contract (§8; ADR-0106 §6). So a real trace can never be copied
   into a case verbatim — yet hand-authoring every case ignores the best available realism.

We need (a) a path from a low score to a concrete, **human-gated** improvement proposal, and
(b) a path from a real trace to a golden case that **provably** strips PII first.

## Context

- The autonomy dial is rising (#996/#1036). The track record of *which proposals were accepted
  and applied* is exactly the signal earned autonomy reads — so the loop must record decisions
  as data.
- §8 is absolute: no client row-level PII leaves the DB into any artifact. Redaction is a
  security control, not a convenience — it must be testable and fail-closed.
- The AI stack is settled (ADR-0043): any synthesis/judge reuses the existing Claude tier; no
  new provider, no external eval SaaS (ADR-0106 already rejected option 2).
- Ledger ownership split (§1): schema + read surface + redaction contract are front-end-owned;
  the runtime that reads traces, calls the LLM, and files proposals is backend-owned.

## Options considered

**For the loop artifact:**
1. Auto-apply the proposed prompt/grant/skill change when an eval fails. *Rejected* — violates
   the autonomy ceiling (#1036); a quality regression must never trigger an unreviewed code/config
   change.
2. A GitHub issue per candidate, filed by the runtime. Viable as the *external* artifact but
   GitHub is not the system of record for agent-platform state.
3. **A DB-backed `agent_tuning_candidate` proposal row, Mark-gated, surfaced in the cockpit**, with
   an optional `external_ref` to a filed issue. (Chosen.)

**For the harvest:**
1. Copy de-identified traces in best-effort. *Rejected* — best-effort redaction is not a contract.
2. **A pure, fail-closed redaction library every harvested string passes through, with a residual
   re-scan that throws on any surviving token; synthesis preferred over lossy copy.** (Chosen.)

## Decision

### The redaction contract (the security crux)

`src/lib/agent/eval-harvest.ts` is the single, pure, unit-tested gate from a trace to a stored case:

- **`redactPii(text)`** replaces every recognised token (email, phone, money, URL, IP, UUID, long
  number, two-word proper name) with a **typed placeholder** (`[EMAIL]`, `[MONEY]`, …) — never the
  original substring. It is conservative: it **over-redacts** rather than risk a leak.
- **`residualPii` / `assertHarvestSafe`** re-scan the redacted candidate and **throw**
  (`HarvestRedactionError`) if any sensitive token survives. The harvester MUST call the guard and
  **drop** the candidate on throw. A trace that cannot be made safe is never harvested.
- The guard's error names the **kind** only, never the matched value (which is the PII).
- This is **defence-in-depth on top of** the `data_class` RLS floor (0175): the harvester reads
  under a permission-scoped identity; this guarantees the *corpus* stays clean even when the
  *source row* was legitimately readable. **No row-level client PII enters `agent_eval_case`.**

A harvested case is stamped `harvest_source = 'harvested'` + `harvest_run_id` (0179) so its
redacted origin is auditable; curated cases keep the `'curated'` default.

### The feedback loop

A failed eval / low-scored run opens an **`agent_tuning_candidate`** (0179): `kind` ∈
{prompt, grant, skill}, a PII-free `title` + `rationale` citing the failing eval/run, an optional
human-readable `proposed_diff`, provenance (`source_eval_result_id` / `source_run_id`), an optional
`external_ref` (e.g. an auto-filed GitHub issue), and a `status` (open → accepted/rejected/applied).
**It never auto-applies anything** — applying a prompt/grant/skill change is a human decision
(autonomy ceiling, #1036). `decided_by` / `decided_at` record the accept/apply track record #1036
later reads.

### Ownership split

- **Front end (this PR):** the schema (0179), the **redaction contract + library** (pure, tested),
  the tuning-candidate read surface (cockpit card on `/agents/evals`), and this ADR.
- **Backend (follow-up, this ADR authorises):** the runtime harvester (read low-scored ledger rows
  → `buildHarvestCandidate` → insert harvested case) and the auto-filer (open a candidate +
  optionally file the GitHub issue). It calls the FE redaction library as the shared contract.

### Slice scope

This PR ships **schema + redaction contract + read surface + ADR, dormant** — no harvester, no
auto-filer, no LLM/GitHub calls (those are the backend follow-up). Mirrors ADR-0106 slice 1.

## Consequences

### Security impact

- **The §8 contract is enforced in code, not by convention:** the fail-closed guard + PII fixtures
  (`eval-harvest.test.ts`) are the proof no PII reaches the corpus. Over-redaction is the chosen
  failure mode.
- `agent_tuning_candidate` text is operator/agent-authored **proposal** text describing a
  code/config change — same no-PII/no-secrets bar as `agent_eval_case`; the guard covers the
  `reason` field too.
- The loop **cannot** mutate agent behaviour: it only proposes; the autonomy ceiling holds.
- Grants follow the ledger split (0179): backend RW, web SELECT+UPDATE (operator decides), no
  DELETE, pipeline nothing. **Never commit secrets.**

### Cost impact

- Negligible in this slice (schema + pure code). The backend harvester/judge reuses the existing
  Claude tier (ADR-0043); harvesting runs on low-scored rows only, not the full ledger.

### Operational impact

- Operators get a triage queue of improvement proposals on `/agents/evals`; accept/apply is a
  human action. Accepted/applied candidates become the earned-autonomy track-record signal (#1036).
- Agent-platform operational tables (same class as `agent_run` / `agent_eval_*`) — **not** silver
  business entities, so absent from the OKF bundle (`semantic-layer-not-affected`).

### Future considerations

- Backend harvester + auto-filer (follow-up issue).
- Richer candidate review UI (accept/reject from the cockpit wired to the UPDATE grant).
- Feeding the accepted/applied signal into the #1036 earned-autonomy score.
