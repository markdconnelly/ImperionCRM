---
adr: 0111
title: "Agent event/trigger substrate — durable agent_event inbox, Storage-Queue notifier, in-app subscription fan-out"
status: proposed
date: 2026-06-22
repo: frontend
summary: "The event-driven wake substrate for autonomous agents: a durable agent_event DB inbox (source of truth, idempotent/replayable) drained by a backend dispatcher; an Azure Storage Queue acts only as a low-latency NOTIFIER over the inbox (poll is the durability floor), staying consistent with pipeline ADR-0003; subscription/predicate fan-out lives in an agent_subscription table + dispatcher code, not in the bus; containment = idempotency key + wake-on-created loop-break + rate/fan-out caps; dead-letter/replay via the status lifecycle."
tags: [meta, agents, security]
---

# ADR-0111: Agent event/trigger substrate — durable `agent_event` inbox + Storage-Queue notifier

> **Number is a placeholder.** ADR-0111 is claimed at MERGE per system CLAUDE.md §10.3 —
> the branch that merges second renumbers. Migration `0164_agent_event_inbox.sql` (the inbox
> table this ADR governs) is already merged + prod-applied (#998).

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-22 |
| **Cross-references** | pipeline ADR-0003 (event-vs-timer split / Storage Queue) · pipeline ADR-0011 · backend ADR-0074 (external-callback ingress via APIM) · backend ADR-0035 (Easy Auth + caller allowlist) · backend ADR-0072/0073 (ICM run producer + poll-drain) · ADR-0042 (four-repo split / schema ownership) · ADR-0105/0109 (RLS access spine, autonomy dial) · epic #991 · #997 (this ADR) · #998 (1B tracer) · #999 (1C predicate fan-out) · #1000 (1D DLQ/replay) · #1033/#1034 (containment, data_class) · PL #152 (wake contract) · BE #258 (run-ledger) |

## Problem

Autonomous agents (the AI-Technician wedge, epic #1038) must be **woken by business events** —
a created ticket, a won quote — not only by a human typing in chat. There is no event/trigger
substrate today: the backend is **100 % pull** (HTTP routes are MI-gated per ADR-0035; the only
background work is timers), and nothing carries an external/internal event to a wakened
`agent_run`. We need to settle: the **transport** (bus vs. not), the **subscription/rule model**
(which event wakes which agent under which identity), **idempotency** (a redelivered event wakes
an agent at most once), **dead-letter + replay**, and **dispatcher placement** — and, because
autonomous agents have the **same all-client reach as employees** (#1033 decision-3, no client
wall), the **containment** of an event-driven run's blast radius.

## Context

Grounded cross-repo, 2026-06-21/22:

- **External event ingress is already settled (backend ADR-0074).** APIM is the public front
  door for the three genuinely-external webhooks (DocuSign, Autotask, Graph); each validates an
  HMAC over the **raw body** (or a `validationToken`/`clientState`), so any front door must pass
  the body through unre-encoded. This ADR is about the **internal** substrate *after* an event
  lands — it does not change ingress.
- **A transport is already chosen and configured (pipeline ADR-0003).** The pipeline buffers
  ingestion through an **Azure Storage Queue** ("not Service Bus … for simplicity/cost … matches
  the backend's `host.json` queue config … revisit if ordering/sessions/topic fan-out become
  requirements"). The backend `host.json` already carries the queue config + the
  `app.storageQueue(...)` registration pattern, so a backend queue-trigger is a small lift, not
  new infrastructure.
- **The durable substrate already shipped.** Migration `0164` (#998) added **`agent_event`** — a
  DB inbox with a UNIQUE `idempotency_key`, a `status` lifecycle
  (`pending|claimed|dispatched|deferred|dead|ignored`), `run_id`→`agent_run`, and
  `attempts`/`last_error`. The ICM executor already poll-drains pending `agent_run` rows
  (ADR-0072/0073); a wake is just a **new producer** in that model.
- **Fan-out belongs in data, not infra.** "One event → N agents" (#999) is a row-matching
  problem the planned `agent_subscription` table (event-type + predicate → workflow + acting
  identity + autonomy) solves in dispatcher code — it does not require a pub/sub bus.

## Options considered

1. **Service Bus topics/subscriptions** — native infra-level pub/sub fan-out, ordering, sessions,
   built-in DLQ.
2. **Event Grid** — cheap push-based fan-out with retry/DLQ.
3. **Azure Storage Queue as a low-latency *notifier* over the durable `agent_event` inbox** — the
   inbox is the source of truth; the queue only nudges the dispatcher to drain sooner than its
   poll.
4. **Direct synchronous Pipeline→backend create-run HTTP** — no queue at all.
5. **Defer any bus — DB inbox + dispatcher poll only.**

### Tradeoffs

- **Service Bus** duplicates what `agent_subscription` + the inbox already do, breaks from the
  ADR-0003 Storage-Queue standard, and adds infra + cost the current scale does not justify.
- **Event Grid** is at-least-once + unordered, needs a public HTTP handler, and adds friction
  against both the existing Storage-Queue standard and the HMAC-raw-body ingress invariant.
- **Direct synchronous HTTP** couples the webhook's 202 to backend availability and loses
  durability/replay: a backend 5xx makes Autotask retry → the ticket re-lands and double-processes.
- **Poll-only** is the simplest and is correct, but adds up to one poll-interval of latency to
  every wake.
- **Storage-Queue notifier** keeps the durable/idempotent/replayable inbox as the floor *and*
  buys low latency, on the transport both siblings already use — at the cost of one more
  (best-effort) moving part.

## Decision

**A durable `agent_event` DB inbox is the substrate; an Azure Storage Queue is a low-latency
notifier over it; subscription/predicate fan-out lives in `agent_subscription` + dispatcher code,
not in the bus.**

1. **Inbox = source of truth (shipped, #998 / migration 0164).** Producers (the pipeline today;
   others later) `INSERT` one `agent_event` row per event, `ON CONFLICT (idempotency_key) DO
   NOTHING`. The row survives backend downtime and is replayable.
2. **Backend dispatcher drains the inbox (placement = backend, its own issue).** A short-cadence
   timer (~1 min — the first reactive surface, tighter than the 5-min ICM drain) claims `pending`
   rows `FOR UPDATE SKIP LOCKED`, maps each to a `workflow_key`, and opens an `agent_run` via the
   ADR-0073 producer / `createIcmRun()` under an **autonomous service identity at L0/L1**
   (observe/draft + park; the #263 gauntlet + verifier govern actuation when the dial is raised —
   the wake path never bypasses it). It stamps `status='dispatched', run_id=…`.
3. **Storage Queue = notifier only (consistent with pipeline ADR-0003).** A producer MAY also
   enqueue a best-effort nudge so the dispatcher drains immediately instead of waiting for its
   poll (managed-identity auth, gated by `ALLOWED_CALLER_CLIENT_ID`). **The poll is the
   durability floor** — if the nudge is lost, the next poll still drains the row. The queue is a
   latency optimization, **never** a correctness dependency. Same transport + `host.json` config
   the pipeline and backend already use; **no new infra**.
4. **Fan-out = `agent_subscription` + dispatcher code (#999), not the bus.** v1 hardcodes the
   single `autotask.ticket.created → technician` mapping; #999 generalizes to a predicate table.
   "One event → N agents" is row matching, not topic fan-out.
5. **Idempotency = the UNIQUE `idempotency_key`** (e.g. `autotask:ticket:{id}:created`) → a
   redelivered event opens at most one run.
6. **Dead-letter + replay = the `status` lifecycle.** The dispatcher increments `attempts` and
   sets `status='dead'` after the configured ceiling; admin replay (`dead|dispatched → pending`)
   is #1000.
7. **Containment of autonomous blast radius (#1033 decision-3 / #1034).** (a) **Loop-prevention is
   structural** — wake on `created` only; an agent's own ticket writes are updates/notes and can
   never self-wake; belt-and-suspenders, the dispatcher ignores events whose source identity is
   the agent's own once that metadata exists. (b) **Rate cap** — `WAKE_MAX_RUNS_PER_TICK`; excess
   `pending` rows wait for the next tick (back-pressure, not dropped). (c) **Fan-out cap** —
   trivially 1 for `created`; the knob lands with predicate fan-out (#999). (d) Per-run cost/rate
   ceilings ride the `agent_governance_setting` caps (migration 0163).

**Revisit trigger (the ADR-0003 clause, restated):** move the notifier to **Service Bus
topics** only if in-app fan-out, strict ordering, or sessions become a measured bottleneck.
Because the inbox + dispatcher contract is transport-agnostic, that swap changes only the
notifier — a bus would simply become another feeder that inserts into / notifies the same inbox.

## Consequences

### Security impact

- No new internet-facing surface: external ingress stays APIM→webhook (ADR-0074); the notifier
  queue is internal, MI-authenticated. The dispatcher opens runs under an **autonomous service
  identity at L0** (observe-only) so nothing actionable is auto-gated open; raising the dial
  routes through the #263 gauntlet + verifier.
- `agent_event.payload` is **id/routing-only by contract** (no ticket body) — client_pii stays
  out of the inbox; the agent re-reads fresh silver (freshness = correctness). RLS hardening of
  the inbox tracks the #979/#1034 access-spine work.
- Containment (caps + structural loop-break) is the counterweight to autonomous agents' same-as-
  employee reach (#1033 decision-3).

### Cost impact

Effectively zero incremental: Storage Queue (consumption-priced, already provisioned) reused;
no Service Bus / Event Grid namespace stood up. The dispatcher is one more timer on the existing
App Service Plan.

### Operational impact

A new reactive timer (the dispatcher) is the first non-HTTP/non-poll-of-source trigger in the
backend; it needs a stale-`claimed` reaper (sibling of the stale-`running` reaper #273) and a
DLQ/replay surface (#1000). Observability rides the BE #258 run-ledger (`agent_run`/`agent_event`
correlation) + the agent event taxonomy.

## Future considerations

- **#999 (1C):** `agent_subscription` predicate table + one-event-fans-to-N-subscriptions;
  per-subscription fan-out cap.
- **#1000 (1D):** dead-letter admin replay + event/run observability surface.
- **Service Bus topics** if/when fan-out, ordering, or sessions are measured to bind (the inbox
  contract makes this a notifier-only swap).
- **More producers:** won-quote, posture drift, and other already-ingested events become wakes by
  inserting into the same inbox — no substrate change.
