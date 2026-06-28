# Workflow: qbr-prep (client-success v1)

**Job:** prepare a client's **Quarterly / Technology Business Review** — assemble the
review pack a human will facilitate: the period recap (service, projects, value
delivered), the health + posture read, the forward agenda, and the talking points /
recommendations. This is the assessment-led-GTM review (ADR-0022) grounded in the
`strategic_business_review` substrate (ADR-0086).

**Trigger:** a QBR/TBR cadence falling due, or an on-demand request from a human ("prep
the QBR for ACME"). One run per scheduled review.

**What this is NOT:** no commitment, no client-facing send, no live facilitation. The
output is an internal prep pack + parked recommendations; a human runs the review and
owns every commitment in it (roadmap · SLA · pricing · spend · security-remediation).
NO-COMMITS-EVER and MSSP-advisory-only are dial-proof (celeste.md guardrails 1–2). The
standing plan is [`account-success-plan`](../account-success-plan/CONTEXT.md); this
workflow turns it (plus the period's signals) into a review pack.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | period-recap | Read the review period: service, projects, value delivered, the QBR record | — |
| 02 | health-and-forward | Health/posture read + the forward agenda (signal vs inference) | — |
| 03 | assemble-pack | Assemble the QBR pack: recap · health · agenda · talking points/recs | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient** (a human co-shapes + approves).
At **L2**, the internal pack **assembly** and the health/value compute auto-execute
(reversible, signal-labeled). **Every** recommendation, binding commitment
(roadmap/SLA/pricing/spend/security-remediation), and client-facing touch parks for a
human in every mode — the NO-COMMITS-EVER ceiling is dial-proof (celeste.md). Strict
client-confidential boundary: one client's review never enters another's context.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `qbr-agenda.md` (the QBR/TBR pack structure + the
value-narration + signal-vs-inference discipline). Mark-editable; stages cite, never
restate. Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed prose is `prose.md`.
