# Workflow: alert-triage (noc v1)

**Job:** every monitoring alert is correlated against the operational substrate,
classified noise vs incident vs security, and either flagged for a reversible
runbook remediation or handed to the right owner — with the correlation logic
shown.

**Trigger:** a monitoring alert lands from a wired source (Datto RMM device
alert, cloud-asset health event, an alert-derived ticket). One run per alert.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | correlate | Build the alert context from device/cloud-asset/ticket/account | — |
| 02 | classify | Decide noise / incident / security + remediation candidacy | — |
| 03 | route | Propose reversible remediation OR hand off to Felix/Cyrus | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). The v1 tracer runs at **L1** even though Ozzie's
ceiling is L4: when flipped to `auto` it may self-approve ONLY writing the
internal finding for an alert classed `noise`. Every reversible-restart
remediation, every incident handoff, and every security classification parks for
a human, in every mode. Destructive/identity actions and security events are
dial-proof — they never auto-execute at any rung (CONSTITUTION §5.4).

## Runtime skills

None at v1 (`skills: []`). Runbook catalogue and correlation rubrics arrive as
workflow-local Tier-3 skills when the remediation rungs (L3/L4) are dialled on.
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed workflow prose is `prose.md`.
