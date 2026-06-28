# Workflow: renewal-reprice (sales v1)

**Job:** for an approaching renewal, Chase drafts the reprice and the renewal
proposal — **Audrey (Finance) supplies the margin input**; Chase drafts the number,
Audrey grounds it. **L1 propose-only**: the customer-facing send is dial-proof
always-gated and never auto-executes.

**Trigger:** a renewal approaching on an `opportunity` (`kind=renewal`) — surfaced
by the renewals motion (ADR-0130) / Jarvis. One run per renewing opportunity.

**Cross-agent seam:** the margin floor is **not** Chase's to compute — he reads
`{operational, client_pii}`, not financials. Audrey's renewal-margin grounding
playbook (Finance #1426) produces the grounded margin; it arrives here as a
**handoff input**, not a direct financial read. Chase drafts within that floor.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | renewal-context | Read the renewal opportunity, current terms, account history | — |
| 02 | margin-input | Take Audrey's grounded margin floor (handoff); flag if missing | — |
| 03 | draft-reprice | Draft the reprice + renewal proposal within the margin floor | — |
| 04 | review-send | Human approves; customer-facing send via ADR-0058 (always-gated) | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). **L1 propose-only.** The customer-facing send (the priced
proposal / send-for-signature) is an **always-gated, dial-proof hard ceiling** —
pricing/discount/term is a commitment that binds the company (ADR-0128 D2, Chase's
guardrail) and **never auto-executes at any rung**. Internal context-gathering and
drafting proceed; the send always parks for a human, in every mode.

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `voice-and-tone.md`. Workflow-local (Tier 3,
`./skills/`): `renewal-rules.md` (reprice guardrails — margin floor, no fabricated
urgency, escalate large swings). Mark-editable; stages cite, never restate. Rules of
the format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed prose is `prose.md`.
