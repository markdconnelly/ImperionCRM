# Workflow: joiner-mover-leaver (identity v1)

**Job:** every HR lifecycle event (or review cadence) resolves to one access
decision — a verified leaver deprovision, or a proposed least-privilege grant for
a joiner/mover — handed off to Roman.

**Trigger:** an HR joiner/mover/leaver event (from Holly) OR an access-review
cadence. One run per lifecycle event.

**Handoff identity:** identity has no actuation path at v1; the deprovision/grant
proposal hands off to Roman (Deputy CISO) for execution. Audit-by-reference — no
client PII.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | resolve-event | Verify + classify the lifecycle event; resolve the identity | — |
| 02 | scope-access | Leaver = deprovision set; joiner/mover = least-priv grant set | — |
| 03 | decide-handoff | Verified-leaver deprovision proposal OR gated grant; hand to Roman | **Yes** |

## Autonomy

Default rung **L1** (ADR-0061). Osiris's persona ceiling is **L3** (a verified-
leaver deprovision auto-executes under the JML runbook — reversible, asset-scoped),
but this v1 tracer does not actuate: stage 03 drafts the proposal and parks. When
flipped to `auto`, it may self-approve ONLY recording the lifecycle verdict for a
verified event with an audit-clean resolution chain. **Grants, elevation, and
break-glass always park** — in every mode (CONSTITUTION §5.4).

## Runtime skills

None at v1 (the JML runbook + role→least-privilege mapping rubric land as Tier-3
skills when the actuation path does, #1558). Stages cite what they ground on via
their Inputs table, never restate it. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
