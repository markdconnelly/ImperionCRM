# Social-DM fold-in to the unified client-communications history

How Meta **Messenger** and **Instagram** direct messages are folded into the unified
[`client_communication`](semantic-layer/tables/client_communication.md) silver entity as
`channel = social_dm`, on equal footing with M365 email / Teams chats / Teams meetings.

Governing decisions:
[ADR-0126](../decision-records/ADR-0126-client-communications-capture-model.md) (the capture
model — comms folded into one unified, client-scoped history) ·
[ADR-0124](../decision-records/ADR-0124-social-media-management-plane.md) (the Social Media
Management plane that owns the DM ingestion) · **LP ADR-0026** (the bronze→silver merge
co-locates with whichever plane ingests the bronze).

Epic [#1366](https://github.com/markdconnelly/ImperionCRM/issues/1366), slice
[#1370](https://github.com/markdconnelly/ImperionCRM/issues/1370). **Depends on
[#1376](https://github.com/markdconnelly/ImperionCRM/pull/1376)** (the `client_communication`
silver entity + the base filter contract this builds on).

> **This is a contract, not a job.** Per LP ADR-0026 the actual bronze→silver MERGE that
> writes `social_dm` rows co-locates with ingestion — the Meta DM bronze is ingested and
> merged **on-prem by the Local Pipeline** (the Meta precedent, migrations 0075 / 0206).
> This front-end PR owns the **schema meaning + the mapping/merge contract**; the merge job
> is a **sibling LocalPipeline follow-up** (see *Deferred*, below). The front-end read
> repository is already channel-agnostic, so `social_dm` rows render in the unified history
> with **no GUI code change**.

## No second store — coordination with the Social Media plane (ADR-0124)

ADR-0124 decision **#2** already routes inbound **DMs → the `interaction` Contact-360
timeline** (+ a `lead_capture_event` under `lead_hook` kind `facebook_dm` / `instagram_dm`
for DM senders); only **public** comments/mentions go to the separate `social_engagement`
store. So the social plane does **not** own a competing DM-history store — DM history lives
in `interaction`.

`client_communication.social_dm` is therefore a **second, filtered projection** of the same
Meta DM bronze — not a new store and not a duplicate of `social_engagement`:

| Surface | What it shows | Scope |
|---|---|---|
| `interaction` (kind `dm`) | the full Contact-360 DM timeline (every DM, lead or not) | unfiltered research substrate |
| `social_engagement` (ADR-0124) | **public** comments / mentions only — **not DMs** | the social inbox's public side |
| **`client_communication` (`social_dm`)** | DMs **with an onboarded DB client only**, alongside email/Teams | the client-relationship comms ledger |

The social-plane **inbox** (the operator's working surface for *all* DMs, lead-routing,
replies) and the **client-comms history** (the per-account record of correspondence with a
*known client*) answer different questions over the same bronze. They are reconciled by the
filter: a `social_dm` row exists in `client_communication` **iff** the DM counterparty
resolves to a DB client (see below). DMs from non-clients (prospects, the public) stay in
the inbox / `interaction` only and never enter the client-comms history.

## Source bronze

The same Meta DM bronze that already feeds `interaction` (LocalPipeline ingestion, merged
on-prem per ADR-0026):

| `channel` | `source_system` | Bronze table | Migration |
|---|---|---|---|
| `social_dm` | `meta_messenger` | `facebook_messages` (page-inbox / Messenger) | 0075 |
| `social_dm` | `instagram_dm` | `instagram_messages` (IG business-inbox DMs) | 0206 |

Both bronze tables are the local-pipeline envelope (lossless `raw_payload`, flat coerced
columns, PK `(tenant_id, source, external_id)`, `content_hash`). `tenant_id` is Imperion's
**own** first-party social asset — consistent with ADR-0126 (comms captured from Imperion's
own side, never from a client tenant).

## Field mapping (bronze → `client_communication`)

One `client_communication` row per **message** (the bronze grain), per matched account.

| `client_communication` column | Messenger (`facebook_messages`) | Instagram (`instagram_messages`) | Notes |
|---|---|---|---|
| `channel` | `social_dm` | `social_dm` | the unified enum value (#1376) |
| `source_system` | `meta_messenger` | `instagram_dm` | the bronze provenance label |
| `external_id` | `external_id` (message id) | `external_id` (message id) | source's stable id; part of the merge key |
| `thread_ref` | `conversation_id` | `conversation_id` | groups a DM thread in the history |
| `occurred_at` | `created_time` → `timestamptz` | `created_time` → `timestamptz` | timeline position |
| `direction` | see *Direction*, below | see *Direction*, below | inbound = client→employee |
| `client_participants[]` | the **client** side of `from_*`/`to_*` (handle/id) | the **client** side of `from_*`/`to_*` (handle/username) | minimal PII; the matched non-Imperion party |
| `imperion_participants[]` | Imperion's Page id/handle (`page_id`) | Imperion's IG business id/handle (`ig_user_id`) | the employee/brand side |
| `subject` | `NULL` (DMs have no subject) | `NULL` | social DMs carry no subject |
| `snippet` | truncated `message` (preview only) | truncated `message` (preview only) | **never the full body** — ADR-0126 privacy posture; the full text stays in `interaction` / bronze |
| `account_id` | stamped by the filter (below) | stamped by the filter | the matched DB client |
| `contact_id` | stamped when a single contact resolves | stamped when a single contact resolves | via `contact_social_identity` |
| `content_hash` | bronze `content_hash` (or recompute over mapped fields) | bronze `content_hash` | idempotent re-merge |
| `data_class` | `client_pii` | `client_pii` | default |

`UNIQUE (channel, source_system, external_id)` is the idempotent merge key (#1376) — a
re-poll of an unchanged DM is a no-op.

### Direction

Relative to Imperion (consistent with the `interaction` DM-direction rule, 0206):
`inbound` when the DM **sender** (`from_*`) is the client; `outbound` when the sender is
Imperion's Page / IG account. There is no `internal` — a DM always has Imperion on exactly
one side.

## The client filter for social DMs (no email domain)

The base filter (#1376,
[client-communication-filter.md](client-communication-filter.md)) resolves a
participant to a DB client by **email domain** (`account_domain`) **or** an onboarded
**`contact` email**. **Social DMs have no email address** — the counterparty is a Meta/IG
**handle/PSID**, so neither email test applies. The social_dm fold-in resolves the client
by the **social-handle link** instead:

1. **Social-identity match (primary).** The DM counterparty (`from_id`/`from_username` for
   inbound; `to_*` for outbound) is matched against
   [`contact_social_identity`](semantic-layer/tables/contact_social_identity.md) — the table the Meta merge
   already populates when it links a DM sender to a `contact` (0075 / 0206). A match
   resolves the `contact_id`, and the contact's `account_id` is stamped.
   → a DM is retained **iff** its non-Imperion party is a linked client contact.
2. **No domain fallback.** Unlike email/Teams there is **no `account_domain` path** for
   social DMs (no domain on a handle). A DM from an unlinked handle (a prospect, the
   public) does **not** enter `client_communication` — it stays in `interaction` /
   `lead_capture_event` (the lead-capture path, ADR-0124 #2) until that contact is
   onboarded and linked, at which point subsequent merges retain it.

**Exclusion:** Imperion's own Page / IG account is the "employee" side and is never treated
as the client party, so a DM never self-matches.

**Onboarding loop (parallels ADR-0126 #2).** Onboarding/linking a client contact's social
identity (writing `contact_social_identity`) **widens** the social-DM filter exactly as
adding an `account_domain`/`contact` email widens the email/Teams filter — subsequent merges
begin retaining that handle's DMs. Until a contact is socially linked, the filter has no
substrate for that party and the DM stays inbox/timeline-only.

## Cross-client / shared-thread note

A DM thread is 1:1 (one client party + Imperion), so the multi-account fan-out described in
the base filter contract does not normally apply to `social_dm`; each retained DM resolves
to exactly one account.

## Privacy posture (client_pii)

`social_dm` rows are `data_class = client_pii` like every other channel. The filter **is**
the privacy control: only DMs with a **linked client contact** are retained, so public /
prospect DMs never land in the client-comms ledger. Content is deliberately minimal
(`snippet` preview only, no full message body — the full text stays in `interaction` /
bronze). Standard RLS read-predicate + action-plane ceilings (ADR-0118) apply.

## Deferred to the sibling merge job (not built here)

Per LP ADR-0026 the bronze→silver merge co-locates with ingestion — the Meta DM bronze is
merged **on-prem by the Local Pipeline** (the `Invoke-ImperionMetaMerge` precedent that
already writes `interaction` + `lead_capture_event` from `facebook_messages` /
`instagram_messages`). The `social_dm → client_communication` projection is an **additional
sink in that same on-prem merge**, applying the social-handle filter above.

- **LocalPipeline follow-up** — extend the Meta merge to also write `client_communication`
  (`channel = social_dm`) for DMs whose counterparty is a linked client contact, idempotent
  on `(channel, source_system, external_id)`. Filed as **LocalPipeline
  [#383](https://github.com/markdconnelly/ImperionCRM_LocalPipelineEnrichment/issues/383)**
  (sibling to LP #380 "revive the 3 dead M365 comms collectors / make the merges
  filter-aware" under epic #1366).
- **GUI surface** rendering the unified per-account history (email + Teams + `social_dm` in
  one list) — the read repository from #1376 is the channel-agnostic data seam; no fold-in
  code is needed there for `social_dm` to appear.

## Reading the data (live)

`social_dm` rows are empty in prod until the migration applies (Mark-gated) and the sibling
merge hydrates them. Resolve any row-level specifics against the live read-only `postgres`
MCP at query time (CLAUDE.md §8) — never inline DM content or client identifiers here (OKF
boundary, ADR-0086).
