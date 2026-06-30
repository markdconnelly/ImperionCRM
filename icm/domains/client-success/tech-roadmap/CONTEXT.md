# Workflow: tech-roadmap (client-success v1)

**Job:** Celeste's **vCIO strategic-planning** playbook — DRAFT a client's multi-year
technology roadmap / strategic plan: frame current vs target state, sequence the
initiatives by client-value × dependency, and write the strategic narrative. The
roadmap is a **recommendation to a human**, never a commitment.

**Trigger:** a vCIO planning ask for a specific client — a QBR/SBR strategic-planning
session, an annual-plan refresh, or a human request to draft a roadmap. One run per
client planning cycle.

> 💤 **DORMANT until the vCIO assembly substrate (#1043) lands.** This playbook is
> authored capability-complete but **inert** until #1043 provides the planning-assembly
> surface (built-but-inert, ADR-0123). Until then it does not run in production.

**What this is NOT:** no commitment, no client-facing send, no remediation, no spend
authorization. The roadmap is **drafted and parked** for a human to take to the client;
a human (and the customer) decide. NO-COMMITS-EVER and MSSP-advisory-only are dial-proof
(celeste.md guardrails 1–2).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | strategic-context | Read the account + strategic record + opportunities; frame current vs target state | — |
| 02 | shape-roadmap | Sequence the initiatives by client-value × dependency (signal vs inference) | — |
| 03 | draft-plan | Draft the roadmap as a PARKED recommendation; no commitments | **Teams-loop** |

## Autonomy

Rung **L1 — propose only** (a Teams-loop gradient: a human co-shapes the draft and
approves). The whole roadmap — every initiative, every refresh spend, every SLA
target — **parks for a human** in every mode; this workflow commits nothing and sends
nothing. The NO-COMMITS-EVER ceiling is dial-proof (celeste.md guardrail 1); no rung
crosses it. Security advisory only (guardrail 2). Strict client-confidential boundary:
one client's plan never enters another's context.

## Persistence (#1688 — workspace-as-SoR, A8)

The vCIO technology roadmap is a **living, versioned document**: the **ICM Workspace IS its
source of record** (ADR-0136 A8 — the uniform dual-audience document, not a tabular silver
entity; a roadmap is binding-class prose, not rows). It must persist, version, and be
referenced across QBRs — no longer an ephemeral run-row. The **persist · version ·
attest-preserve write path is backend-owed** (the doc executor — approval-gated, never a
direct silver write; the cross-repo twin). **Persistence ≠ commitment:** every roadmap
initiative / refresh spend / SLA target still parks for a human (NO-COMMITS-EVER,
dial-proof). Graduates 08-G from procedure-only → realized, dormant on the backend doc executor.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `roadmap-rubric.md` (the roadmap structure +
signal-vs-inference discipline + the no-commits / handoff framing). Mark-editable;
stages cite, never restate. Rules of the format: `../../../CONVENTIONS.md`. The
structured manifest is `agent.yaml`; the composed prose is `prose.md`.
