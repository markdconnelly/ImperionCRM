---
adr: 0124
title: "Social Media Management plane (unified, per-network adapters)"
status: proposed
date: 2026-06-25
repo: frontend
summary: "One unified Social Media Management plane (Social Channel abstraction: one inbox, one publishing surface, one analytics view) over per-network connector+collector+send-adapter adapters for Meta (FB Page, Instagram, Messenger, Threads) + Meta ads + LinkedIn. Inbound splits: private Social DM → Interaction timeline (kind=dm) + lead_hook; public comments/mentions → a separate Social Engagement store (contact-linked on match) to keep Contact-360 clean. Social Post = compose-once → fan-out (not a Campaign Send). Every outbound is one Social Action through the gauntlet + pending-action cockpit with per-action-type autonomy ceilings (money + customer-facing HARD-capped); v1 = human-approves-all. Belle owns the channel; inbound routes by intent (lead→Chase, support→Felix, brand→Belle). Ad under Campaign + Boost bridge + Ad Lead capture. Three credentials (conn-company-meta / -threads / -linkedin), company-scope. Poll-first v1 (webhooks deferred). Social Metric → silver time-series → BI hub. oEmbed out of scope. Umbrella epic #1338; adapters Threads #1334 / LinkedIn #1007 / Meta ads Backend #406."
tags: [social, marketing, agents, integrations]
---

# ADR-0124: Social Media Management plane (unified, per-network adapters)

## Problem / context

