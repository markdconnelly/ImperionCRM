# Stream 01 — Demand → Lead

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-NNNN](../../decision-records/ADR-NNNN-operating-procedure-catalog.md). Terms
> **Operating Procedure** / **Procedure Step** are defined in [`CONTEXT.md`](../../../CONTEXT.md).
>
> **D9 global principles apply to every procedure below** (encoded in each Human-in-loop field,
> not restated per entry): **P1** Nova-native human co-working (every flow co-works with a human
> through Nova) · **P2** each sub-agent's reasoning is ascribed back to the paired human, up the
> chain · **P3** an "easy button" at every human gate (prep to the goal, hand the human a one-click
> resolution) · **P4** urgent → dedicated chat, else → tag the team member in the shared Teams chat.

**Owner agent:** Belle (Marketing). **Owning ICM domain:** `icm/domains/marketing/`.
**Stream scope:** demand gen · campaigns · journeys · Events (Event / Event Registration /
Campaign Send) · the unified social plane (compose-once → fan-out publishing, ads/Boost
money-class, social DM/engagement monitoring) · lead capture & nurture **UP TO MQL**.

**Seam (Belle → Chase):** the `lead_score` crossing the marketing-qualified threshold IS
the hand-off — there is NO hand-off action. Procedures that nurture a lead emit a score
delta; when it crosses the threshold the lead routes to Chase / Stream 02 (lead-response).
Never duplicate Chase's qualify/close procedures here; reference them as the terminal step.

**Belle's hard rule:** never 1:1-DM an existing customer — `dm_existing_customer` is
**refused (not gated)**, routed to Celeste (relationship) / Felix (service).

**v1 governance baseline (applies to every procedure):** every **Social Action** is a
ProposedAction through the one gauntlet + pending-action cockpit (ADR-0124 D4 / ADR-0058);
**v1 = human-approves-all** regardless of the per-action ceiling. The per-action
`auto_at_level` / `always_gate` tags are the *capability ceiling*; the **production dial
starts conservative (L1)** and rises per earned autonomy. Read scope `{operational,
client_pii}` only.

