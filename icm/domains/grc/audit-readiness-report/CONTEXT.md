# Workflow: audit-readiness-report (grc v1)

**Job:** for a named compliance framework (SOC 2 / HIPAA / CMMC), assemble the
control-evidence and posture status from posture facts, identify the gaps that
block audit readiness, and produce a readiness report + remediation backlog —
parking every control attestation and remediation for Roman.

**Trigger:** an audit-readiness request scoped to a framework (a pre-audit
preparation run, a periodic readiness check, or an attestation-window kickoff).
One run per framework + scope.

**Handoff identity:** GRC has no actuation path at v1; the remediation backlog and
any control attestation hand off to Roman (Deputy CISO). A control without
satisfying evidence is **unverified, never asserted compliant**. Audit-by-reference
— no client PII.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | scope-framework | Pin the framework + scope; resolve the in-scope controls + accounts | — |
| 02 | assemble-evidence | Pull posture/policy facts; map each to its control; mark verified vs unverified | — |
| 03 | gap-report | Compile the readiness report + remediation backlog; park attestations; hand to Roman | **Yes** |

## Autonomy

Default rung **L1** (ADR-0061). Grace's persona ceiling is **L2** (auto-document
the readiness/evidence record — internal, reversible), but this v1 tracer does not
actuate: stage 03 compiles the report and parks. When flipped to `auto`, it may
self-approve ONLY recording the internal readiness report when the citation chain
is audit-clean. **Control attestations and remediations always park** — in every
mode (CONSTITUTION §5.4).

## Runtime skills

None at v1 (the SOC 2 / HIPAA / CMMC readiness-scoring rubrics land as Tier-3
skills later, #1557). Stages cite the posture/policy facts they ground on via their
Inputs table, never restate them. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
