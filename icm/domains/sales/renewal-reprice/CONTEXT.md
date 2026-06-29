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

**Scope (Stream 02-A7 + 02-A8):** stages 01-03 are the **draft renewal & repricing**
(02-A7 — `identified → priced → quoted`); stage 04 is the **send-for-signature gate**
and stage 05 the **post-signature back-sync** (02-A8 — `sent → renewed | repriced |
churned`). A7→A8 is one continuous renewal motion, so it lives in one workspace.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | renewal-context | Read the renewal opportunity, current terms, account history | — |
| 02 | margin-input | Take Audrey's grounded margin floor (handoff); flag if missing | — |
| 03 | draft-reprice | Draft the reprice + renewal proposal within the margin floor | — |
| 04 | review-send | The SEND GATE — human authorizes the send-for-signature (always-gated) | **Yes** |
| 05 | sign-and-backsync | On signature → update agreement + stamp outcome (renewed/repriced/churned); declined → Handoff to Celeste | — |

## Autonomy

Starts `draft` (ADR-0061). **L1 propose-only through the gate.** The customer-facing
send-for-signature (stage 04) is an **always-gated, dial-proof hard ceiling** —
pricing/discount/term is a commitment that binds the company and a bound signature has
no clean undo (ADR-0128 D2, A10 row 4, Chase's guardrail) — so it **never auto-executes
at any rung**. The **post-signature back-sync** (stage 05) runs only AFTER the
human-authorized signature returns: it is an internal, reversible mirror write
(update the agreement, `opportunity.write` the outcome stamp), **idempotency-keyed +
read-back** (A9), so it may proceed at L2. Internal context-gathering, drafting, and the
post-signature mirror proceed; the send always parks for a human, in every mode.
**Substrate (dormant, A5c):** the e-signature dispatch (DocuSign/`esign`, ADR-0071) and
the Autotask write-back (#422/#425) are deploy-dormant — stage 05 ships propose-only
until they land.

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `voice-and-tone.md`. Workflow-local (Tier 3,
`./skills/`): `renewal-rules.md` (reprice guardrails — margin floor, no fabricated
urgency, escalate large swings). Mark-editable; stages cite, never restate. Rules of
the format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed prose is `prose.md`.