**Driving policy (every procedure):** `TBD (mark-blocker: company-policy-collection)` (D4,
#1586). Brand/marketing-relevant policies Belle's procedures will cite: brand-voice &
messaging · CAN-SPAM/consent & list-hygiene · social-conduct & community-management ·
ad-spend authorization · lead-vs-customer contact · event/webinar · claims-substantiation.

**Dormancy flags:** **#389** Voyage embeddings (worker recall — TABLED) · **#991** event /
trigger substrate (poll-first v1) · **#119** trigger-sync · **creds** = `conn-company-meta`
/ `-threads` / `-linkedin` seed + Meta/Threads App Review + LP host task registration.

---

## 01-A · Compose & publish a Social Post (organic, compose-once → fan-out)
- **Owner / Stream:** Belle / 01.
- **Trigger:** content-calendar slot due, campaign milestone, or operator "post this".
- **Terminal outcome:** a `social_post` (+ per-channel rows) reaches **Published** (or
  **Scheduled**), with per-channel publish status + back-synced Social Metrics.
- **Procedure Steps:**
  1. `[automation]` Belle grounds: brand voice (OKF rooms), channel norms, linked campaign,
     recent Social Metrics, the calendar slot. **L0.**
  2. `[automation]` Draft the single composition + per-channel adaptations via the **Builder**.
     `auto_at_level=L2` to stage internally; publish = `publish_post_routine` `L3`.
  3. `[hybrid]` Route the publish as a Social Action → gauntlet → cockpit. A large/new-audience
     posture escalates to `publish_blast_new_or_large_audience` (**always_gate**).
  4. `[gui-step]` Human approves/edits in the cockpit (recedes L1→L3 for routine; blast stays gated).
  5. `[automation]` Dispatch per-channel; record status; back-sync Social Metrics (→ 01-M).
- **Driving policy:** TBD (#1586) — brand-voice, claims-substantiation.
- **Realization:** `icm/domains/marketing/social-content/` (ICM Workspace).
- **Autonomy ceiling:** L3 (routine post). `always_gate`: blast/new-or-large-audience.
- **Human-in-loop:** Belle drafts, marketing operator (Mark proxy v1) approves. Recedes
  L1→L3 for routine; blast always gated.
- **Substrate deps:** creds, #119, #389. **subject:** both. **Maps to:** #1418.

## 01-B · Boost a Social Post into a paid Ad (organic→paid bridge) — REINSTATED (D9-P3)
- **Owner / Stream:** Belle / 01.
- **Trigger:** a Published Social Post performs well (Social Metric threshold) or an operator
  elects to amplify it.
- **Terminal outcome:** an `ad` (under a Campaign, reusing the post as creative) is
  **Deployed** with a live budget — or parked at the money gate with the **full setup done**
  and a one-click easy button for the human (P3: the agent drives to the goal; the human
  actuates on the platform).
- **Procedure Steps:**
  1. `[automation]` Belle reads the post's Social Metrics + target audience (ad-consent gated,
     ADR-0026) and drafts the Boost (creative reuse, audience, budget). **L0/L1.**
  2. `[hybrid]` Emit `ad_deploy` as a money-class Social Action → gauntlet → cockpit.
  3. `[gui-step]` **Human approves the spend (always_gate, dial-proof) — one-click easy button.**
     Meta ad-account peer-approval is the platform twin of this gate.
  4. `[automation]` On approval, deploy via Meta Marketing API; record ids; spend/results →
     Social Metrics / `campaign_metric` → 01-M + attribution.
- **Driving policy:** TBD (#1586) — ad-spend authorization.
- **Realization:** `icm/domains/marketing/paid-ads/` (or shared social-content workspace).
- **Autonomy ceiling:** **always_gate** (money) at every level — never auto-executes.
- **Human-in-loop:** never recedes — money commitment is a permanent human hold (Sterling/Nick
  or Mark proxy). Belle drafts the full setup; a human clicks to commit (P3 easy button).
- **Substrate deps:** creds (Meta Ads scope + ad account id), #119, peer-approver set.
- **subject:** both. **Maps to:** #1338 (slice E/F dispatcher), `ad_deploy`/`ad_pause`/`ad_rebudget`.

## 01-C · Manage a live Ad budget / lifecycle (pause / re-budget) — REINSTATED (D9-P3)
- **Owner / Stream:** Belle / 01.
- **Trigger:** an Ad under-/over-performs vs target CPL, a budget pacing alert, or campaign end.
- **Terminal outcome:** the Ad is **Paused** or its budget **changed**, with the money decision
  logged through the cockpit (agent does the full setup; human clicks the easy button, P3).
- **Procedure Steps:**
  1. `[automation]` Belle reads live ad results (CPL, spend pace) vs the campaign target. **L0.**
  2. `[automation]` Draft a recommendation: pause, raise/lower budget, or hold.
  3. `[hybrid]` Emit the money-class Social Action → gauntlet → cockpit.
  4. `[gui-step]` **Human approves (always_gate) — one-click easy button.**
  5. `[automation]` Actuate via Meta Marketing API; reconcile spend to `campaign_metric` → 01-M.
- **Driving policy:** TBD (#1586) — ad-spend authorization.
- **Realization:** `icm/domains/marketing/paid-ads/` (ICM Workspace).
- **Autonomy ceiling:** **always_gate** (money) — permanent hold. Recommendation drafting
  auto-climbs to L2.
- **Human-in-loop:** never recedes on the commit. **Substrate deps:** creds (Meta Ads), #119.
- **subject:** both. **Maps to:** #1338 paid slice.

## 01-D · Triage the social inbox & reply (DM + Engagement, intent-routed)
- **Owner / Stream:** Belle / 01 (owns the TRIGGER = inbound social item).
- **Trigger:** an inbound **Social DM** (private → Interaction timeline) or **Social
  Engagement** (public comment/mention → Social Engagement store) lands.
- **Terminal outcome:** the item is intent-classified + routed; brand items get an on-brand
  reply (or queued); lead items emit a `lead_hook` (→ 01-F → 02); support items → Felix.
- **Procedure Steps:**
  1. `[automation]` Classify intent (lead | support | brand) via deterministic keyword classifier
     + cheap-model fallback; write `social_engagement.intent` + `assigned_agent_key`. **L0/L2.**
  2. `[automation]` **Route by intent (not channel):** lead → Stream 02 (Chase); support → Felix
     / Stream 04; brand → keep (Belle's).
  3. `[hybrid]` **Customer guard:** if the DM author is an existing customer, **REFUSE** the 1:1
     reply and route to Celeste/Felix. Hard stop.
  4. `[automation]` For brand items: draft the on-brand reply (`reply_dm_lead` /
     `reply_comment_public`, both `auto_at_level=L3`).
  5. `[gui-step]` Human approves the reply (v1); recedes L1→L3 (auto-reply to LEADS at L3,
     customers never).
  6. `[automation]` Send via per-network adapter; attach to Contact on match; log timeline.
- **Driving policy:** TBD (#1586) — social-conduct, lead-vs-customer contact.
- **Realization:** `icm/domains/marketing/social-inbox/` (ICM Workspace).
- **Autonomy ceiling:** L3 (reply to leads / public comment). `dm_existing_customer` is a
  **refusal floor** (stronger than gate) at every level.
- **Human-in-loop:** Belle drafts, marketing operator (Mark proxy) approves; recedes to L3
  auto-reply-to-leads. Customer-DM refusal is permanent.
- **Substrate deps:** creds, #119, #991 (poll-first v1), #389. **subject:** both. **Maps to:** #1419, #1338 slice G.

## 01-E · Monitor brand mentions & sentiment (listening sweep)
- **Owner / Stream:** Belle / 01.
- **Trigger:** scheduled listening sweep (poll cadence); or a spike alert (deferred — #991).
- **Terminal outcome:** mentions surfaced, sentiment-tagged, contact-linked on match; an
  actionable item (PR risk, advocacy, lead) routed; the rest logged for analytics.
- **Procedure Steps:**
  1. `[automation]` Sweep the Social Engagement store for new items; tag sentiment + topic. **L0.**
  2. `[automation]` Contact-link on author match (`tag_contact` L2); leave anonymous chatter off
     Contact-360.
  3. `[hybrid]` Route exceptions: reputational risk → escalate (operator/Celeste); advocacy →
     flag for amplification (→ 01-A); lead-worthy → `lead_hook` (→ 01-F); else log.
  4. `[automation]` Roll sentiment + volume into Social Metrics → 01-M / BI hub.
- **Driving policy:** TBD (#1586) — social-conduct, escalation.
- **Realization:** `icm/domains/marketing/social-inbox/` (shares 01-D workspace) — listening stage.
- **Autonomy ceiling:** L2 (tag/log internal). Any reply routes through 01-D's ceiling.
- **Human-in-loop:** recedes to L2 for tagging; risk-escalation always surfaces a human.
- **Substrate deps:** creds, #119, #991, #389. **subject:** both. **Maps to:** #1338 slice H.

## 01-F · Capture & normalize an inbound lead (the capture inbox)
- **Owner / Stream:** Belle / 01 (owns the capture inbox trigger).
- **Trigger:** a `lead_hook` arrives — web form, **Meta Lead Ad**, social DM turned
  lead-worthy, **Event Registration**, gated content, or list import.
- **Terminal outcome:** a normalized lead/contact with source + consent captured, deduped,
  ready for scoring (→ 01-G) and nurture (→ 01-H) — or, if already threshold-crossing, routed
  to Chase (→ 02).
- **Procedure Steps:**
  1. `[automation]` Ingest the `lead_hook`; capture source, UTM/campaign touch, consent state. **L0/L2.**
  2. `[automation]` Resolve **Client Mapping / contact dedupe** (shared sub-step); if author =
     existing **customer**, do NOT treat as new lead (01-D customer rule). `tag_contact` L2.
  3. `[automation]` Stamp the attribution touch for multi-touch ROI (#1316) → 01-M.
  4. `[automation]` Enqueue for scoring (01-G). If the source already implies MQL-grade fit/intent,
     emit the threshold-crossing score → routes to Chase / Stream 02 (the seam).
- **Driving policy:** TBD (#1586) — consent/list-hygiene, lead-vs-customer.
- **Realization:** `icm/domains/marketing/lead-capture/` (ICM Workspace).
- **Autonomy ceiling:** L2 (internal reversible: create/tag/dedupe). No external send.
- **Human-in-loop:** low — internal records auto at L2; human spot-checks dedupe.
- **Substrate deps:** creds (Meta Lead Ads scope), #119 (LP collectors), #389. **subject:** both.

## 01-G · Score a lead & evaluate the MQL threshold (the seam emitter)
- **Owner / Stream:** Belle / 01.
- **Trigger:** a lead is captured (01-F) OR a behavioral signal accrues OR a scheduled re-score.
- **Terminal outcome:** `lead_score` recomputed; **if it crosses the marketing-qualified
  threshold the lead becomes an MQL and routes to Chase (Stream 02)** — the crossing IS the
  seam; otherwise it stays in Belle's nurture.
- **Procedure Steps:**
  1. `[automation]` Recompute `lead_score` from fit + engagement (rule-based v1). **L0/L2.**
  2. `[automation]` Persist the score (internal reversible write, L2).
  3. `[hybrid]` Evaluate vs the MQL threshold. **Crossed → routes to Chase / lead-response
     (ADR-0024) — terminal hand-off STEP into Stream 02.** Not crossed → 01-H.
  4. `[automation]` Emit the attribution + scoring event for analytics (→ 01-M, #1316).
- **Driving policy:** TBD (#1586) — lead-scoring/MQL-definition.
- **Realization:** `icm/domains/marketing/lead-scoring/` (ICM Workspace).
- **Autonomy ceiling:** L2 (internal score write). Routing is a deterministic event, not an actuation.
- **Human-in-loop:** low; threshold + routing rule is governed config. Human tunes the model.
- **Substrate deps:** #389 (predictive features dormant), #991. **subject:** both. **Seam:** Belle→Chase.

## 01-H · Run a nurture journey (multi-step cadence, up to MQL)
- **Owner / Stream:** Belle / 01.
- **Trigger:** a contact is enrolled — by segment membership, a captured lead below MQL,
  event follow-up, or manual enrollment.
- **Terminal outcome:** the contact progresses through send/wait/branch/score steps, terminating
  at **MQL (→ 01-G → Chase)**, journey exit, or unsubscribe.
- **Procedure Steps:**
  1. `[automation]` Enroll on the `workflow`/`workflow_enrollment` substrate (ADR-0073). **L0/L2.**
  2. `[automation]` Execute the next step on cadence: A/B send / wait / branch / score-bump (L2).
  3. `[hybrid]` Each send is consent-gated → Campaign Send path (01-I). Large/new-audience → `always_gate`.
  4. `[automation]` **Manage the audience segment (folded 01-J step):** build/refresh the
     `segment` + `segment_member` (dynamic re-eval on cadence; respect suppression/non-interest
     flags) as the enrollment source. Feed engagement back to scoring (01-G); on MQL exit → Chase.
- **Driving policy:** TBD (#1586) — consent/list-hygiene, journey/cadence.
- **Realization:** `icm/domains/marketing/journeys/` (ICM Workspace; runner BE #145).
- **Autonomy ceiling:** L2 internal step records; sends inherit 01-I (blast = always_gate).
- **Human-in-loop:** approve sends (v1); recedes as routine low-risk sends earn L3; blasts gated.
- **Substrate deps:** journey runner BE #145, #991, #389. **subject:** both. **Maps to:** #1420.

## 01-I · Schedule & fire a Campaign Send (consent-gated blast)
- **Owner / Stream:** Belle / 01 (owns the send trigger).
- **Trigger:** a Campaign Send is scheduled — fixed time, relative to an Event start, or as a
  journey step (01-H).
- **Terminal outcome:** the email/SMS blast is **delivered** to its consented audience
  (per-recipient consent-gated at send time), metrics back-synced — or parked if large/new-audience.
- **Procedure Steps:**
  1. `[automation]` Build the send (Builder) + resolve the audience/segment. **L1/L2.**
  2. `[automation]` **Consent gate per recipient at send time** (CAN-SPAM, opt-out, frequency caps)
     — drop non-consented; a hard filter, not advisory.
  3. `[hybrid]` Route as a ProposedAction. Routine/known-audience climbs toward L3;
     `publish_blast_new_or_large_audience` = always_gate.
  4. `[gui-step]` Human approves the blast (always_gate case) / approves routine (v1).
  5. `[automation]` Fire via backend (ADR-0058 backend-only); back-sync metrics → 01-M + BI hub.
- **Driving policy:** TBD (#1586) — consent/CAN-SPAM/list-hygiene.
- **Realization:** `icm/domains/marketing/campaign-send/` (ICM Workspace).
- **Autonomy ceiling:** L3 (routine known-audience). `always_gate`: large/new-audience blast.
- **Substrate deps:** backend send path (ADR-0058), #119, consent data. **subject:** both. **Maps to:** ADR-0053.

## 01-K · Run an Event lifecycle (webinar / live event fill → attendance → nurture)
- **Owner / Stream:** Belle / 01.
- **Trigger:** an Event is created (a scheduled webinar/live event Imperion hosts).
- **Terminal outcome:** the Event is **filled** (registrations), **attendance recorded**, and
  post-event nurture enrolled.
- **Procedure Steps:**
  1. `[automation]` Drive fill: campaigns + Campaign Sends (→ 01-I) + organic posts (→ 01-A). **L1/L2.**
  2. `[automation]` Capture each **Event Registration** through the capture inbox (→ 01-F).
  3. `[automation]` Fire reminder Campaign Sends relative to Event start (consent-gated, 01-I).
  4. `[gui-step]` After the event, record attendance (attended / no-show). `[hybrid]` if auto-pulled.
  5. `[automation]` Enroll attendees/no-shows into nurture (→ 01-H); attendance drives scoring (→ 01-G).
- **Driving policy:** TBD (#1586) — event/webinar, consent.
- **Realization:** `icm/domains/marketing/events/` (ICM Workspace).
- **Autonomy ceiling:** L2 internal; sends inherit 01-I; blast = always_gate.
- **Substrate deps:** #119, event-platform connector (may be a **Planned Connector**). **subject:** both.

## 01-L · Plan & launch a marketing campaign (the orchestrating container)
- **Owner / Stream:** Belle / 01.
- **Trigger:** a campaign brief / quarterly plan / product or event push.
- **Terminal outcome:** a `campaign` exists with goal, audience, channel mix, budget envelope,
  and its child sends/posts/ads/journey/event scheduled — **launched** and attributable.
- **Procedure Steps:**
  1. `[automation]` Belle drafts: objective, target segment, channel mix, proposed budget,
     message. **L0/L1.**
  2. `[gui-step]` Human approves the plan + budget envelope (the actual ad spend stays `always_gate`
     per 01-B/01-C).
  3. `[automation]` Instantiate children: posts (01-A), sends (01-I), a journey (01-H), ads (01-B),
     an event (01-K) — each carrying the campaign attribution tag.
  4. `[automation]` Wire campaign-level attribution + metric rollup (→ 01-M / #1316).
- **Driving policy:** TBD (#1586) — brand, ad-spend authorization.
- **Realization:** `icm/domains/marketing/campaign-plan/` (ICM Workspace) — orchestrator
  referencing 01-A/H/I/B/K as sub-procedures, never duplicating them.
- **Autonomy ceiling:** L2 (plan/draft internal). Spend within it inherits always_gate.
- **Substrate deps:** #389, #119. **subject:** both. **Maps to:** #1338, ADR-0053.

## 01-M · Surface marketing analytics & attribution (the reporting back-channel)
- **Owner / Stream:** Belle / 01.
- **Trigger:** scheduled reporting cadence, a campaign close, or an operator opening the
  analytics / BI hub marketing section.
- **Terminal outcome:** Social Metrics + send/journey/event/ad results normalized, unioned
  (organic ∪ paid), surfaced as marketing ROI (sourced/influenced pipeline vs spend, CPL, CAC,
  ROAS) — numbers match everywhere.
- **Procedure Steps:**
  1. `[automation]` Ingest/normalize Social Metrics (#135 normalization) + `campaign_metric`. **L0.**
  2. `[automation]` Union organic ∪ paid; compute multi-touch attribution over touch →
     opportunity → won (#1316).
  3. `[gui-step]` Surface in `/social/analytics` + `/reporting#marketing` (BI hub, ADR-0062).
  4. `[hybrid]` Flag under-performing channels/campaigns → feeds 01-C (re-budget) / 01-L (re-plan).
- **Driving policy:** TBD (#1586) — reporting/metrics-governance.
- **Realization:** mostly read-model; realized in its workspace only for the normalize/flag steps.
- **Autonomy ceiling:** L0/L1 (read + flag). No actuation.
- **Substrate deps:** #119 (metric collectors), #135 (resolved). **subject:** both. **Maps to:** #1338 slice D, #1316.

---

## Coverage note

Demand→Lead surface fully covered: content (A), paid (B/C), inbound social (D/E), lead
capture/score/nurture (F/G/H), outbound comms (I), events (K), campaign orchestration (L),
analytics/attribution (M). The audience-segment unit (former 01-J) folds as a step of H/I
(D3 sizing). The stream terminates at the `lead_score` MQL crossing (01-G) → Stream 02; no
qualify/close procedure appears here (correctly — that's Chase/Stream 02).

**Count: 13 Operating Procedures** (01-A … 01-M; 01-J folded as a step per D9).
