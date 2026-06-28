# Workflow: security-awareness (client-success v1)

**Job:** Celeste's **vCISO security-awareness / enablement recommendation** playbook —
take an awareness-gap / posture finding handed off by Vera, assess the client's
enablement needs, and **park** a recommended awareness plan (training topics, phishing-sim
cadence, policy reminders) for a human. Advisory only: Vera measures, Celeste recommends,
a human delivers.

**Trigger:** a `relationship.posture.*` / awareness-gap handoff from **Vera**
(governance / security / posture changes affecting the client, celeste.md §"The handoff
hub"). The cross-agent event bus is backend-owned (BE-W7 #437, the `relationship.*` family
on the ADR-0111 wake inbox). One run per handoff.

**What this is NOT:** no remediation, no compliance-management, no client-facing send. The
output is a *parked recommendation* a human reviews and delivers. **NO-COMMITS-EVER** and
**MSSP / vCISO advisory-only** are dial-proof (celeste.md guardrails 1–2): Imperion advises;
humans and Datto remediate.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ingest-gaps | Frame the client and the awareness-gap / posture finding Vera handed off | — |
| 02 | assess-needs | Assess the awareness/enablement needs (signal vs inference) | — |
| 03 | recommend-enablement | Park the recommended awareness/enablement plan | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient** (a human co-shapes + approves).
At **L2**, the internal needs assessment auto-executes (reversible, signal-labeled). **Every**
recommendation and **every** client-facing delivery (the training rollout, the phishing-sim,
the policy notice) parks for a human in every mode — the NO-COMMITS-EVER and MSSP-advisory-only
ceilings are dial-proof (celeste.md). Strict client-confidential boundary: one client's
posture or gaps never enter another's context.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `awareness-rubric.md` (how to map gaps → recommended
training topics, phishing-sim cadence, and policy reminders; the signal-vs-inference and
advisory-boundary discipline). Mark-editable; stages cite, never restate. Rules of the
format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
prose is `prose.md`.
