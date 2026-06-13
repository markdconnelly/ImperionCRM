# ADR-0074: Service-desk depth — SLA, CSAT/NPS, live chat, chatbot deflection, routing

| Field | Value |
|---|---|
| **Repo** | frontend (schema + surfaces); backend (chatbot, surveys, Autotask write-back); pipeline (SLA refresh) |
| **Status** | Proposed (2026-06-12, scope locked with Mark; **SoR boundary vs Autotask is the key call for review**) |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0044 (silver contracts/tickets), ADR-0059 (Defender incident → Autotask ticket linkage), ADR-0061 (ICM — service-desk workspace #280), ADR-0041 (gold knowledge / chatbot grounding), ADR-0014 (consent ledger), ADR-0042 (division of labor) |
| **Epic** | #320 · Parent #314 |

## Problem

Tickets are ingested as **silver from Autotask** (ADR-0044, migration `0074_ticket_queue`) and knowledge exists, but service-desk depth is missing: SLA timers/breach, CSAT/NPS, live chat, chatbot deflection, and omnichannel routing. These are table-stakes for the service side of every major CRM.

## Context — the key architectural question

Today **Autotask is the system of record for tickets**; Imperion reads them as silver. ADR-0059 already links Defender incidents *to* Autotask tickets rather than creating a parallel ticket. Building SLA/CSAT/live-chat as Imperion-owned **system-of-record** features would fork ticket ownership — two sources of truth for "what is the state of this ticket", reconciliation pain, and a write-war with Autotask.

So the question the ADR must settle first: **is Imperion the service-desk SoR, or does Autotask remain SoR while Imperion adds intelligence + customer-facing surfaces on top?**

## Options considered

- **A. Imperion becomes the service-desk SoR.** Full helpdesk in Imperion; Autotask demoted or replaced. Rejected: a huge build, throws away the existing Autotask investment + PSA/billing integration, and contradicts ADR-0044/0059 where Autotask is authoritative.
- **B. Autotask stays SoR; Imperion layers intelligence + customer-facing surfaces, writing back where Autotask supports it (chosen, recommended).** Imperion owns the things Autotask does poorly or not at all — AI deflection, CSAT capture, live chat, unified routing view — and pushes results back to the Autotask ticket as the authoritative record. No forked ticket state.
- **C. Buy a separate helpdesk/chat SaaS.** Another system + another integration; same SoR-fork problem one layer over. Rejected.

## Decision

1. **Autotask remains the ticket system of record (B).** Imperion does not create a competing ticket store. New service-desk data in Imperion is **adjunct** (SLA state, CSAT, chat sessions) keyed to the Autotask ticket via the existing identity map; where an outcome belongs on the ticket (e.g. a resolution note, a deflection outcome), Imperion **writes back** to Autotask through a backend process.

2. **SLA.** Derive SLA targets from Autotask SLA fields where present; otherwise compute against contract terms (ADR-0044). A pipeline refresh computes time-to-breach and breach state onto an adjunct `sla_state` row; breach risk surfaces on the ticket view and feeds a worklist. Read-side computation — no mutation of Autotask SLA config.

3. **CSAT/NPS.** A consent-aware (ADR-0014) post-resolution survey dispatched by a **backend gated** process (ADR-0058 pattern); the score lands on an adjunct `csat` row keyed to the ticket + account, and is optionally written back as an Autotask note.

4. **Chatbot deflection (AI-first).** An inbound chat is first answered by a bot grounded in **gold knowledge** (ADR-0041); only on failure/escalation does it create an Autotask ticket. **Deflection rate** (resolved-without-ticket) is a tracked metric. Escalation hands the transcript to the new ticket.

5. **Live chat + omnichannel routing.** A `chat_session` store for live conversations; routing unifies email/social/chat inbound into one queue **coordinated with the ICM service-desk workspace (#280)** rather than a second router. The queue is a view/orchestration over sources, not a new SoR.

6. **Division of labor (ADR-0042).** Schema + surfaces here; chatbot/survey/write-back processes in backend; SLA refresh in pipeline.

**Table sketch (adjunct to the Autotask ticket; migration number at implementation):**

```sql
sla_state ( id, ticket_ref text, target_at timestamptz, breached bool,
            minutes_to_breach int, computed_at, ... )      -- keyed to Autotask ticket id
csat ( id, ticket_ref text, account_id fk, score int, kind text check (kind in ('csat','nps')),
       comment text, consent_basis_id fk, collected_at, ... )
chat_session ( id, account_id fk null, contact_id fk null,
               status text check (status in ('bot','live','deflected','escalated','closed')),
               deflected bool, escalated_ticket_ref text null, transcript_uri text, ... )
```

## Consequences

- No forked ticket state — Autotask stays authoritative; Imperion adds the intelligence layer and customer-facing channels, consistent with ADR-0044/0059.
- Write-back is the integration risk surface: it must be idempotent and rate-limited against Autotask, and respect that Autotask is authoritative on conflict.
- Deflection + CSAT become first-class metrics on the BI hub (ADR-0062).

## Future considerations

- Whether routing graduates from a view into an active assignment engine (would lean further on ICM).
- Self-service customer portal for ticket status (pairs with the deferred portal exclusions in #314 — would need its own ADR).
- Predicted CSAT / churn-risk from conversation intel (#315).
