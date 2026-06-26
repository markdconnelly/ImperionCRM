---
status: proposed
date: 2026-06-25
---

# ADR-00NN: Threads integration — separate `graph.threads.net` adapter under the social plane

> **Number is a placeholder.** Per system CLAUDE.md §10.3, the real ADR number is claimed at
> MERGE (rebase on `main`, take the next free number, rename this file, fix every reference).
> Authored as ADR-00NN. Any migration the Threads epic authors (the bronze tables + the
> `interaction` mapping, S2 #1336) is likewise authored against a placeholder number and
> renumbered at merge.

| Field | Value |
|---|---|
| **Repo** | frontend (this ADR + the `threads` connector metadata + schema/OKF); Backend = publish/reply outbound (S4 #417); LocalPipeline = ingest collectors + bronze→silver merge (S3 #356); Pipeline = mentions webhook, later (S6 #167) |
| **Status** | Proposed |
| **Date** | 2026-06-25 |
| **Epic** | #1334 — discharges the "ADR owed" checkbox (S1 #1335 · S2 #1336 · S3 LP #356 · S4 BE #417 · S5 #1337 · S6 PL #167) |
| **Cross-references** | ADR-0124 (Social Media Management plane — this is one adapter under it), ADR-0042 (four-repo split + bronze envelope), ADR-0103 (connection credential registry), ADR-0122 (connections surface + provider-always-3rd KV naming), ADR-0107 (governed action / tool-grant plane), ADR-0109 (actuation autonomy dial), ADR-0121 (earned/graduated autonomy + HARD ceilings), ADR-0090 (autonomous delivery), ADR-0086 (OKF semantic layer), LP ADR-0026 (merge co-locates with ingestion), ADR-0011 (interaction timeline), ADR-0108 (LinkedIn — the sibling adapter precedent), migration 0075 (Meta bronze precedent), 0127 (`connection_provider += 'meta'` precedent) |

## Problem

Epic #1334 wants Imperion OS to fully run **our own** Threads business presence — **post · reply ·
monitor mentions · insights** — with Belle (marketing) drafting and humans approving outbound. The
"ADR owed" checkbox on the epic asks one architectural question: **how does Threads slot into the
platform without becoming a silo?**

Threads forces the question because, unlike Facebook/Instagram, it is **not** part of the Meta Graph
the existing integration speaks to. Threads has its **own** API host (`graph.threads.net`) and its
**own** Threads OAuth — it shares no token, no app-token, and no code with the FB/IG Graph
(`graph.facebook.com`) Meta integration (migration 0075, `conn-company-meta`). So Threads is
genuinely a net-new API client + net-new credential, and the design must say so explicitly or a
future reader will assume it rides the Meta token and wire it wrong.

ADR-0124 already set the plane: the Social Media Management plane is **unified plane, per-network
adapters**, and it explicitly names Threads as one such adapter (`conn-company-threads`, separate
OAuth) and **parents/absorbs the "ADR owed" item on #1334**. This ADR is therefore not a new plane —
it is the **adapter-level decision record** that pins down, for Threads specifically: the API/OAuth
boundary, the credential, the bronze→silver shape, the outbound governance ceiling, the six App
Review scopes, and the dormant-until-token posture. It mirrors ADR-0108 (LinkedIn) doing the same
for LinkedIn.

Two external constraints bound the answer and must be encoded so expectations don't outrun what the
API delivers:

1. **Separate API + separate OAuth.** `graph.threads.net` with its own authorization-code flow
   issues a long-lived **Threads user token**; it is not derivable from the Meta Page token. Token
   custody is backend/Key Vault, not the DB (ADR-0103).
2. **Outbound is App-Review-gated.** Publishing/replying needs Meta App Review of the Threads use
   case (the six scopes below) **before** any token grants outbound. Until the token lands and review
   clears, the publish/reply path is **dormant / fail-closed**, exactly like the Meta DM send path
   (`meta-dm.ts`, 24h-window + human-approved gate).

## Context

- **ADR-0124 is the parent.** The social plane already decided: one Social Channel abstraction; one
  outbound governance path (Social Action → gauntlet + pending-action cockpit); money +
  customer-facing HARD-capped; **v1 every Social Action is human-approved**; three credentials
  (`conn-company-meta` / `conn-company-threads` / `conn-company-linkedin`), all company-scope, no
  client mapping; poll-first inbound with webhooks deferred. Threads inherits all of that; this ADR
  only fills in the Threads-specific cells.
- **The unified interaction timeline already spans channels** (ADR-0011; Meta lands via 0075).
  `interaction.source` is an enum; FB/IG posts/comments/DMs are rows with `source='facebook'|
  'instagram'`. Threads posts/replies/mentions are the same shape with `source='threads'`.
- **Connections + KV are settled** (ADR-0103 / ADR-0122): a `connection` row carries a
  `keyvault_secret_ref` named by the **provider-always-3rd** grammar
  (`conn-<scope>-<provider>` → `conn-company-threads`); collectors resolve the token from Key Vault
  at invoke time via the user-assigned managed identity. The GUI/DB hold only the **name**, never the
  secret (CLAUDE.md §5).
- **The Meta send path is the dormancy precedent.** `sendCapable` company credentials (the
  `conn-company-meta` Page token) are flagged so the cloud pipeline stays dormant/fail-closed until
  the secret exists and App Review clears (pipeline #89 / PR #113). Threads' publish/reply token is
  the same kind of credential.
- **The action/autonomy planes exist** (ADR-0107 / ADR-0109 / ADR-0121): a deny-by-default
  `agent_tool_grant`, a typed action catalog, a human-gated executor, and autonomy ceilings. A public
  Threads post or reply is **customer-facing**, which is a **HARD autonomy ceiling** (ADR-0109/0121) —
  it never auto-executes above the ceiling; it routes to the approval cockpit.
- **Merge co-locates with ingestion** (LP ADR-0026): Threads ingestion is scheduled bulk on-prem →
  LocalPipeline owns the Threads bronze→silver merge (the Meta/posture precedent). The optional
  real-time mentions webhook (S6) is the only piece that would live in the cloud Pipeline.
- **Meta (0075) and LinkedIn (ADR-0108) are working precedents** for a social source end-to-end
  (bronze envelope → merge → silver interaction/identity/metric), so Threads follows a proven path —
  the only genuinely new thing is the separate API client + credential.

## Options considered

1. **Threads silo** — bespoke `threads_*` silver tables and a bespoke send path, parallel to Meta.
2. **Fold Threads into the Meta integration** — reuse `conn-company-meta`, extend the Meta collector.
3. **Separate adapter, reuse the platform spine** — Threads gets its **own** API client, OAuth, and
   `conn-company-threads` credential (it must — different API), but its data rides the existing
   `interaction` timeline and its outbound rides the ADR-0107/0124 governance path. (Chosen.)

### Tradeoffs

| Option | Pro | Con |
|---|---|---|
| 1 Silo | self-contained per-source tables | duplicates the unified timeline; agents learn an Nth shape; a second send path outside the governed plane; drifts from OKF archetypes; more schema + merge code |
| 2 Fold into Meta | one connector card | **factually wrong** — Threads is a different API + OAuth + token; would conflate two credentials in one secret, break least-privilege, and mis-route the publish API base URL |
| 3 Separate adapter, reuse spine | honest about the irreducible per-network API/OAuth boundary while keeping one timeline, one identity model, one governed/audited outbound path (least-privilege, autonomy-gated) for free; one bronze set + one merge; matches ADR-0124 + the Meta/LinkedIn precedents | requires a net-new API client + a fourth social credential (unavoidable) |

## Decision

Adopt **Option 3 — Threads is a separate-API adapter under the ADR-0124 social plane, reusing the
platform spine.** Threads' API/OAuth/credential are irreducibly its own; everything above that layer
reuses what exists. This ADR slice ships **docs only** (plus the S1 connector metadata in the same
epic); no migration is applied here. Decisions map to the epic's slices.

### D1 — Separate API + separate OAuth + a fourth credential (S1 #1335)
Threads talks to **`graph.threads.net`** over its **own Threads OAuth** authorization-code flow,
custodied by the backend (token exchange + refresh-on-read), exactly like the other per-user/company
OAuth flows. The long-lived **Threads user token** is stored as the Key Vault secret
**`conn-company-threads`** (provider-always-3rd grammar, ADR-0122), referenced from a company-scope
`connection` row — **no client mapping** (company presence, the Meta precedent). It shares **no**
token or code with `conn-company-meta`. The frontend adds a **Threads** connector card to
`/settings/connections` carrying provider metadata only (no secret), flagged **`sendCapable`** so the
pipeline treats it as outbound-capable and dormant-until-set, and recording the six scopes for
display/audit. Adding `'threads'` to the `connection_provider` DB enum is a **migration** and
therefore belongs to S2 (schema-owning slice), following the `0127` Meta precedent (GUI provider-list
shipped first, enum value added in a paired migration); the card's `key` is a TS string until then.

### D2 — Posts/replies/mentions ride the unified interaction timeline (S2 #1336)
Threads content is `interaction` rows with `source='threads'` and the existing `kind` vocabulary
(`social_post` / `social_comment` for replies / `mention`), keyed by `(source, external_ref)`,
direction by author (ours = outbound, theirs = inbound). The bronze tables
(`threads_posts` / `threads_replies` / `threads_mentions` / `threads_insights`, standard ADR-0042
envelope) are S2; LocalPipeline merges them to silver (LP ADR-0026, S3 #356). **Per ADR-0124's
inbound split:** private content joins the interaction timeline; if Threads later exposes public
brand-mention chatter from anonymous accounts, that follows the plane's Social Engagement store rule,
not the contact-centric timeline — but Threads' v1 mentions are *of us* and ride the timeline.
Insights are silver **Social Metric** time-series snapshots (ADR-0124 D9 → BI hub, #135 name
normalization).

### D3 — Outbound publish/reply is a governed Social Action with a HARD customer-facing ceiling (S4 BE #417)
Publishing a Threads post or replying is a **ProposedAction through the one Social Action gauntlet +
pending-action cockpit** (ADR-0124 D4 / ADR-0107), **not** a bespoke endpoint:
- a backend skill reads the `connection` (threads) → KV token → `graph.threads.net` publish/reply API
  and returns `{threadId, url}`;
- typed actions (`kind:'publish_threads'` / `kind:'reply_threads'`) are added to the action catalog;
  the existing human-gated executor invokes the skill and logs the result to `interaction`
  (source=threads, direction=outbound) + `audit_log`;
- governance seed rows wire it in: a `source_skill(provider='threads')`, an `agent_tool_grant` for
  Belle, and an autonomy policy that is **`mark_gated=true`** with a **HARD customer-facing ceiling**
  (ADR-0109/0121) — a public post/reply is customer-facing, so it **never** auto-executes above the
  ceiling and always routes to approval. **v1 = every Threads Social Action is human-approved**
  (ADR-0124 D4).

### D4 — The six App Review scopes are recorded as first-class (S1/S4)
The Threads use case requests exactly: `threads_basic`, `threads_content_publish`,
`threads_manage_replies`, `threads_read_replies`, `threads_manage_mentions`,
`threads_manage_insights`. These are recorded on the connector card (display/audit) and bound the
build: read paths (`threads_basic` / `threads_read_replies` / `threads_manage_mentions` /
`threads_manage_insights`) drive S2/S3 ingest; write paths (`threads_content_publish` /
`threads_manage_replies`) drive the S4 outbound actions and stay dormant until granted.

### D5 — Dormant-until-token, fail-closed (cross-slice)
Until the `conn-company-threads` secret lands **and** Meta App Review clears, the publish/reply path
is **disabled / propose-only** — the standing **no-live-sends-until-Mark-opens-the-test-stage** rule
(ICM test-pool rule) applies. Ingest collectors fail soft when the token is absent/expired (mark the
connection `expired`, surface a re-auth prompt, don't crash) — the LinkedIn token-lifecycle precedent
(ADR-0108 D5). The App Review screencast is recordable once S1 + S5 land.

### D6 — Belle owns the channel; Jarvis routes inbound by intent (S5 #1337)
Per ADR-0124 D5, Belle owns the Threads channel surface (publishing, monitoring, insights). Inbound
mentions/replies triage by **intent** via Jarvis (new lead → Chase / lead-response ICM; support →
Felix; brand/marketing → Belle), not by channel. The management GUI + Belle wiring is S5.

## Consequences

### Security impact
- **No secrets in schema, ADR, connector metadata, skills, or grants — the literal rule: Never commit
  secrets.** The Threads token lives in Key Vault as `conn-company-threads`, referenced by name only
  (ADR-0103/0122); the GUI/DB never hold the value.
- **Outbound is governed by default and customer-facing-capped.** Publishing/replying rides the
  ADR-0107/0124 deny-by-default plane — least-privilege grant, HARD customer-facing ceiling
  (ADR-0109/0121), `mark_gated`, human approval, audit — so a mis-routed or prompt-injected agent
  cannot emit a public Threads post without a grant and a human.
- **Dormant / fail-closed** until the token + App Review land — no half-open send path. Token expiry
  is a **visible** `expired` state with a re-auth prompt, never silent death (ADR-0108 D5).
- **Credential isolation.** Threads' own token means a Threads compromise cannot reach the Meta
  Page token (and vice versa) — separate secrets, separate blast radius.

### Cost impact
- Negligible plumbing cost. Ingestion is poll (scheduled on-prem, no per-event compute); outbound is
  event-driven and human-gated. No new AI provider (Belle = Claude; embeddings = Voyage). The only
  net-new operational surface is one more API client + one more credential.

### Operational impact
- **Schema (S2 #1336):** bronze `threads_posts/replies/mentions/insights` + the `interaction`
  source-`threads` mapping + `connection_provider += 'threads'`, one migration, Mark-gated prod apply
  like every migration. **OKF (§11):** new/updated concept entries + a `coverage-matrix.md` row land
  in that same S2 PR (semantic-layer gate). This ADR itself touches no silver entity shape, so it owes
  no OKF update on its own.
- **Cross-repo decomposition** (already filed): S3 ingest = LocalPipeline #356 (owns the merge,
  LP ADR-0026); S4 publish/reply = Backend #417; S6 mentions webhook = Pipeline #167 (later/optional).
- **Connector card (S1 #1335):** one entry in `src/lib/integrations/company-providers.ts` + its test;
  no migration at write time (the connection row can't be written until S2's enum value exists, which
  is the dormancy posture by construction).

## Future considerations
- **Real-time mentions webhook (S6 #167)** upgrades mention latency from poll to push via the event
  substrate (#991); v1's human-approval makes minutes-latency acceptable, so it is off the critical
  path.
- **No Threads ads API** exists today (Threads has no paid surface) — Threads stays organic-only; the
  ads track is Meta-only (Backend #406), so there is no `campaign`/`ad` wiring for Threads.
- **Earned autonomy** for low-risk organic scheduled Threads posts may rise above manual later under
  ADR-0121's graduated-autonomy ladder — but customer-facing replies stay HARD-capped.
- **Threads quote/repost + media** extend the publish skill, not the schema.
