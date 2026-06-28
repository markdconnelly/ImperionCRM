# Workflow: security-alert-triage (soc v1)

**Job:** every Sentinel/Defender detection gets fast signal/noise triage, a
Microsoft-sourced threat-intel enrichment, and either a high-confidence reversible
containment proposal or a documented dismissal — handed off to Roman.

**Trigger:** a security alert lands from the Microsoft security plane — a Sentinel
incident or a Defender alert routed to the SOC. One run per alert.

**Handoff identity:** the SOC has no actuation path at v1; the containment
recommendation hands off to Roman (Deputy CISO) for execution.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | triage | Classify signal/noise; resolve implicated assets + identities | — |
| 02 | enrich | Ground the detection in Microsoft-sourced intel + asset posture | — |
| 03 | contain-or-propose | High-confidence reversible auto-isolate OR propose; hand to Roman | **Yes** |

## Autonomy

Default rung **L1** (ADR-0061). Cyrus's persona ceiling is **L4** (high-confidence
reversible containment under an IR runbook + undo window), but this v1 tracer does
not actuate: stage 03 drafts the proposal and parks for Roman. When flipped to
`auto`, it may self-approve ONLY recording the triage verdict for a
benign/false-positive alert with an audit-clean evidence chain. **Identity actions,
destructive actions, any client-facing effect, and every true-positive always
park** — in every mode (CONSTITUTION §5.4).

## Runtime skills

None at v1 (the IR runbook + threat-intel rubric land as Tier-3 skills when the
actuation path does, #1556). Stages cite the posture facts they ground on via
their Inputs table, never restate them. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
