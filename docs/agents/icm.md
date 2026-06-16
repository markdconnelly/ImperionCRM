# ICM — business-process automation definitions

Imperion automates MSP business processes (marketing → sales → project
management → service desk) using the Interpreted Context Methodology
(ADR-0061): staged pipelines defined as plain files, executed by the backend
orchestrator, with human checkpoints and a per-workflow autonomy dial.

- **Definitions:** [`icm/`](../../icm/CONVENTIONS.md) in this repo — the
  factory. Workflows live under the **domain tier**
  `icm/domains/<domain>/<workflow>/` (ADR-0088): a thin domain `room.md` +
  `room.yaml` budget, then per-workflow `CONTEXT.md` (routing) + `agent.yaml`
  (manifest) + `prose.md` + `stages/` + skill bundles. The reference
  implementation is
  [`icm/domains/sales/lead-response/`](../../icm/domains/sales/lead-response/CONTEXT.md)
  (issue #701).
- **Execution:** backend orchestrator (backend ADR-0036) — the product. Stage
  artifacts are Postgres run records, editable in the GUI between stages.
- **Trust ramp:** every workflow starts draft-for-approval; admins flip
  trusted workflows to `auto` per ADR-0061. Sends always exit via ADR-0058.
- **Two skill tiers:** dev skills = `plugins/imperion-skills/` (Claude Code); runtime skills = `icm/skills/` (shared, orchestrator-wide) + per-workspace `skills/` (workflow-local). See CONVENTIONS.md.
- **Workspace manifest:** each workflow carries an `agent.yaml` (ADR-0088, the
  CMA agent-object shape) — see [`agent-yaml-schema.md`](agent-yaml-schema.md)
  (schema [`icm/agent.schema.json`](../../icm/agent.schema.json), gate
  `scripts/agent-yaml-gate.mjs` / CI `icm-conformance`).
- **Authoring:** use the `imperion-icm` skill (skills plugin); changes are
  normal issue → micro-PR.

Current domains/workflows: see [`icm/domains/`](../../icm/domains/) — `sales/lead-response` is the live reference workspace.
