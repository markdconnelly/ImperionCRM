# Workflow: social-inbound-reply (sales v1)

**Job:** an inbound social engagement (DM or public comment) that an intent
classifier routed as **sales-intent** gets a fast, on-brand, consent-clean draft
reply from Chase — parked for human approval (L1 propose-only, no send path).

**Trigger:** an inbound social `interaction` (FB/IG/Threads DM or comment)
classified sales-intent and routed to Chase. Non-sales intents route elsewhere
(Belle for brand/engagement, Felix for support-misroute). One run per engagement.

**Boundary:** Chase qualifies + drafts the sales reply; he does **not** own the
public brand voice on social (Belle does) — he answers the routed sales question.
Replying 1:1 to an existing CUSTOMER on social is Belle's hard prohibition; a
sales-intent engagement from a **lead/prospect** is Chase's to draft.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | intent-confirm | Confirm sales-intent + dedupe the author to a contact/lead | — |
| 02 | research | Build a short dossier from prior interactions + account context | — |
| 03 | draft-reply | One channel-correct draft reply + rationale | — |
| 04 | review-send | Human approves/edits; send via ADR-0058 path | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). **L1 propose-only.** In v1, **every** social reply
(DM or public comment) parks for a human regardless of mode — all 1:1/public
social replies are human-approved (the ADR-0124 D4 posture). Internal triage,
research, and drafting proceed; the customer-facing send always parks. Stop /
unsubscribe / opt-out is honored immediately and outranks everything
(`social-reply-rules`).

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `voice-and-tone.md`. Workflow-local
(Tier 3, `./skills/`): `social-reply-rules.md` (the per-channel social
constraints). Mark-editable; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
prose is `prose.md`.
