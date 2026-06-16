# Workflow: lead-response (marketing/sales v1)

**Job:** every inbound lead gets a fast, on-brand, consent-clean first response
and a managed follow-up loop, drafted by agents and sent on our behalf.

**Trigger:** a new lead lands from any wired source — Meta lead forms
(bronze, migration 0075), website forms, FB/IG DMs classified as a lead
inquiry, or an Apollo list entry enrolled in nurture. One run per lead.

**Sender identity:** the shared sales mailbox (ADR-0061; provisioning tracked
on the epic #272). DM replies go in-channel as the page identity.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | intake-triage | Classify + dedupe + fit-score the lead | — |
| 02 | research | Build the lead dossier from what we already know | — |
| 03 | draft-response | Channel-aware first response + rationale | — |
| 04 | review-send | Human approves/edits; send via ADR-0058 path | **Yes** |
| 05 | follow-up | Schedule/execute the follow-up loop; detect replies | re-enters 03 |

## Autonomy

Starts `draft` (ADR-0061). When flipped to `auto`, stage 04 may self-approve
ONLY: email replies to triage class `standard-inquiry` with audit-clean drafts
and an existing consent basis. Pricing/contract questions, complaints, DM
replies near the 24-hour window edge, and any audit failure always park for a
human, in every mode.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `icp.md` · `offer-catalog.md` ·
`channel-rules.md`. Domain-shared (Tier 2, `../skills/`):
`voice-and-tone.md` (promoted — every sales draft sounds the same).
Mark-editable business content; stages cite, never restate. Rules of the
format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`;
the composed workflow prose is `prose.md`.
