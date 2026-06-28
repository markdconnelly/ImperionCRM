# Workflow: proactive-updates (client-success v1)

**Job:** Celeste's **client-enablement send** playbook — proactively share an
important update a client should know and provide a knowledge asset (a how-to:
1Password, M365, etc.), in the relationship voice, **consent-gated and approval-gated**.
This is the **one** Celeste playbook that sends to a client (`send.email` / `send.dm`).

**Trigger:** a sharing opportunity surfaces — an advisory/notice a client should hear,
a knowledge asset that fits a contact's current need, or a churn-save outreach the
client-360 has flagged as warranted. One run per share.

**Boundary:** Celeste shares relationship-scope updates + enablement; she does not
own service incident comms (Felix) or brand/marketing sends (Belle) — coordinate at
the seam, never freelance into another agent's lane (celeste.md §Seams). Every send is
consent-gated; non-routine / customer-relationship-sensitive sends stay human-approved.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | identify-update | Identify the update/asset worth sharing + the client/contact | — |
| 02 | draft-share | Draft the share in the relationship voice; assert the consent basis | — |
| 03 | review-send | The consent-gated send via ADR-0058 | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). The **manifest default rung is L3** (capped at L3 by the
schema gate). At **L3** Celeste auto-**shares important updates** clients should know,
provides **knowledge assets WITH APPROVAL**, and runs **routine churn-save outreach**.
The **L4 ceiling** (described in `prose.md` / `celeste.md`, never the manifest rung):
fully-automatic sharing of routine **knowledge/enablement how-tos** (1Password, M365,
etc.). **Customer-relationship-sensitive / non-routine sends stay human-approved at
every rung** (celeste.md). NO-COMMITS-EVER and MSSP-advisory-only are dial-proof
(celeste.md guardrails 1–2). The full L0–L5 map is Celeste's (`celeste.md`).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `sharing-rubric.md` (what makes an update worth
proactively sharing, the knowledge-asset library framing, the L3-with-approval vs
L4-fully-auto distinction, the consent + relationship-sensitivity check, churn-save
framing). Mark-editable; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose
is `prose.md`.
