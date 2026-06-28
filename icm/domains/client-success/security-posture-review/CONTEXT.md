# Workflow: security-posture-review (client-success v1)

**Job:** Celeste's **vCISO posture review & client reporting** — ingest a posture-findings
handoff from **Vera** (Platform/Governance, who measures and scores the posture), fold it
into the relationship context, and produce a client-facing posture report in the
relationship's voice. **STRICT MSSP boundary: advisory / visibility only** — posture, risk,
recommendations; remediation is **human / Datto**, never Celeste (celeste.md guardrail 2,
dial-proof).

**Trigger:** a `relationship.posture.*` handoff event from **Vera** (the measure→present
seam) carrying the scored posture findings for a client. The cross-agent event bus is
backend-owned (BE-W7 #437, the `relationship.*` family on the ADR-0111 wake inbox). One run
per handoff. Celeste does NOT measure posture and does NOT read the Security-domain posture
substrate directly — the facts arrive as Vera's handoff (the measure→present→remediate seam).

**What this is NOT:** no remediation, no remediation commitment, no client-facing send. The
review presents the posture + parked recommendations; a human approves any send and human /
Datto remediates. NO-COMMITS-EVER and MSSP-advisory-only are dial-proof (celeste.md
guardrails 1–2).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ingest-posture | Ingest Vera's posture-findings handoff + frame the client relationship | — |
| 02 | assess-report | Assess + structure the client posture report (signal vs inference; recommendations only) | — |
| 03 | finalize-report | Finalize the client-facing report as a PARKED artifact | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient** (a human co-shapes + approves). At
**L2**, the internal posture-report assembly auto-executes (reversible, signal-labeled). **Every**
client-facing send and **every** remediation routing parks for a human in every mode — the
NO-COMMITS-EVER and MSSP-advisory-only ceilings are dial-proof (celeste.md). Strict
client-confidential boundary: one client's posture never enters another's context.

## The measure→present→remediate seam

This workflow owns only the **present** segment. **Vera measures and scores** the posture
(the Security-domain substrate is hers, not Celeste's). **Celeste presents** the findings in
the relationship's voice. **Human / Datto remediate.** Do not cross seams: Celeste neither
re-scores Vera's findings nor proposes a remediation action — she frames, contextualizes, and
recommends, then parks.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `posture-reporting-rubric.md` (how to present a posture
review to a client — structure, signal-vs-inference, the MSSP advisory boundary, the
measure→present→remediate seam). Mark-editable; stages cite, never restate. Rules of the
format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose
is `prose.md`.
