# Workflow: cyber-risk-register (client-success v1)

**Job:** Celeste's **vCISO cyber-risk advisory** — take the posture/risk findings Vera
(Platform/Governance) measures and hands off, and curate them into the **client-facing
Client Risk Register** in the relationship's voice. Every risk and its recommended
mitigation is labeled signal-vs-inference. This is **recommendations only** — no
remediation commitment ever (the NO-COMMITS-EVER ceiling, dial-proof; celeste.md
guardrail 1) — and within the MSSP/vCISO advisory boundary: remediation is human / Datto
(celeste.md guardrail 2).

**Trigger:** a `relationship.posture.*` / governance handoff from **Vera** carrying
posture/risk findings about a client. Vera measures; Celeste curates and presents; a human
and Datto remediate. The cross-agent event bus is backend-owned (BE-W7 #437, the
`relationship.*` family on the ADR-0111 wake inbox). One run per handoff.

**What this is NOT:** no remediation, no remediation commitment, no client-facing send
without a human gate. The run assembles the internal draft register and **parks** the
client-facing register for human approval; the send exits only through ADR-0058. Vera owns
measurement (the handoff), Celeste owns curation/presentation, human/Datto own remediation
— that seam is the MSSP boundary and does not move.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ingest-findings | Ingest Vera's posture/risk handoff and frame the client | — |
| 02 | assess-risks | Assess + prioritize each risk (signal vs inference; likelihood/impact) | — |
| 03 | curate-register | Curate the client-facing risk register as a PARKED artifact (recommendations only) | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient** (a human co-shapes + approves).
At **L2**, the internal risk-register assembly auto-executes (reversible, signal-labeled).
**Every** recommended mitigation, the client-facing register itself, and any client-facing
send park for a human in every mode — and **no recommendation is ever a remediation
commitment**: the NO-COMMITS-EVER and MSSP-advisory-only ceilings are dial-proof
(celeste.md guardrails 1–2). Strict client-confidential boundary: one client's posture
never enters another's context (celeste.md guardrail 5).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `risk-register-rubric.md` (the client risk-register
structure, the signal-vs-inference discipline, the MSSP advisory boundary, and the
no-commits-ever rule). Mark-editable; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose is
`prose.md`.