Mark wants Imperion OS to **manage all of the company's social media as much as possible** — across
Meta (Facebook Page, Instagram, Messenger DMs, Threads), Meta **ads** (create/manage, measure,
capture leads), and LinkedIn — with the marketing agent (**Belle**) building content and running the
channels under human approval. Today only FB/IG **ingestion** exists (on-prem PowerShell poll,
`graph.facebook.com` v23.0); the Meta DM **send** path exists but is dormant/fail-closed
(`meta-dm.ts`, 24h-window + human-approved gate); Meta Marketing API push is Backend #406; Threads is
net-new (`graph.threads.net`, separate OAuth, epic #1334); LinkedIn is epic #1007. These were growing
as independent per-network tracks with parallel vocabulary and parallel inbox/approval logic. This ADR
sets the **one** domain model and the boundaries so the networks stay adapters, not silos.

Each network's API/OAuth/credential is irreducibly per-network; the question this ADR answers is the
layer **above** that.

## Decisions

1. **Unified plane, per-network adapters.** One **Social Channel** abstraction (the company's presence
   on one network) with one inbox, one publishing surface, one analytics view — each backed by a
   per-network Connector + collector + send-adapter. New network = new adapter, not new UI. (Mirrors how
   the Connections model already abstracts per-vendor credentials behind one card grid, ADR-0122.)

2. **Inbound split — the deliberate, surprising one.** Private **Social DMs** join the unified
   **Interaction** timeline (ADR-0011, `kind=dm`) and spawn **lead_hooks** (ADR-0024) — the existing
   Meta-DM path. Public **Social Engagements** (comments on our posts, brand mentions) land in a
   **separate Social Engagement store**, linked to a Contact only on match. *Rationale:* the Interaction
   timeline is contact-centric and feeds Contact-360; public comments/mentions are frequently from
   anonymous accounts not in the contact graph, so routing them onto the timeline would pollute
   Contact-360. A future reader will ask "why aren't comments Interactions?" — this is why.

3. **Social Post = compose-once → fan-out.** Organic content is authored once and published to one or
   more Social Channels; per-network adapters adapt to each network's constraints. Lifecycle
   Draft → Scheduled → Published; optional link to a marketing **Campaign**. NOT modeled as a
   **Campaign Send** (which is recipient-targeted + per-recipient consent-gated email/SMS — a public
   broadcast has neither). Authored via the existing **Builder** pattern (ADR-0053).

4. **One outbound governance path — Social Action.** Every outbound act (publish post, reply to
   DM/comment, deploy/pause/re-budget an ad) is a **ProposedAction** through the one gauntlet +
   pending-action cockpit (ADR-0058 path). **Per-action-type autonomy ceilings:** money (ad spend) and
   customer-facing (DMs, public replies) are HARD-capped (ADR-0055/0109/0121); low-risk organic
   scheduled posts may earn higher autonomy later. **v1: every Social Action is human-approved.** One
   funnel, one audit trail.

5. **Belle owns the channel; inbound routes by intent.** Belle owns the channel surface (publishing,
   ads, monitoring). Inbound Social DMs/Engagements triage by **intent** via Jarvis: new lead → Chase /
   the lead-response ICM workflow, support → Felix, brand/marketing → Belle. The drafting agent depends
   on intent, not channel.

6. **Ad under Campaign + Boost bridge.** An **Ad** (creative + audience + budget + Meta
   `act_`/campaign/adset/ad ids) is a distinct object grouped under the existing marketing **Campaign**
   (ADR-0026 audiences + ad_targeting consent). A published Social Post can be **Boosted** into an Ad
   reusing that post as creative; pure paid creative is still authored via the ad-builder. **Ad Leads**
   (Meta Lead Ads) land in the capture inbox as lead_hooks (`source=meta_lead_ad`). Execution =
   Backend #406.

7. **Connector topology — 3 credentials.** `conn-company-meta` (one Meta app token, union of scopes:
   FB Page + Instagram + Messenger + Ads), `conn-company-threads` (separate Threads OAuth),
   `conn-company-linkedin` (separate). All **company-scope, no client mapping** (Meta precedent,
   ADR-0122). The Meta card MAY render as two views (Meta Social / Meta Ads) over the one secret (Datto
   2-cards/1-key precedent), but it is a single Credential.

8. **Inbound delivery — poll-first v1.** Reuse the on-prem poll for Meta; add Threads + LinkedIn polls.
   Webhooks are a deferred targeted upgrade for DMs + mentions (event substrate #991) — v1's
   human-approval makes minutes-latency acceptable, so the webhook build is not on the v1 critical path.

9. **Analytics — Social Metric → BI hub + in-plane view.** Per-network metrics ingest as silver
   **time-series snapshots** (per post / ad / channel), with each network's unstable metric names
   normalized at the silver step (resolving #135). Surfaced in the BI hub (ADR-0062, the single intel
   surface) AND an at-a-glance in-plane view; ad results feed Marketing Attribution (#1316).

10. **Out of scope.** Meta's "Embed FB/IG/Threads content in other websites" (oEmbed) is **display**,
    not management — deferred to a possible public-marketing-site feature, off this plane's critical path.

## Considered options (the non-obvious rejections)

- **Inbound:** "all social items → Interaction timeline" (rejected — pollutes Contact-360 with anonymous
  public chatter) and "everything → separate social store, promote on match" (rejected — breaks the
  working Meta-DM→Interaction path, duplicates timeline logic). Chose the **split**.
- **Organic posts:** extend Campaign Send to `channel=social` (rejected — bends a recipient/consent
  model onto a public broadcast that has neither).
- **Governance:** per-channel native gates (rejected — fragments the audit trail) and one uniform ceiling
  (rejected — the safe setting drags everything to manual). Chose **one path, per-type ceilings**.
- **Connectors:** one credential per surface (rejected — Meta issues one scoped token per app; would
  store the same token N times).

## Security impact

- Outbound is the risk surface: every Social Action is governed (gauntlet + cockpit), money +
  customer-facing HARD-capped, v1 fully human-approved. Capabilities are **dormant/fail-closed** until
  each credential lands + Meta App Review clears (Threads/ads/Instagram in review; Messenger + Page
  "Testing complete"). Tokens live in Key Vault (`conn-company-*`), never the DB, never logged. Meta
  ad-account **peer approval** (publishing protection) is the platform-level twin of the in-app money
  ceiling — both required before any ad goes live.

## Cost impact

- Ad spend is real money — hard-capped per-action with budgets + killswitch (wedge containment gates).
  Ingestion is poll (no per-event compute). No new AI provider (Belle = Claude; embeddings = Voyage).

## Operational impact

- Three new/extended connectors; per-network collectors on-prem; one backend send-adapter set; one
  in-plane management surface + BI wiring. Threads & LinkedIn are net-new API clients; Meta extends the
  existing client with publish/ads/IG-content scopes.

## Relationships

- **Extends:** ADR-0011 (interaction timeline), ADR-0024 (lead_hooks), ADR-0026 (audiences/ad consent),
  ADR-0053 (builders/campaigns), ADR-0058 (approval-gated outbound), ADR-0062 (BI hub), ADR-0073
  (marketing journeys), ADR-0055/0109/0121 (autonomy ceilings), ADR-0122 (connections topology).
- **Parents/absorbs:** the "ADR owed" item on Threads epic #1334 (Threads is one adapter under this
  plane); reconciles LinkedIn epic #1007 as another adapter; Meta ads execution = Backend #406.
- **Future:** webhook inbound via event substrate #991; attribution via #1316; metric-name normalization
  #135.

## Implementation note — slice A schema (2026-06-26)

Slice A (#1339, epic #1338) is the silver schema only — read-model, no app code/UI (slices B/G).
The grilled (`grill-with-docs`) reframe: most ADR-0124 entities already exist, so slice A is **2 new
content tables + 1 new inbound store + EXTEND `ad` + REUSE the metric tables + governance-by-reference**,
not five new tables. The six locked decisions, recorded verbatim against migration `0210_social_plane_schema.sql`
(number claimed at merge, §10.3):

1. **Metrics — reuse, no new table.** Organic (post/channel) → existing `social_metric` (mig 0075;
   `entity_kind` widened in vocabulary to cover `threads`/`linkedin` post entities — free-text, no
   migration). Paid (ad) → existing `campaign_metric` (mig 0023). A BI union view (`social_performance`)
   is deferred to slice D. No new metric entity.

2. **Ad — extend `ad` (mig 0023), no new table.** +4 columns: `adset_external_ref` (the missing middle of
   the Meta act_/campaign/**adset**/ad hierarchy — ad-id stays in `external_ref`), `daily_budget` (ad-level;
   campaign-level `budget` already exists), `audience_id` → `audience` (NULL), `boosted_from_social_post_id`
   → `social_post` (NULL — the Boost bridge). `act_<adAccountId>` is a `conn-company-meta` credential-blob
   value (BE #426), **not** a row column.

3. **Social Post — new parent + child.** `social_post` = compose-once single composition
   (draft→scheduled→published→archived intent), optional `campaign_id`. `social_post_channel` = per-network
   fan-out result, `UNIQUE (social_post_id, channel)`, publish status incl. `failed`, platform `external_id`
   + `error`. New enum `social_channel` (facebook│instagram│threads│linkedin│messenger); **no** channel-registry
   table — "connected" is derived from `connection` rows.

4. **Social Engagement — new table** (the #2 inbound-split store): public comments on our posts + brand
   mentions, `UNIQUE (channel, external_id)` for idempotent poll-in merge, author captured inline,
   `contact_id` set only on match (slice G), `on_social_post_channel_id` for comments on our posts. **NOT on
   the Interaction timeline** (#2). v1 scope = organic-post comments + mentions; ad-comment ingestion deferred.

5. **Social Action — no schema.** The existing `agent_pending_action` (mig 0158) + the 11 social
   `action_kind`s (#418), seeded/ceiled by 0209, paid-wired by #426. Direction is action→object via the
   action payload; no back-FK on the content tables. Slice A deliverable = OKF documentation of the linkage
   + per-type ceilings only.

6. **data_class + grants.** `data_class = operational` for all (matching `social_metric`/`campaign`/
   `campaign_metric`). `social_engagement` third-party **author PII** is handled by an OKF lawful-basis note
   (ADR-0025), not by over-classing the table's read-gate. Grants (ADR-0042 §1): `social_post`/`_channel` =
   web SELECT, backend RW, pipeline SELECT; `social_engagement` = web SELECT, backend UPDATE (triage),
   pipeline/LP RW (poll-in merge, ADR-0026); `ad` = + backend INSERT (Boost mints an ad, beyond 0205's
   SELECT,UPDATE). Defensive `DO $$ … pg_roles … $$` idiom (0158/0123).
