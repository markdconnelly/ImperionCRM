# Stream 01 — Demand → Lead

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-0133](../../decision-records/ADR-0133-operating-procedure-catalog.md). Terms
> **Operating Procedure** / **Procedure Step** are defined in [`CONTEXT.md`](../../../CONTEXT.md).
>
> **Workflow Doctrine (ADR-0136) is inherited by every procedure below — not restated per entry.**
> The eleven cross-cutting rules (A1–A11) and the nine archetype step-templates (B1–B9) are the
> floor. Each procedure names its **archetype** and declares only its *deltas*. The doctrine carries:
> the universal `always_gate` set (A2) · L0 ship-dial (A3) · the 4-part easy-button bar at every gate
> (A4) · the evidence floor — cite + as-of, empty→park/delegate (A5) · computed-urgency notification
> + `reports_to` fallback (A6) · pool-never-bleed (A7) · idempotent actuation + read-back (A9) ·
> reversibility→derived-ceiling + halt-no-rollback (A10) · obligation/action separation (A11).

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

**Archetype map (B-templates this stream instantiates).**

| Procedure | Archetype |
|---|---|
| 01-A compose & publish social post | **B7 client-facing-send** (blast carve-out → always_gate) |
| 01-B boost post → Ad | **B6 money-gate** (spend always_gate) |
| 01-C manage live Ad budget | **B6 money-gate** (spend always_gate) |
| 01-D triage social inbox & reply | **B1 triage/route** + **B7** (the reply) |
| 01-E monitor mentions & sentiment | **B3 synthesis-brief** (listening, no actuation) |
| 01-F capture & normalize inbound lead | **B1 triage/route** (intake) |
| 01-G score lead & evaluate MQL ⛔ | **B1 triage/route** (the Belle→Chase seam emitter) |
| 01-H run nurture journey | **B7 client-facing-send** (sends inherit 01-I) |
| 01-I schedule & fire Campaign Send | **B7 client-facing-send** (blast → always_gate) |
| 01-K run an Event lifecycle | **B9 deadline-sentinel** (Event-start clocks) + **B7** sends |
| 01-L plan & launch a campaign | **B9 deadline-sentinel** (launch) + container of A/H/I/B/K |
| 01-M marketing analytics & attribution | **B3 synthesis-brief** (read-model, no actuation) |
| 01-N author content asset (content/enablement/PR) | **B7 client-facing-send** variant (publish = HANDOFF to Loveable, not a send) |
| 01-O capture customer reference | **B1 intake/capture** (post-consent; name/logo-use → always_gate) |

