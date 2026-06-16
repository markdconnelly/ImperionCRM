# ICM Layer 0 — how to operate anything under icm/

You are inside Imperion's ICM tree (ADR-0061). This file is the Layer-0
orientation: it tells you how to MOVE through these files, not what they say.
Format rules live in [CONVENTIONS.md](CONVENTIONS.md); read it before editing
anything.

## Routing (Layer 1)

To work on or run a business workflow: open
`domains/<domain>/<workflow>/CONTEXT.md` first — it names the trigger, the stage
order, and the workflow's autonomy contract (its structured manifest is
`agent.yaml`, its composed prose `prose.md`). Route to exactly one stage at a
time; the numbered folder IS the execution order. The reference implementation is
`domains/sales/lead-response/` (ADR-0088 domain tier, issue #701).

## Operating a stage

1. Read ONLY that stage's `CONTEXT.md`.
2. Load ONLY what its Inputs table lists (plus skills it cites — shared ones
   in `skills/`, workflow-local ones in the workspace's `skills/`). Loading
   unlisted context is a contract violation, not thoroughness.
3. Do the Process steps; produce exactly the named Outputs in the contract's
   format. Steps marked `[script]`-class mechanical work should be
   deterministic, not improvised reasoning.
4. Run the Audit checklist. Any failure parks the work — never best-effort
   past a red audit.
5. Outputs are edit surfaces: a human may rewrite any artifact before the next
   stage; never treat a prior artifact as immutable, never regenerate one a
   human edited.

## Dry-running with Claude Code (until the backend executor lands)

Claude Code MAY dry-run a workflow stage-by-stage against real or test lead
data, with these hard limits:

- **Never send anything.** Stage 04-class checkpoints are where a dry run
  STOPS — present the draft + rationale to Mark and end. There is no
  Claude-Code send path and you do not create one (sends are ADR-0058,
  backend-only).
- Artifacts go to a scratch location (`icm/_dryrun/`, git-ignored or
  deleted after) — run products are never committed; the repo holds the
  factory only.
- Production DB reads follow the §8 read-only rules (no PII into committed
  files, issues, or PRs).
- A dry run is an evaluation of the CONTRACTS — when a stage needs context
  its Inputs table doesn't grant, that is a finding to fix in the contract,
  not a license to load more.

## Changing these files

Issue → branch → micro-PR, one workflow or skill per PR (ADR-0060/0061
change control). An ADR that changes a reality described here updates the
affected files in the same PR.
