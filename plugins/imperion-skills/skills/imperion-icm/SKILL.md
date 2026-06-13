---
name: imperion-icm
description: Imperion CRM's ICM business-process automation framework — how to author/modify workflow workspaces under icm/ (stage contracts, runtime skill bundles, checkpoints, the autonomy dial) and where execution happens. Use when working with ICM, icm/ workspaces, business-process automation, lead response workflows, stage contracts, autonomy modes, approval queues, or the backend workflow executor in any ImperionCRM repo.
---

# Imperion: ICM workflow authoring

ADR-0061: business processes are defined as ICM workspaces in
`ImperionCRM/icm/` (the factory, versioned, micro-PR'd) and executed by the
backend orchestrator (the product — artifacts are Postgres run records shown
editable in the GUI, never files). Read `icm/CONVENTIONS.md` before touching
anything; it is the canonical format. This skill is the map, not the contract.

## Authoring a workflow (or changing one)

1. Issue first, one workflow change per micro-PR.
2. Layer 1 `CONTEXT.md`: what the workflow is, its trigger (event/schedule),
   the stage list, and what `auto` mode means here.
3. Stages `stages/NN-verb-noun/CONTEXT.md`, each with the six contract
   sections (Job / Inputs / Process / Outputs / Audit / Checkpoint-if-any).
   One stage, one job — split anything needing "and".
4. Runtime knowledge in `skills/*.md` — business content for the PRODUCT's
   agents (ICP, voice, channel rules). Do not confuse with this dev plugin.
5. Cite, never restate: ADRs, `icm/CONVENTIONS.md`, other skills.

## The non-negotiables (verify, don't assume)

- **Autonomy:** workflows start `draft`; the per-workflow `auto` flip is
  admin-only + audited (ADR-0061). A contract must say what `auto` may
  self-approve; unstated → parks for a human regardless of mode.
- **Sends:** any outbound communication exits via the ADR-0058 approval-gated
  path with consent re-asserted. No exceptions, no new send routes.
- **No secrets / no client PII** in `icm/` files. Reference rows by id.
- **Schema** for runs/approvals lives in this repo's migrations; the executor
  lives in `ImperionCRM_Backend` — don't build either from a sibling repo.

## Where things are

- Conventions (canonical): `icm/CONVENTIONS.md`
- Decision + trust-ramp rules: `docs/decision-records/ADR-0061-*.md`
- Workspaces: `icm/workspaces/<slug>/` (first: `lead-response`)
- Rollout order: marketing/sales → project management → service desk (#272)
