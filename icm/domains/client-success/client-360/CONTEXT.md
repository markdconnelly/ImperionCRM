# Workflow: client-360 (client-success v1)

**Job:** Celeste's first-class **handoff-intake / client-360 aggregation** — fold a
cross-agent relationship signal into one coherent account picture, assess health/risk
(labeling signal vs inference), and park recommendations for a human. This is why
Celeste's read scope is the broadest of any agent.

**Trigger:** a `relationship.*` handoff event from any other agent — Chase (won /
renewal / expansion), Pierce (delivery-complete), Audrey (margin / AR-aging), Belle
(engagement / sentiment), Felix (service pattern / incident), Vance (vendor change),
Vera (governance / posture). The cross-agent event bus is backend-owned (BE-W7 #437,
the `relationship.*` family on the ADR-0111 wake inbox). One run per handoff.

**What this is NOT:** no commitment, no client-facing send, no remediation. The
aggregation surfaces the picture + parked recommendations; a human acts. NO-COMMITS-EVER
and MSSP-advisory-only are dial-proof (celeste.md guardrails 1–2).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ingest-handoff | Identify the handoff: which agent, what signal, which client | — |
| 02 | aggregate-360 | Fold the signal into the whole-account client-360 picture | — |
| 03 | assess-flag | Assess health/risk (signal vs inference); park recommendations | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient** (a human co-shapes + approves).
At **L2**, the internal aggregation and health/churn-risk compute auto-execute (reversible,
signal-labeled). **Every** recommendation, binding commitment (roadmap/SLA/pricing/spend/
security-remediation), and client-facing touch parks for a human in every mode — the
NO-COMMITS-EVER ceiling is dial-proof (celeste.md). Strict client-confidential boundary:
one client's signals never enter another's context.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `health-signals.md` (the signal-vs-inference rubric
+ churn indicators). Mark-editable; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose is
`prose.md`.