**Driving policy (every procedure):** inherits the doctrine universal baseline (ADR-0136 A2/A4/A5)
+ `TBD (mark-blocker: company-policy-collection)` (D4, #1586) for the specific drivers.
Brand/marketing-relevant policies Belle's procedures will cite: brand-voice &
messaging · CAN-SPAM/consent & list-hygiene · social-conduct & community-management ·
ad-spend authorization · lead-vs-customer contact · event/webinar · claims-substantiation.

**Dormancy flags:** **#389** Voyage embeddings (worker recall — TABLED) · **#991** event /
trigger substrate (poll-first v1) · **#119** trigger-sync · **creds** = `conn-company-meta`
/ `-threads` / `-linkedin` seed + Meta/Threads App Review + LP host task registration.

---

## 01-A · Compose & publish a Social Post (organic, compose-once → fan-out)
- **Owner / Stream:** Belle / 01. **Archetype:** B7 client-facing-send (public post — not the
  transactional-ack carve-out; routine post → L3, blast → always_gate).
- **Trigger:** content-calendar slot due, campaign milestone, or operator "post this".
- **Terminal outcome:** a `social_post` (+ per-channel rows) reaches **Published** (or
  **Scheduled**), with per-channel publish status + back-synced Social Metrics.
- **Procedure Steps** (B7: ground → compose → SEND GATE → send → log):
  1. `[automation]` **Ground** brand voice (OKF rooms), channel norms, linked campaign,
     recent Social Metrics, the calendar slot — **cite each source + as-of**; empty/no brand
     room → park, never fabricate brand claims (A5). **L0.**
  2. `[automation]` **Compose** the single composition + per-channel adaptations via the **Builder**
     — no fabricated capability/claim (A5/B7). `auto_at_level=L2` to stage internally; publish =
     `publish_post_routine` `L3`.
  3. `[hybrid]` **SEND GATE:** route the publish as a Social Action → gauntlet → cockpit. A
     large/new-audience posture escalates to `publish_blast_new_or_large_audience` (**always_gate**
     — A2 class-2). The gate presents the 4-part easy-button (A4): drafted post + grounded why +
     one-click Publish (+ one-click unpublish, the reversible inverse) + reach/audience preview.
  4. `[gui-step]` Human approves/edits in the cockpit (recedes L1→L3 for routine; blast stays gated).
  5. `[automation]` **Dispatch** per-channel, **idempotency-keyed so a retry is a no-op** (A9b);
     **read back** publish status before close (A9c); back-sync Social Metrics (→ 01-M).
- **Autonomy ceiling rationale:** routine post is **externally reversible with clean undo (unpublish)
  → max L4**, dialed to L3 (B7 client-visible); blast = always_gate. Pool-correlate prior post
  performance internally only (A7).
- **Driving policy:** TBD (#1586) — brand-voice, claims-substantiation.
- **Realization:** `icm/domains/marketing/social-content/` (ICM Workspace).
- **Autonomy ceiling:** L3 (routine post). `always_gate`: blast/new-or-large-audience.
- **Human-in-loop:** Belle drafts, marketing operator (Mark proxy v1) approves. Recedes
  L1→L3 for routine; blast always gated.
- **Substrate deps:** creds, #119, #389. **subject:** both. **Maps to:** #1418.

## 01-B · Boost a Social Post into a paid Ad (organic→paid bridge) — REINSTATED (A4)
- **Owner / Stream:** Belle / 01. **Archetype:** B6 money-gate (spend out = always_gate class-1,
  forever — A2; Meta is the external SoR the write idempotently mirrors, A9).
- **Trigger:** a Published Social Post performs well (Social Metric threshold) or an operator
  elects to amplify it.
- **Terminal outcome:** an `ad` (under a Campaign, reusing the post as creative) is
  **Deployed** with a live budget — or parked at the money gate with the **full setup done**
  and a one-click easy button for the human (A4: the agent drives to the goal; the human
  actuates on the platform).
- **Procedure Steps** (B6: ground → compute → draft → MONEY GATE → actuate → log):
  1. `[automation]` **Ground + compute:** read the post's Social Metrics + target audience
     (ad-consent gated, ADR-0026), **cite each + as-of** (A5), and draft the Boost (creative
     reuse, audience, budget). **L0/L1.**
  2. `[hybrid]` Emit `ad_deploy` as a money-class Social Action → gauntlet → cockpit.
  3. `[gui-step]` **MONEY GATE — human approves the spend (always_gate, dial-proof).** The
     4-part easy-button (A4) presents the drafted ad + grounded why + one-click Deploy + the
     **consequence preview (exact $ budget + irreversibility flag — spend is settled money, A10
     "no clean undo")**. Meta ad-account peer-approval is the platform twin of this gate.
  4. `[automation]` On approval, deploy via Meta Marketing API, **idempotency-keyed (procedure +
     ad + period) so a replay is a no-op, never a double-spend** (A9b); **read back** the live ad
     id/budget to confirm it landed (A9c); spend/results → Social Metrics / `campaign_metric` →
     01-M + attribution.
- **Driving policy:** TBD (#1586) — ad-spend authorization.
- **Realization:** `icm/domains/marketing/paid-ads/` (or shared social-content workspace).
- **Autonomy ceiling:** **always_gate** (money) at every level — never auto-executes.
- **Human-in-loop:** never recedes — money commitment is a permanent human hold (Sterling/Nick
  or Mark proxy). Belle drafts the full setup; a human clicks to commit (P3 easy button).
- **Substrate deps:** creds (Meta Ads scope + ad account id), #119, peer-approver set.
- **subject:** both. **Maps to:** #1338 (slice E/F dispatcher), `ad_deploy`/`ad_pause`/`ad_rebudget`.

## 01-C · Manage a live Ad budget / lifecycle (pause / re-budget) — REINSTATED (A4)
- **Owner / Stream:** Belle / 01. **Archetype:** B6 money-gate (budget change = spend commit,
  always_gate class-1; Meta = external SoR, A9). *Pause* alone is reversible, but a re-budget is a
  money commitment → the procedure gates conservatively.
- **Trigger:** an Ad under-/over-performs vs target CPL, a budget pacing alert, or campaign end.
- **Terminal outcome:** the Ad is **Paused** or its budget **changed**, with the money decision
  logged through the cockpit (agent does the full setup; human clicks the easy button, A4).
- **Procedure Steps** (B6: ground → compute → draft → MONEY GATE → actuate → reconcile):
  1. `[automation]` **Ground:** read live ad results (CPL, spend pace) vs the campaign target,
     **cited + as-of** (A5). **L0.**
  2. `[automation]` Draft a recommendation: pause, raise/lower budget, or hold.
  3. `[hybrid]` Emit the money-class Social Action → gauntlet → cockpit.
  4. `[gui-step]` **MONEY GATE — human approves (always_gate)** with the 4-part easy-button (A4:
     drafted change + grounded why + one-click commit + the new-$ / delta consequence preview).
  5. `[automation]` Actuate via Meta Marketing API, **idempotency-keyed** (A9b); **read back** the
     new budget/state before close (A9c); reconcile spend to `campaign_metric` → 01-M.
- **Autonomy ceiling rationale:** **budget commit = no clean undo → always_gate forever** (A10);
  recommendation drafting auto-climbs to L2 (internal reversible).
- **Driving policy:** TBD (#1586) — ad-spend authorization.
- **Realization:** `icm/domains/marketing/paid-ads/` (ICM Workspace).
- **Autonomy ceiling:** **always_gate** (money) — permanent hold. Recommendation drafting
  auto-climbs to L2.
- **Human-in-loop:** never recedes on the commit. **Substrate deps:** creds (Meta Ads), #119.
- **subject:** both. **Maps to:** #1338 paid slice.

## 01-D · Triage the social inbox & reply (DM + Engagement, intent-routed)
- **Owner / Stream:** Belle / 01 (owns the TRIGGER = inbound social item). **Archetype:** B1
  triage/route (ground → classify → route) **+ B7 client-facing-send** for the reply.
- **Trigger:** an inbound **Social DM** (private → Interaction timeline) or **Social
  Engagement** (public comment/mention → Social Engagement store) lands.
- **Terminal outcome:** the item is intent-classified + routed; brand items get an on-brand
  reply (or queued); lead items emit a `lead_hook` (→ 01-F → 02); support items → Felix.
- **Procedure Steps** (B1 ground→classify→route, then B7 for the reply):
  1. `[automation]` **Ground + classify** intent (lead | support | brand) via deterministic
     keyword classifier + cheap-model fallback, **citing the inbound item + as-of** (A5);
     write `social_engagement.intent` + `assigned_agent_key`. **L0/L2.**
  2. `[automation]` **Route by intent (not channel) — auto at L2 (routing is internally reversible,
     B1):** lead → Stream 02 (Chase); support → Felix / Stream 04; brand → keep (Belle's). **SEAM:
     the hand-off is an explicit step; the receiving agent owns its act, Belle owns the routing
     clock (A11).** Cross-client signal correlation in classification is internal-only (A7).
  3. `[hybrid]` **Customer guard:** if the DM author is an existing customer, **REFUSE** the 1:1
     reply and route to Celeste/Felix. Hard stop (refusal floor, stronger than any A2 gate).
  4. `[automation]` For brand items: draft the on-brand reply (`reply_dm_lead` /
     `reply_comment_public`, both `auto_at_level=L3`) — no fabricated capability/claim (A5/B7).
  5. `[gui-step]` **SEND GATE** — human approves the reply (v1) with the 4-part easy-button (A4);
     recedes L1→L3 (auto-reply to LEADS at L3, customers never). Free-text reply stays gated; only
     a templated non-committal ack could ever reach L3 (B7 carve-out).
  6. `[automation]` Send via per-network adapter, **idempotency-keyed** (A9b); attach to Contact on
     match; **read back** send status; log timeline.
- **Driving policy:** TBD (#1586) — social-conduct, lead-vs-customer contact.
- **Realization:** `icm/domains/marketing/social-inbox/` (ICM Workspace).
- **Autonomy ceiling:** L3 (reply to leads / public comment). `dm_existing_customer` is a
  **refusal floor** (stronger than gate) at every level.
- **Human-in-loop:** Belle drafts, marketing operator (Mark proxy) approves; recedes to L3
  auto-reply-to-leads. Customer-DM refusal is permanent.
- **Substrate deps:** creds, #119, #991 (poll-first v1), #389. **subject:** both. **Maps to:** #1419, #1338 slice G.

## 01-E · Monitor brand mentions & sentiment (listening sweep)
- **Owner / Stream:** Belle / 01. **Archetype:** B3 synthesis-brief (gather → synthesize → route)
  — listening only, **no actuation**; an actionable item auto-spawns the owning worker procedure
  parked/draft (a launchpad, not a readout).
- **Trigger:** scheduled listening sweep (poll cadence); or a spike alert (deferred — #991).
- **Terminal outcome:** mentions surfaced, sentiment-tagged, contact-linked on match; an
  actionable item (PR risk, advocacy, lead) routed; the rest logged for analytics.
- **Procedure Steps** (B3: gather → synthesize → route):
  1. `[automation]` **Gather:** sweep the Social Engagement store for new items, **citing each
     item + as-of**; on dormant source (poll down / #389 recall down) **say so, don't present
     dormant as live** (A5c). Tag sentiment + topic. **L0.**
  2. `[automation]` Contact-link on author match (`tag_contact` L2); leave anonymous chatter off
     Contact-360. Cross-client mention correlation stays internal/aggregated (A7).
  3. `[hybrid]` **Route exceptions (launchpad, B3):** reputational risk → escalate
     (operator/Celeste; urgency computed per A6); advocacy → auto-spawn an amplification post
     parked-draft (→ 01-A); lead-worthy → `lead_hook` (→ 01-F); else log. Belle never actuates here.
  4. `[automation]` Roll sentiment + volume into Social Metrics → 01-M / BI hub.
- **Driving policy:** TBD (#1586) — social-conduct, escalation.
- **Realization:** `icm/domains/marketing/social-inbox/` (shares 01-D workspace) — listening stage.
- **Autonomy ceiling:** L2 (tag/log internal). Any reply routes through 01-D's ceiling.
- **Human-in-loop:** recedes to L2 for tagging; risk-escalation always surfaces a human.
- **Substrate deps:** creds, #119, #991, #389. **subject:** both. **Maps to:** #1338 slice H.

## 01-F · Capture & normalize an inbound lead (the capture inbox)
- **Owner / Stream:** Belle / 01 (owns the capture inbox trigger). **Archetype:** B1 triage/route
  (ground → classify → resolve-owner → disposition → log) — intake only, internal-reversible writes.
- **Trigger:** a `lead_hook` arrives — web form, **Meta Lead Ad**, social DM turned
  lead-worthy, **Event Registration**, gated content, or list import.
- **Terminal outcome:** a normalized lead/contact with source + consent captured, deduped,
  ready for scoring (→ 01-G) and nurture (→ 01-H) — or, if already threshold-crossing, routed
  to Chase (→ 02).
- **Procedure Steps** (B1: ground → resolve-owner → disposition → log):
  1. `[automation]` **Ground:** ingest the `lead_hook`; capture source, UTM/campaign touch,
     consent state — **cite the source hook + as-of**; unparseable/empty → park (A5). **L0/L2.**
  2. `[automation]` **Resolve owner:** **Client Mapping / contact dedupe** (shared sub-step); if
     author = existing **customer**, do NOT treat as new lead (01-D customer rule). `tag_contact` L2.
  3. `[automation]` Stamp the attribution touch for multi-touch ROI (#1316) → 01-M.
  4. `[automation]` **Disposition + log:** enqueue for scoring (01-G). If the source already implies
     MQL-grade fit/intent, emit the threshold-crossing score → routes to Chase / Stream 02 — **the
     seam is an explicit step; Chase owns qualify, Belle owns capture (A11).**
- **Autonomy ceiling rationale:** internal create/tag/dedupe = **reversible internal → L2** (A10
  row 1); no external send.
- **Driving policy:** TBD (#1586) — consent/list-hygiene, lead-vs-customer.
- **Realization:** `icm/domains/marketing/lead-capture/` (ICM Workspace).
- **Autonomy ceiling:** L2 (internal reversible: create/tag/dedupe). No external send.
- **Human-in-loop:** low — internal records auto at L2; human spot-checks dedupe.
- **Substrate deps:** creds (Meta Lead Ads scope), #119 (LP collectors), #389. **subject:** both.

## 01-G · Score a lead & evaluate the MQL threshold (the seam emitter) ⛔
- **Owner / Stream:** Belle / 01. **Archetype:** B1 triage/route — **this is the canonical
  Belle→Chase seam emitter** (A11): Belle owns the marketing-qualification clock; Chase owns
  qualify/close. They meet at the threshold-crossing step, never co-own.
- **Trigger:** a lead is captured (01-F) OR a behavioral signal accrues OR a scheduled re-score.
- **Terminal outcome:** `lead_score` recomputed; **if it crosses the marketing-qualified
  threshold the lead becomes an MQL and routes to Chase (Stream 02)** — the crossing IS the
  seam; otherwise it stays in Belle's nurture.
- **Procedure Steps** (B1: ground → classify (score) → resolve-owner (route) → log):
  1. `[automation]` **Ground + recompute** `lead_score` from fit + engagement (rule-based v1),
     **citing the contributing signals + as-of** (A5); #389-predictive features dormant → score on
     rules only and say so (A5c). **L0/L2.**
  2. `[automation]` Persist the score (internal reversible write, L2).
  3. `[hybrid]` Evaluate vs the MQL threshold. **Crossed → routes to Chase / lead-response
     (ADR-0024) — terminal hand-off STEP into Stream 02 (the A11 seam; deterministic route, not an
     actuation).** Not crossed → 01-H.
  4. `[automation]` Emit the attribution + scoring event for analytics (→ 01-M, #1316).
- **Driving policy:** TBD (#1586) — lead-scoring/MQL-definition.
- **Realization:** `icm/domains/marketing/lead-scoring/` (ICM Workspace).
- **Autonomy ceiling:** L2 (internal score write). Routing is a deterministic event, not an actuation.
- **Human-in-loop:** low; threshold + routing rule is governed config. Human tunes the model.
- **Substrate deps:** #389 (predictive features dormant), #991. **subject:** both. **Seam:** Belle→Chase.

## 01-H · Run a nurture journey (multi-step cadence, up to MQL)
- **Owner / Stream:** Belle / 01. **Archetype:** B7 client-facing-send (every send delegates to
  01-I's send gate; internal step-records are reversible at L2).
- **Trigger:** a contact is enrolled — by segment membership, a captured lead below MQL,
  event follow-up, or manual enrollment.
- **Terminal outcome:** the contact progresses through send/wait/branch/score steps, terminating
  at **MQL (→ 01-G → Chase)**, journey exit, or unsubscribe.
- **Procedure Steps** (internal-reversible steps at L2; each send is B7 via 01-I):
  1. `[automation]` Enroll on the `workflow`/`workflow_enrollment` substrate (ADR-0073). **L0/L2.**
  2. `[automation]` Execute the next step on cadence: A/B send / wait / branch / score-bump (L2 —
     reversible internal step-records, A10 row 1).
  3. `[hybrid]` **Each send → 01-I send gate** (consent-gated; opt-out + frequency hard stops, B7).
     Large/new-audience → `always_gate` (A2 class-2).
  4. `[automation]` **Manage the audience segment (folded 01-J step):** build/refresh the
     `segment` + `segment_member` (dynamic re-eval on cadence; respect suppression/non-interest
     flags) as the enrollment source. Feed engagement back to scoring (01-G); **on MQL exit → Chase
     (the A11 seam).**
- **Driving policy:** TBD (#1586) — consent/list-hygiene, journey/cadence.
- **Realization:** `icm/domains/marketing/nurture-journey/` (ICM Workspace; runner BE #145).
- **Autonomy ceiling:** L2 internal step records; sends inherit 01-I (blast = always_gate).
- **Human-in-loop:** approve sends (v1); recedes as routine low-risk sends earn L3; blasts gated.
- **Substrate deps:** journey runner BE #145, #991, #389. **subject:** both. **Maps to:** #1420.

## 01-I · Schedule & fire a Campaign Send (consent-gated blast)
- **Owner / Stream:** Belle / 01 (owns the send trigger). **Archetype:** B7 client-facing-send
  (ground → compose → SEND GATE → send → log); blast = always_gate class-2.
- **Trigger:** a Campaign Send is scheduled — fixed time, relative to an Event start, or as a
  journey step (01-H).
- **Terminal outcome:** the email/SMS blast is **delivered** to its consented audience
  (per-recipient consent-gated at send time), metrics back-synced — or parked if large/new-audience.
- **Procedure Steps** (B7: ground → compose → SEND GATE → send → log):
  1. `[automation]` **Build + ground** the send (Builder) + resolve the audience/segment, **cited +
     as-of**; no fabricated claim/timeline/price (A5/B7). **L1/L2.**
  2. `[automation]` **Consent gate per recipient at send time** (CAN-SPAM, opt-out, frequency caps)
     — drop non-consented; a hard filter, not advisory (the B7 opt-out/frequency hard stop).
  3. `[hybrid]` **SEND GATE:** route as a ProposedAction. Routine/known-audience climbs toward L3;
     `publish_blast_new_or_large_audience` = **always_gate** (A2 class-2).
  4. `[gui-step]` Human approves the blast (always_gate case) / approves routine (v1) via the 4-part
     easy-button (A4: drafted send + grounded why + one-click Fire + audience/recipient-count preview).
  5. `[automation]` Fire via backend (ADR-0058 backend-only), **idempotency-keyed so a replay is a
     no-op, never a double-send** (A9b); **read back** delivery before close (A9c); back-sync metrics
     → 01-M + BI hub.
- **Driving policy:** TBD (#1586) — consent/CAN-SPAM/list-hygiene.
- **Realization:** `icm/domains/marketing/campaign-send/` (ICM Workspace).
- **Autonomy ceiling:** L3 (routine known-audience). `always_gate`: large/new-audience blast.
- **Substrate deps:** backend send path (ADR-0058), #119, consent data. **subject:** both. **Maps to:** ADR-0053.

## 01-K · Run an Event lifecycle (webinar / live event fill → attendance → nurture)
- **Owner / Stream:** Belle / 01. **Archetype:** B9 deadline-sentinel for the Event-start clock
  (reminders fire at lead times; never auto-actuates the send past its gate, A11) **+ B7** for the
  sends themselves (via 01-I).
- **Trigger:** an Event is created (a scheduled webinar/live event Imperion hosts).
- **Terminal outcome:** the Event is **filled** (registrations), **attendance recorded**, and
  post-event nurture enrolled.
- **Procedure Steps** (B9 watch the Event-start clock → drive fill/reminders; sends are B7 via 01-I):
  1. `[automation]` Drive fill: campaigns + Campaign Sends (→ 01-I) + organic posts (→ 01-A). **L1/L2.**
  2. `[automation]` Capture each **Event Registration** through the capture inbox (→ 01-F).
  3. `[automation]` **Watch the Event-start clock (B9):** fire reminder Campaign Sends relative to
     Event start, **cited to the event date + as-of** (A5); each send still rides 01-I's gate — the
     sentinel pre-stages the easy-button, it never auto-fires a client send (A11).
  4. `[gui-step]` After the event, record attendance (attended / no-show). `[hybrid]` if auto-pulled.
  5. `[automation]` Enroll attendees/no-shows into nurture (→ 01-H); attendance drives scoring (→ 01-G).
- **Driving policy:** TBD (#1586) — event/webinar, consent.
- **Realization:** `icm/domains/marketing/event-promotion/` (ICM Workspace).
- **Autonomy ceiling:** L2 internal; sends inherit 01-I; blast = always_gate.
- **Substrate deps:** #119, event-platform connector (may be a **Planned Connector**). **subject:** both.

## 01-L · Plan & launch a marketing campaign (the orchestrating container)
- **Owner / Stream:** Belle / 01. **Archetype:** B9 deadline-sentinel for the launch clock + an
  orchestrating container referencing 01-A/H/I/B/K as sub-procedures (never duplicating their gates).
- **Trigger:** a campaign brief / quarterly plan / product or event push.
- **Terminal outcome:** a `campaign` exists with goal, audience, channel mix, budget envelope,
  and its child sends/posts/ads/journey/event scheduled — **launched** and attributable.
- **Procedure Steps** (B9: watch launch dates → plan → route to gates; children carry their own gates):
  1. `[automation]` Belle drafts: objective, target segment, channel mix, proposed budget,
     message — **cited + as-of** (A5). **L0/L1.**
  2. `[gui-step]` Human approves the plan + budget envelope via the 4-part easy-button (A4); **the
     actual ad spend stays `always_gate`** per 01-B/01-C — approving an envelope is not approving a
     spend (A2 class-1 is not waived by the plan).
  3. `[automation]` Instantiate children: posts (01-A), sends (01-I), a journey (01-H), ads (01-B),
     an event (01-K) — each carrying the campaign attribution tag **and its own gate (A11: the
     container holds the launch clock; each child owns its act).**
  4. `[automation]` Wire campaign-level attribution + metric rollup (→ 01-M / #1316).
- **Driving policy:** TBD (#1586) — brand, ad-spend authorization.
- **Realization:** `icm/domains/marketing/campaign-plan/` (ICM Workspace) — orchestrator
  referencing 01-A/H/I/B/K as sub-procedures, never duplicating them.
- **Autonomy ceiling:** L2 (plan/draft internal). Spend within it inherits always_gate.
- **Substrate deps:** #389, #119. **subject:** both. **Maps to:** #1338, ADR-0053.

## 01-M · Surface marketing analytics & attribution (the reporting back-channel)
- **Owner / Stream:** Belle / 01. **Archetype:** B3 synthesis-brief (gather → synthesize → deliver)
  — read-model, **no actuation**; flagged under-performers auto-spawn the owning worker (01-C/01-L)
  parked-draft (launchpad, not readout).
- **Trigger:** scheduled reporting cadence, a campaign close, or an operator opening the
  analytics / BI hub marketing section.
- **Terminal outcome:** Social Metrics + send/journey/event/ad results normalized, unioned
  (organic ∪ paid), surfaced as marketing ROI (sourced/influenced pipeline vs spend, CPL, CAC,
  ROAS) — numbers match everywhere.
- **Procedure Steps** (B3: gather → synthesize → deliver):
  1. `[automation]` **Gather:** ingest/normalize Social Metrics (#135 normalization) +
     `campaign_metric`, **citing the metric source + as-of**; dormant collector → flag stale, never
     present as live (A5c). **L0.**
  2. `[automation]` **Synthesize:** union organic ∪ paid; compute multi-touch attribution over touch
     → opportunity → won (#1316). Any cross-client benchmark is anonymized/aggregated only (A7).
  3. `[gui-step]` Surface in `/social/analytics` + `/reporting#marketing` (BI hub, ADR-0062).
  4. `[hybrid]` Flag under-performing channels/campaigns → **auto-spawn parked-draft** feeds to 01-C
     (re-budget) / 01-L (re-plan) — Belle delivers the launchpad, never actuates (B3).
- **Driving policy:** TBD (#1586) — reporting/metrics-governance.
- **Realization:** `icm/domains/marketing/marketing-metrics/` (thin ICM Workspace) — mostly read-model; realized for the normalize/flag steps.
- **Autonomy ceiling:** L0/L1 (read + flag). No actuation.
- **Substrate deps:** #119 (metric collectors), #135 (resolved). **subject:** both. **Maps to:** #1338 slice D, #1316.

## 01-N · Author a content asset (long-form content / enablement / PR — publish-handoff)
- **Owner / Stream:** Belle / 01. **Archetype:** B7 client-facing-send **variant** — the terminal is
  a publish-**HANDOFF** to Loveable (a human-mediated export, epic #1696 D3), **NOT an ADR-0058
  send** (no contact touched, no consent/gauntlet send path). Content + **sales-enablement**
  (`audience=seller`) + **PR-authoring** (`type=press_release`) are one entity differing by
  type/audience (D2) — no separate procedure for enablement or PR.
- **Trigger:** a content brief, campaign milestone (→ 01-L), or operator "write this"
  (blog / case-study / whitepaper / battlecard / one-pager / press release / announcement).
- **Terminal outcome:** a `content_asset` reaches **Approved → Published** with a `publish_ref`
  (the Loveable-rendered URL) and its attribution wired to the campaign — or parked at the review-gate.
- **Procedure Steps** (ground → compose → REVIEW GATE → publish-handoff → reconcile):
  1. `[automation]` **Ground** brand voice + the `` `okf:brand_asset` `` compliance rules, the brief,
     the linked campaign, recent content performance — **cite each + as-of**; empty brand registry →
     park, never fabricate brand claims (A5). **L0.**
  2. `[sonnet]` **Compose** per `type`/`audience` (prospect/seller/press); substantiate every claim
     (`substantiation-rules`); no fabricated stat/quote/capability (A5/B7). `content.write` stages the
     draft internally — **L2** (internal-reversible).
  3. `[hybrid]` **REVIEW GATE (checkpoint):** brand-compliance check vs `` `okf:brand_asset` ``
     (read-only, D5) + substantiation; a human approves `draft → approved` and a compliance note is
     stamped on the asset. A failed brand/substantiation check **parks** (this is an INTERNAL
     approval, not a customer send).
  4. `[gui-step]` **Publish-handoff:** mark `approved → ready`; **hand to Loveable** (human-mediated
     copy/export, **NO Loveable API in v1**, D3) and store the live `publish_ref`. A HANDOFF, not a
     send — no contact, no consent gate. The whitepaper **form** stays Imperion's and feeds
     `lead-capture` (01-F → attribution); the **landing page is Loveable's**.
  5. `[automation]` **Reconcile:** wire the attribution link asset → campaign (#1316) → 01-M.
- **Autonomy ceiling rationale:** compose/stage = **L2 internal-reversible**; the review-gate is
  human-approved (v1); publish-handoff is a human export. **Not `always_gate`** (no money, no send),
  but never an autonomous customer touch either — there is no auto-publish path in v1.
- **Driving policy:** BO-01 (Marketing/Comms, #1586) — brand-voice, claims-substantiation.
- **Realization:** `icm/domains/marketing/content-studio/` (ICM Workspace).
- **Autonomy ceiling:** L2 (compose/stage internal). Review-gate + publish-handoff are human (v1).
- **Human-in-loop:** Belle drafts; a marketing operator (Mark proxy v1) approves at the review-gate and
  performs the Loveable handoff. **Substrate deps:** `content_asset` + `brand_asset` (#1697/#1699),
  #389. **subject:** both. **Maps to:** #1701, #1316.

## 01-O · Capture a customer reference (consent-gated advocacy capture)
- **Owner / Stream:** Belle / 01. **Archetype:** B1 intake/capture **variant** — **post-consent**
  capture; the client touch is **NOT here** (it is Celeste's, Stream 08). Name/logo-use = `always_gate`
  (A2 money/commitment-class, here a rights commitment), human, **marketing-owned** (not Legal in v1).
- **Trigger:** **Celeste hands over a consented advocacy candidate** (the seam, #1703/#1692); or
  Belle's 01-E listening surfaces an advocacy candidate (a *suggestion only* — it still routes through
  Celeste to solicit; Belle never solicits).
- **Terminal outcome:** a `reference` reaches **Captured / Published** (consent-clean), optionally
  spawning a `content_asset(type=case_study)` → 01-N; or **parked** if no recorded consent.
- **Procedure Steps** (intake-consent → capture → RIGHTS GATE → spawn-asset → reconcile):
  1. `[automation]` **Intake-consent:** ingest the consented candidate from the Celeste seam; verify
     the recorded `` `okf:consent_event` `` + scope of use — **no recorded consent → PARK** (the hard
     precondition, D4). **Belle NEVER contacts the client** (refusal floor, BO-04, stronger than any
     gate). **L0/L2.**
  2. `[sonnet]` **Capture:** format the `reference` (testimonial / review / reference-case),
     consent-clean (only the approved attribution + verbatim). `reference.write` — **L2** internal.
  3. `[hybrid]` **RIGHTS GATE (checkpoint):** name/logo-use = **`always_gate`**, human,
     marketing-owned — **never auto-approves** at any rung.
  4. `[automation]` **Spawn-asset (optional):** create `content_asset(type=case_study)` backed by the
     reference (`backed_by_reference_id`) → hands to 01-N (content-studio).
  5. `[automation]` **Reconcile:** link the reference to its account/opportunity for analytics.
- **Autonomy ceiling rationale:** capture/intake = **L2 internal-reversible**; the rights-gate
  (logo/name-use) is `always_gate` forever; Belle's client-contact path is a **refusal floor** (BO-04).
- **Driving policy:** BO-01 + BO-04 (Client-Success seam, #1586) — advocacy consent, name/logo-use.
- **Realization:** `icm/domains/marketing/advocacy-capture/` (ICM Workspace). **Upstream seam:** the
  solicitation is drafted by **Celeste** (Stream 08, #1703/#1692), human-gated send, consent recorded.
- **Autonomy ceiling:** L2 (capture internal). Rights-gate `always_gate`; client-contact **refused**.
- **Human-in-loop:** Belle captures post-consent; a human owns the rights-gate. **Substrate deps:**
  `reference` (#1698), consent data, #389. **subject:** both. **Maps to:** #1702, #1703.

> **Note on 01-E (listening):** reputational-risk escalation **and** advocacy-candidate surfacing
> already exist there (B3 launchpad) — 01-E routes an advocacy candidate **to Celeste to solicit**
> (the 01-O upstream seam); it does **not** duplicate capture. **Brand governance has no procedure of
> its own** (D5): it bites at 01-N's review-gate (compliance vs `brand_asset`) + Vera's
> `marketing-conformance` (platform); `brand_asset` is read-only reference, never written by any agent.

---

## Coverage note

Demand→Lead surface fully covered: content (A), paid (B/C), inbound social (D/E), lead
capture/score/nurture (F/G/H), outbound comms (I), events (K), campaign orchestration (L),
analytics/attribution (M). **The brand/content half (epic #1696):** long-form content / enablement
/ PR authoring (N, publish-handoff to Loveable) and consent-gated advocacy capture (O, post-Celeste);
brand governance rides 01-N's review-gate + Vera (no own procedure, D5). The audience-segment unit
(former 01-J) folds as a step of H/I (D3 sizing). The stream terminates at the `lead_score` MQL
crossing (01-G) → Stream 02; no
qualify/close procedure appears here (correctly — that's Chase/Stream 02). **Doctrine inheritance
(ADR-0136):** every procedure names its archetype (B1–B9) and inherits A1–A11 — money out (01-B/C)
is always_gate class-1 forever (A10 no-clean-undo); client-facing sends (01-A/D/H/I) are always_gate
class-2 with the templated-ack carve-out the only path to L3 (B7); Belle's **1:1-DM-existing-customer
refusal** stands as a floor stronger than any gate. The whole plane stays **propose-only / dormant**
on Meta/Threads/LinkedIn creds + #119/#991/#389 until its substrate hydrates (A5c).

**Count: 15 Operating Procedures** (01-A … 01-O; 01-J folded as a step per D9; 01-N/01-O are the
brand/content half added by epic #1696).
