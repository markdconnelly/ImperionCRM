# ADR-0074: Service-desk depth — SLA, CSAT/NPS, live chat, chatbot deflection, routing

| Field | Value |
|---|---|
| **Repo** | frontend (schema + surfaces); backend (chatbot, surveys, Autotask write-back); pipeline (SLA refresh) |
| **Status** | Accepted (2026-06-12 — **ratified by Mark**: Autotask stays the ticket SoR; Imperion **leverages the Autotask API to document things along the way**, and that data **round-trips into the bronze layer natively via the existing pull** — so Imperion keeps native tables only for what Autotask cannot hold) |
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
- **B. Autotask stays SoR; Imperion layers intelligence + customer-facing surfaces, documenting back via the Autotask API (chosen, RATIFIED).** Imperion owns what Autotask does poorly or not at all — AI deflection, CSAT capture, live chat, unified routing view — and **writes outcomes back to the Autotask ticket via its API**. The existing pull then brings that data into bronze (`autotask_tickets`, migration 0038) → silver `ticket` (`mergeTicketSources`) **natively** — so Imperion reads its own write-backs through the normal ingest, not a parallel store. No forked ticket state.
- **C. Buy a separate helpdesk/chat SaaS.** Another system + another integration; same SoR-fork problem one layer over. Rejected.

## Decision

1. **Autotask is the ticket SoR; Imperion documents back via the API (RATIFIED).** Imperion creates no competing ticket store. Anything that belongs **on the ticket** — resolution notes, deflection outcomes, CSAT result, SLA annotations — is **written to Autotask via its API** and then **read back natively through the existing pull** (bronze `autotask_tickets` → silver `ticket`). Imperion keeps a **native table only when Autotask cannot hold the data** (see §5). This is the core refinement: prefer the round-trip over a parallel copy.

2. **SLA — computed over the pulled silver, not a second SoR.** SLA targets come from Autotask SLA fields pulled into silver, or are computed against contract terms (ADR-0044) where absent. Time-to-breach / breach state is a **read-model projection over silver `ticket`** (a cached view, refreshed by the pipeline) — not an authoritative `sla_state` store. Breach risk surfaces on the ticket view + a worklist; SLA annotations worth persisting go back to Autotask via the API.

3. **CSAT/NPS — captured by Imperion, stored on the ticket where possible.** A consent-aware (ADR-0014) post-resolution survey is dispatched by a **backend gated** process (ADR-0058). The score is **written back to the Autotask ticket** (note/UDF) and round-trips into bronze/silver; a native `csat` table is used **only if** Autotask has no suitable field for the score/comment.

4. **Chatbot deflection (AI-first).** An inbound chat is first answered by a bot grounded in **gold knowledge** (ADR-0041); only on failure/escalation does it create an Autotask ticket (via the API). **Deflection rate** (resolved-without-ticket) is a tracked metric. Escalation hands the transcript to the new ticket.

5. **Genuinely Imperion-native data (the only new tables).** Things Autotask does not model — a **pre-ticket chat session** and **deflection telemetry** (a conversation that never became a ticket) — live in native tables here; they are not ticket-resident and have nowhere to round-trip to. Everything ticket-resident stays in Autotask.

6. **Live chat + omnichannel routing.** A `chat_session` store for live/bot conversations; routing unifies email/social/chat inbound into one queue **coordinated with the ICM service-desk workspace (#280)**, not a second router. The queue is a view/orchestration over sources, not a new SoR.

7. **Division of labor (ADR-0042).** Schema + surfaces here; chatbot/survey/Autotask-API write-back processes in backend; the pull + SLA projection in pipeline.

**Table sketch — native tables ONLY for non-ticket-resident data; ticket data lives in Autotask → bronze:**

```sql
-- NO sla_state SoR, NO standalone csat/ticket-note store: those round-trip through
-- Autotask (API write) -> bronze autotask_tickets (mig 0038) -> silver ticket.
-- SLA breach = a read-model projection/view over silver `ticket`, refreshed by the pipeline.

chat_session (                              -- Imperion-native: pre-ticket / bot conversation
  id, account_id fk null, contact_id fk null,
  status text check (status in ('bot','live','deflected','escalated','closed')),
  deflected bool, escalated_ticket_ref text null,   -- Autotask ticket id once escalated
  transcript_uri text, started_at, closed_at, ...
)
-- csat: ONLY if Autotask cannot store the score/comment on the ticket; otherwise it is
-- an Autotask write-back that returns via the pull.
```

## Consequences

- No forked ticket state and **minimal new schema** — ticket-resident data round-trips through Autotask → bronze → silver; only pre-ticket chat/deflection is native. Consistent with ADR-0044/0059.
- **The Autotask API write-back is the integration risk surface:** it must be idempotent and rate-limited, and Autotask is authoritative on conflict. The pull cadence (ADR-0038) sets how fast a write-back becomes visible in silver — a read-after-write lag to design around (optimistic UI on the chat/CSAT side, source-of-truth on refresh).
- Deflection + CSAT become first-class metrics on the BI hub (ADR-0062).

## Future considerations

- Whether routing graduates from a view into an active assignment engine (would lean further on ICM).
- Self-service customer portal for ticket status (pairs with the deferred portal exclusions in #314 — would need its own ADR).
- Predicted CSAT / churn-risk from conversation intel (#315).
