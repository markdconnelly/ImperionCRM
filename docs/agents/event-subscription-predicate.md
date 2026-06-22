# Event-subscription predicate contract (`agent_subscription`)

The **canonical, cross-repo contract** for how one wake event fans out to N agent runs
(#999, 1C of the event substrate epic #991/#997, [ADR-0111](../decision-records/ADR-0111-agent-event-substrate.md)).
This is the **single home** for the predicate JSON shape; the backend evaluator
(`ImperionCRM_Backend/src/shared/agent/subscription-predicate.ts`) mirrors it **verbatim**.
Change it here first (schema is front-end-owned, system CLAUDE.md §1/§11), then update the mirror.

## Why this exists

[Migration 0164](../database/) shipped the durable wake-event inbox (`agent_event`). The
backend dispatcher v1 **hardcoded** a single `autotask.ticket.created → technician` mapping
(`EVENT_WORKFLOW_MAP`) — a 1:1 `type → workflow` function that can neither **fan one event
out to N agents** nor **skip** an event whose payload does not match a rule (e.g. wake the
Technician only for high-severity tickets, the vCIO only for tier-1 accounts).

The `agent_subscription` table replaces that map with **data**: one row per
`(event_type → workflow_key)` carrying a structured **predicate**. The dispatcher, per claimed
`agent_event`, loads the enabled rows for the event type, evaluates each predicate against the
event's fields, and **opens one `agent_run` per match** (fan-out). Zero matches → the event is
`ignored`.

## The evaluation target — the field bag

A predicate is evaluated against a **flat field bag** = the event's `subject` **merged under**
its `payload` (payload wins on key collision). Both are id/routing-only JSON by the 0164
contract — **no ticket body, no client PII**. Nested objects are reached by **dot path**
(`account.tier`).

> Example field bag for `autotask.ticket.created`:
> `{ "ticketId": "T-1001", "queueId": 8, "priority": 1, "severity": "high", "account": { "tier": "tier-1" } }`

## The predicate JSON shape

A predicate is **DATA, never code** — the evaluator is a pure interpreter (no `eval`, no
expression compilation). It is one of:

### 1. A leaf condition

```json
{ "field": "<dotpath>", "op": "<operator>", "value": <json> }
```

| `op` | Meaning | `value` shape | Notes |
|---|---|---|---|
| `eq` | strict equality | scalar (string/number/bool) | |
| `ne` | strict inequality | scalar | |
| `in` | membership | JSON array | true if the field equals any element |
| `nin` | non-membership | JSON array | |
| `gt` / `gte` / `lt` / `lte` | numeric comparison | number | **non-numeric operand ⇒ NO MATCH** (deny-safe) |
| `exists` | presence test | bool | `true` ⇒ field present & non-null; `false` ⇒ field absent/null |
| `contains` | substring / element | scalar | substring of a string field, OR a member of an array field |

### 2. A compound node (arbitrarily nestable)

```json
{ "all": [ <node>, … ] }   // AND — every child must match
{ "any": [ <node>, … ] }   // OR  — at least one child must match
{ "not": <node> }          // negation
```

### 3. Match-all

An **empty** predicate `{}` (or SQL `NULL`, normalized to `{}`) matches **every** event of
its type. This is the parity default — the seeded v1 wedge row uses it so behaviour is
unchanged at cutover.

## Deny-safe by contract

A predicate that is **malformed** — unknown `op`, wrong-shaped node, wrong `value` type, a
non-numeric operand to a numeric op, a non-object node — evaluates to **NO MATCH**. Never a
crash, never match-by-default. The dispatcher logs the offending subscription id and continues;
one bad rule can neither wake an agent it should not nor sink the dispatch pass. (`{}` is the
**only** thing that matches all; an *attempted* condition that is broken matches **nothing**.)

## Worked examples

| Intent | Predicate |
|---|---|
| Every new ticket (v1 wedge) | `{}` |
| High/urgent severity only | `{ "field": "severity", "op": "in", "value": ["high", "urgent"] }` |
| Tier-1 accounts only | `{ "field": "account.tier", "op": "eq", "value": "tier-1" }` |
| High severity **and** a network queue | `{ "all": [ { "field": "severity", "op": "eq", "value": "high" }, { "field": "queueId", "op": "in", "value": [8, 9] } ] }` |
| Priority ≤ 2 **but not** a billing ticket | `{ "all": [ { "field": "priority", "op": "lte", "value": 2 }, { "not": { "field": "queueId", "op": "eq", "value": 99 } } ] }` |

## Fan-out semantics (the #999 acceptance)

For a claimed event, the dispatcher evaluates **all enabled `agent_subscription` rows for the
event's `event_type`**:

- **Match** → open one `agent_run` (ADR-0073 `createIcmRun`, acting = service identity) per
  matched row. Two matching rows → **two runs** (multi-match fan-out).
- **No row matches** → the event is stamped `ignored` (no `agent_run`).

Idempotency on redelivery stays the inbox `UNIQUE idempotency_key` (one row → at most one
dispatch); the per-run `eventKey` guard (#299) prevents a duplicate run when the
claim→stamp window re-pends a row. With fan-out, the event→run correlation is **1:N**; the
DLQ/replay/observability surface (#1000) builds on this.

## Security / PII

Predicate `value`s are operator-authored routing literals (severities, account tiers, queue
ids) — **no client PII, no secrets**. The field bag the predicate reads is the
id/routing-only `subject ∪ payload` (0164 contract). The table is app-native control plane
(archetype H), not silver / pipeline-merged — no OKF silver concept file
(`semantic-layer-not-affected`); this doc + the coverage-matrix `n/a` row are its home.

## Related

- [ADR-0111 — agent event substrate](../decision-records/ADR-0111-agent-event-substrate.md)
- Inbox: migration `agent_event` (#998)
- Backend dispatcher + evaluator: `ImperionCRM_Backend/src/shared/agent/event-dispatcher.ts` + `subscription-predicate.ts` (#296/#999)
- DLQ / replay / observability: #1000 (1D)
