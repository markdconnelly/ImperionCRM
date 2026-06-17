---
adr: 0061
title: "Interpreted Context Methodology as the business-process automation framework"
status: consolidated
date: 2026-06-12
repo: frontend
summary: "The factory lives in git; the product lives in the platform."
tags: [agent-icm]
consolidated_into: ADR-0091
---
# ADR-0061: Interpreted Context Methodology as the business-process automation framework

> Consolidated into [ADR-0091](ADR-0091-agent-icm-platform-consolidated.md). Retained for history.

| Field | Value |
|---|---|
| **Repo** | frontend (cross-repo contract; backend executes) |
| **Status** | Accepted (2026-06-12, Mark's grilling answers) |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0042 (four-repo), ADR-0058 (approval-gated sends), ADR-0060 (skills canon), backend ADR-0036 (orchestrator runtime), #272 (epic), #273, #274 |

## Problem

The MSP business process (marketing → sales → project management → service desk)
needs agent automation that is auditable, human-steerable, and incrementally
trustable. Ad-hoc prompts inside the orchestrator don't give us reviewable
process definitions, staged human checkpoints, or a path from "drafts for
approval" to "runs autonomously". The Interpreted Context Methodology
(github.com/RinDig/Interpreted-Context-Methdology), as set out in the MWP paper
*"Interpretable Context Methodology: Folder Structure as Agentic Architecture"*
(Van Clief & McDermott, arXiv:2603.16021, 2026), provides exactly that shape:
filesystem-defined staged pipelines, per-stage context contracts, plain-text
artifacts, checkpoints. But ICM is natively a dev-machine pattern, and ADR-0042
says the backend owns all processes.

## Options considered

1. **Hybrid — ICM definitions as canon, backend executes** (this decision).
2. Claude Code ops layer running ICM workspaces directly — rejected: moves
   business processes outside the backend, breaking ADR-0042; runtime would
   depend on a dev machine/session rather than the identity-gated platform.
3. Backend-only, ICM as inspiration (no literal workspace files) — rejected:
   loses the glass-box property (process definitions reviewable/editable as
   plain files in PRs) that is the reason to adopt ICM at all.

## Decision

**The factory lives in git; the product lives in the platform.**

- **Definitions (factory):** ICM workspaces are versioned in THIS repo under
  `icm/` — one folder per business workflow, numbered stage folders, each stage
  a `CONTEXT.md` contract (Inputs/Process/Outputs/Audit), plus runtime skill
  bundles (ICP, voice, offer catalog, channel rules). Changing a workflow is a
  normal issue → micro-PR. Conventions: [icm/CONVENTIONS.md](../../icm/CONVENTIONS.md).
- **Execution (product):** the backend orchestrator (backend ADR-0036) runs a
  workflow as a sequence of single-job agent turns, loading ONLY that stage's
  contract + referenced context per turn (ICM layered loading; settled AI stack
  ADR-0043 — Haiku for mechanical stages, Sonnet for drafting/judgment). Stage
  artifacts persist as run records in Postgres (schema proposed here, separate
  PR), not as files — every artifact remains human-readable and editable
  between stages via the GUI.
- **Checkpoints = the approval queue.** A checkpoint stage emits an approval
  item in the app; the run parks until a human approves/edits/rejects.
  Outbound sends always exit through the ADR-0058 approval-gated send path.
- **The autonomy dial (the trust ramp):** every workflow carries
  `autonomy_mode` — `draft` (every checkpoint requires a human) → `auto`
  (checkpoints self-approve within the workflow's skill set; exceptions still
  park). All workflows START in `draft`. Flipping to `auto` is per-workflow,
  admin-only in the GUI, audited, and reversible. A `tiered` mode
  (auto for low-risk actions, approval for substantive ones) is anticipated but
  needs its own ADR defining tier boundaries before it exists.
- **Rollout order (Mark, 2026-06-12):** marketing/sales first (lead response +
  nurture: Meta lead forms→email, website forms→email, FB/IG DM in-channel
  replies, Apollo outbound — sender identity = a shared sales mailbox), then
  project management, then service desk (e.g. backup-failure monitor agent —
  the canonical draft→auto example).

## Security impact

- The autonomy flip is the new high-trust control: admin-gated
  (`agents:operate`-class permission), audit-logged, per-workflow. Default and
  reset state is `draft`.
- Outbound comms still re-assert consent at execution (ADR-0058 unchanged);
  `auto` mode self-approves the checkpoint, never bypasses consent or the send
  path's logging.
- ICM definition files are reviewable in PRs — process changes (what an agent
  may say/do on our behalf) get the same review discipline as code. No secrets
  or client PII in `icm/` files, ever (same rule as ADR-0060 skills).
- New capability surfaces (shared mailbox, Meta send permissions) are each a
  human-approved security event before wiring.

## Cost impact

Per-stage scoped context is the cheap path. The paper reports ~2–8k tokens/stage
versus 30–50k for a monolithic prompt — but treat these as the **authors'
observational figures, not a benchmark**: they come from their own runs (no
controlled comparison, Claude-only) and are directional, not a guarantee for our
workloads. The mechanism is sound regardless: load only a stage's Inputs table,
and run deterministic steps as `[script]` code (no model call at all) rather than
on a model tier. Run volume is bounded by lead volume, and `draft` mode keeps a
human in every loop while costs are characterized against our own telemetry.

## Operational impact

Workflow definitions deploy by merging to main (backend reads the synced
definitions); no new infrastructure for the definition layer. The executor,
schema, mailbox, and Meta send capability are tracked as child issues of #272.

## Future considerations

- `tiered` autonomy ADR once draft-mode response quality is measured.
- Project-management and service-desk workspaces reuse the same conventions —
  no new framework decisions expected.
- If a workflow ever needs complex mid-pipeline branching (ICM's acknowledged
  weak spot), model it as separate event-triggered workflows rather than
  branches.
