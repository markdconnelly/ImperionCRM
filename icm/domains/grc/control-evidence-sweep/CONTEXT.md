# Workflow: control-evidence-sweep (grc v1)

**Job:** on a cadence or a control event, collect control evidence by reference,
detect gaps against SOC 2 / HIPAA / CMMC, and produce a gap report — parking any
control change for Roman.

**Trigger:** a scheduled compliance sweep (cadence) OR a control event (a
`posture_policy` change / baseline drift). One run per sweep scope.

**Handoff identity:** GRC has no actuation path at v1; remediation notes and any
control change hand off to Roman (Deputy CISO). Audit-by-reference — no client PII.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | collect-evidence | Pull posture/policy facts in scope; tie each to its control | — |
| 02 | detect-gaps | Map evidence to SOC 2 / HIPAA / CMMC; find gaps + drift | — |
| 03 | gap-report | Compile the gap report; park control changes; hand to Roman | **Yes** |

## Autonomy

Default rung **L1** (ADR-0061). Grace's persona ceiling is **L2** (auto-document
the evidence/gap record — internal, reversible), but this v1 tracer does not
actuate: stage 03 compiles the report and parks. When flipped to `auto`, it may
self-approve ONLY recording the evidence/gap report when the citation chain is
audit-clean. **Control changes and attestations always park** — in every mode
(CONSTITUTION §5.4).

## Runtime skills

None at v1 (the SOC 2 / HIPAA / CMMC control-mapping rubrics land as Tier-3 skills
later, #1557). Stages cite the posture/policy facts they ground on via their
Inputs table, never restate them. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
