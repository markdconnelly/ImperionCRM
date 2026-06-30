# Workflow: security-posture-review (client-success v1)

**Job:** Celeste's **vCISO posture review & client reporting** — read the client's MEASURED
`posture_snapshot` (scored by **Vera**'s Platform/Governance segment), fold it into the
relationship context, and produce a client-facing posture report in the relationship's voice.
**STRICT MSSP boundary: advisory / visibility only** — posture, risk, recommendations;
remediation is **human / Datto**, never Celeste (celeste.md guardrail 2, dial-proof).

**Trigger:** a `relationship.posture.*` cue (posture-review cadence, a QBR window, or a Vera
drift alert) for a client. Celeste reads the latest `posture_snapshot` **directly** (#1689 —
direct read resolved over handoff-fed, so the review runs before the #991/BE-W7 bus). She does
NOT *measure or re-score* posture — the scoring is Vera's segment of the
measure→present→remediate seam; Celeste reads the measured snapshot read-only (`sec`
data_class → audit-by-reference) and presents it.

**What this is NOT:** no remediation, no remediation commitment, no client-facing send. The
review presents the posture + parked recommendations; a human approves any send and human /
Datto remediates. NO-COMMITS-EVER and MSSP-advisory-only are dial-proof (celeste.md
guardrails 1–2).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | read-posture | Read the client's measured `posture_snapshot` + frame the client relationship | — |
| 02 | assess-report | Assess + structure the client posture report (signal vs inference; recommendations only) | — |
| 03 | finalize-report | Finalize the client-facing report as a PARKED artifact | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient** (a human co-shapes + approves). At
**L2**, the internal posture-report assembly auto-executes (reversible, signal-labeled). **Every**
client-facing send and **every** remediation routing parks for a human in every mode — the
NO-COMMITS-EVER and MSSP-advisory-only ceilings are dial-proof (celeste.md). Strict
client-confidential boundary: one client's posture never enters another's context.

## The measure→present→remediate seam

This workflow owns only the **present** segment. **Vera measures and scores** the posture (the
scoring is hers; Celeste reads the resulting `posture_snapshot` read-only and never re-scores
it). **Celeste presents** the findings in the relationship's voice. **Human / Datto remediate.**
Do not cross seams: Celeste neither re-scores the snapshot nor proposes a remediation action —
she frames, contextualizes, and recommends, then parks.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `posture-reporting-rubric.md` (how to present a posture
review to a client — structure, signal-vs-inference, the MSSP advisory boundary, the
measure→present→remediate seam). Mark-editable; stages cite, never restate. Rules of the
format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose
is `prose.md`.
