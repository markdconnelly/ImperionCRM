---
id: marketing-01-F-lead-capture
agent: belle
domain: marketing
op: 01-F
archetype: B1
trigger: an inbound lead arrives (a lead_hook from DM/form/ad-lead/event)
autonomy:
  ceiling: L1
  always_gate: []
inputs:
  - one inbound lead_hook (the trigger payload)
  - the raw capture (source · UTM/campaign touch · consent shape)
  - the linked campaign for the touch, if any
  - the consent_event basis the hook carries
  - the contact kernel + account kernel (dedupe + existing-customer check)
  - contact_social_identity author→contact match (DM-sourced hooks)
  - the lead_score fact for the contact (the MQL threshold)
outputs:
  - the normalized hook (source · UTM/campaign · consent · as-of)
  - the resolved owner (existing contact id or "new contact") + the dedupe decision
  - the stamped multi-touch attribution touch (→ 01-M)
  - the disposition (enqueued-for-scoring 01-G | MQL-grade → Chase / Stream 02)
seams: [Chase, Celeste, Felix]
steps:
  - 01-ingest
  - 02-resolve-owner
  - 03-attribute
  - 04-disposition
---

# SOP 01-F — lead-capture (Belle / the inbound-lead capture inbox)

> **Dual-audience document (ADR-0136 A8).** This is the *one* canonical document for
> procedure 01-F: a human can follow it end-to-end to capture and disposition an inbound
> lead, and the runtime executes the same steps against the machine config (`agent.yaml` /
> `room.yaml` / the stage `CONTEXT.md` I/O contracts). The prose is single-sourced here;
> the execution SoR stays the ICM Workspace config the steps bind to. `subject` is a
> parameter, not a duplicate — the capture loop is the same whether the inbound is for a
> client engagement or for Imperion itself.
>
> **Shape mirrors the social-inbox exemplar (#1759).** It follows the template that SOP set
> for Belle's Stream-01 procedures; the control layer it cites (the §A invariants, the B1
> archetype rule, the action-catalog kinds) is **cited, never redefined** here.

## What this procedure is

**Job.** Take one inbound `lead_hook`, normalize its source / UTM / consent, resolve its
owner against the contact kernel, stamp the multi-touch attribution touch, and disposition
it — enqueue it for scoring (01-G) or, if the source already implies MQL-grade fit, emit the
threshold-crossing score that routes it to Chase. This realizes **Stream 01-F** (capture &
normalize an inbound lead): the front door of the demand engine, the intake inbox.

**Archetype: B1 — Triage / Route** (ADR-0136 §B). The spine is the inherited B1 template —
**Ground → Classify → Resolve-owner → Disposition → Log** — instantiated here as the four
stages below (Ground+Classify fold into ingest; Log rides each stage's internal write). The
archetype rule is inherited from ADR-0136; this SOP honors it, it does not restate it.

**NOT this procedure.** No external send ever enters this loop — there is no reply, no
nurture send, no qualify/close here. Every write is an internal, reversible record; the
client-facing acts downstream (a reply is 01-D, a nurture send is 01-H/01-I, qualify/close is
Chase's Stream 02) live in their own procedures. Money never enters this loop. An author who
is an **existing customer** is **not a new lead** — that is the 01-D customer rule and it is a
hard stop, not a disposition.

## Autonomy contract

- **Ceiling L1, dialed from L0.** Per ADR-0136 A3 the procedure is built capability-complete
  to its **L1** ceiling but **ships at L0 (observe-only)**; autonomy is earned per-workflow
  upward, admin-only, audited, reversible (ADR-0109/0121). v1 runs **human-spot-checks**.
- **Why L1, not higher.** Every act in this loop — capture, dedupe, attribution, disposition
  — is a **reversible internal write (L2-class, A10 row 1)** with a clean inverse and no
  external party. The *procedure* ceiling is **L1**: there is no send gate to climb to L3, so
  the dial tops out conservatively at the intake rung (belle.md §1 — every internal act sits
  at L2, the dial starts at L1 and climbs only on earned autonomy).
- **No `always_gate` step** (`always_gate: []`). There is no money act and no client-facing
  send in this workflow, so no step is `always_gate`-class. The refusal and the parks below
  are dial-proof floors, not gates.
- **Refusal / park floors, below every dial.** Three things **park** in every mode and no dial
  level lifts them (belle.md §6; CONTEXT.md): an **unparseable / empty `lead_hook`** (A5 —
  never fabricate a source or a consent basis), an **unresolved owner**, and an
  **existing-customer match** — an existing customer is **routed out, never dispositioned as a
  fresh lead** (the 01-D customer rule).

## Inputs (procedure-level)

| Input | Grounded as | Why |
|---|---|---|
| The inbound hook | trigger payload | the one `lead_hook` this run normalizes |
| Raw capture | `okf:lead_hook` | source · UTM · campaign touch · consent shape (meaning / authority) |
| Linked campaign | `okf:campaign` | resolve the UTM/campaign touch to a real campaign |
| Consent basis | `okf:consent_event` | the consent basis the hook carries (no fabrication) |
| Contact kernel | `okf:contact` | dedupe the hook to an existing or new contact |
| Account kernel | `okf:account` | is this party an existing customer? (the refusal floor) |
| Author identity | `okf:contact_social_identity` | resolve a DM/social handle → contact |
| Score fact | `okf:lead_score` | where the disposition reads/writes the MQL threshold |

Every `okf:` room above is in this workflow's `agent.yaml` `okf_rooms` allow-list
(least-privilege; ADR-0104 §5, enforced by `scripts/agent-yaml-gate.mjs`).

## Outputs (procedure-level)

The normalized hook (source · UTM/campaign · consent · cited as-of), the resolved owner
(existing `contact` id or a clean "new contact" + the fields to create) with its dedupe and
existing-customer determination, the stamped multi-touch attribution touch (→ 01-M), and the
disposition decision — **enqueued-for-scoring (01-G)** or **MQL-grade → Chase (Stream 02)** —
with its score reference and cited basis. Every output is an internal, reversible record; no
tracer carries an external send because there is none.

## Seams (A11 — obligation/action separation)

This workflow owns only the **capture-and-disposition clock**; the receiving agent owns its
act. Each seam is an explicit Procedure Step, never co-ownership (ADR-0136 A11):

- **Chase** — when the source already implies MQL-grade fit, stage 04 emits the
  threshold-crossing `lead_score` into Stream 02 (lead-response). Belle owns *capture*; Chase
  owns *qualify/close*. They meet at the score crossing the MQL threshold — a deterministic
  route, not a co-owned hand-off.
- **Celeste** — a hook whose owner resolves to an **existing customer** is **routed out** at
  stage 02 (the relationship is hers, BO-04), never dispositioned as a new lead.
- **Felix** — a service-intent existing-customer signal routes to service (Stream 04), not
  treated as fresh demand.

## The steps

Operate one stage at a time, in numbered order. Load only what each stage's Inputs table
lists; produce exactly its named Outputs; run its Audit — a red audit **parks** the run, never
best-effort past it. Each step below is documented to the human+machine standard (`goal ·
grounding sources · instructions · gate/invariant inherited · inputs · outputs · autonomy &
tracer`); the per-stage machine contract is the stage `CONTEXT.md`.

### Step 01 — ingest (B1: Ground → Classify)

- **Goal.** Normalize one inbound `lead_hook` — its source, UTM/campaign touch, and consent
  state — each cited with its as-of.
- **Grounding sources.** `okf:lead_hook` (the raw inbound), `okf:campaign` (resolve the touch
  to a real campaign), `okf:consent_event` (the consent basis the hook carries).
- **Instructions.** Parse the hook — source type (Meta Lead Ad | website form |
  DM-classified-lead | Apollo entry | Event Registration | gated content | list import),
  payload fields, the inbound timestamp. Extract the UTM/campaign touch and resolve it to a
  `campaign` id where present (else "none"). Capture the consent state the hook carries. An
  **unparseable or empty** hook → **park** (never invent a source, a campaign, or a consent
  basis).
- **Gate / invariant inherited.** **A5 evidence floor** — source, UTM/campaign touch, and
  consent each cite their source hook + as-of; nothing fabricated. **A5c staleness honesty** —
  a dormant source (LP collector down / recall down) is flagged stale, never presented as live.
- **Inputs / outputs.** In: the trigger hook + the three grounding rooms. Out: `capture.md`
  (source type, the resolved `campaign` id or "none", the consent state, the inbound timestamp,
  the cited source + as-of).
- **Autonomy & tracer.** Capture is an internal, reversible write → auto at **L2** (A10 row 1).
  The run writes `agent_run` / `agent_message` with thought attribution (A8/P2).

### Step 02 — resolve-owner (B1: Resolve-owner)

- **Goal.** Resolve the captured hook to its owner via Client Mapping / contact dedupe — and
  stop if the owner is an existing customer.
- **Grounding sources.** Stage-01 `capture.md`; `okf:contact` (candidate matches);
  `okf:account` (existing-customer check); `okf:contact_social_identity` (DM/social handle →
  contact).
- **Instructions.** For a social/DM-sourced hook, resolve the handle → contact via
  `contact_social_identity`; otherwise key on the hook's email/identifier. Run **Client Mapping
  / contact dedupe** against existing `contact` records; pick the existing contact or mark "new
  contact". Check the matched contact's `account`: if the party is an **existing customer**,
  this is **not a new lead** — **park and route out** (the 01-D customer rule; Celeste owns the
  relationship, Felix owns service). An **unresolved owner** → park.
- **Gate / invariant inherited.** **B1 rule** — mechanical dedupe/assignment auto-executes at
  L2 (internally reversible); the existing-customer routing-out and cross-client correlation
  carve-outs gate regardless of dial. **A7 pool-never-bleed** — cross-client signal stays
  internal-only, never in the owner record. **A5** — the match basis is cited + as-of.
- **Inputs / outputs.** In: `capture.md` + the contact/account/social-identity rooms. Out:
  `owner.md` (the resolved owner, the dedupe decision, the existing-customer determination, the
  cited match basis + as-of).
- **Autonomy & tracer.** Dedupe + tag at **L2** (`tag_contact`); the existing-customer
  route-out is a dial-proof floor. The decision is stamped for the tracer.

### Step 03 — attribute (B1: between Resolve-owner and Disposition)

- **Goal.** Stamp the multi-touch attribution touch for this lead — the first link in touch →
  opportunity → won.
- **Grounding sources.** Stage-01 `capture.md` (source · UTM · campaign touch); stage-02
  `owner.md` (the resolved contact the touch attaches to); `okf:campaign` (attribute the touch
  to the right campaign).
- **Instructions.** Assemble the attribution touch — the resolved `contact`, the `campaign` id
  (or "none — standalone"), the source, and the UTM — keyed to the inbound timestamp. Stamp the
  touch for multi-touch ROI (#1316 → 01-M).
- **Gate / invariant inherited.** **A9b idempotent actuation** — the stamp is idempotent on the
  hook id, so a replay is a no-op. **A5** — the touch is cited to the source hook + as-of.
- **Inputs / outputs.** In: `capture.md` + `owner.md` + the campaign room. Out: `attribution.md`
  (the stamped touch — contact · campaign · source · UTM · as-of — and its attribution
  reference for the 01-M rollup).
- **Autonomy & tracer.** An internal, reversible write → auto at **L2**. The attribution
  reference rides the tracer for the ROI rollup (#1316).

### Step 04 — disposition (B1: Disposition → Log)

- **Goal.** Disposition the captured, attributed lead — enqueue it for scoring, or, if the
  source already implies MQL-grade fit, emit the threshold-crossing score that routes to Chase
  (the A11 seam).
- **Grounding sources.** Stage-01 `capture.md` (source/intent that may already imply MQL-grade
  fit); stage-02 `owner.md` (the resolved contact to disposition); stage-03 `attribution.md`
  (the stamped touch the disposition carries); `okf:lead_score` (where the score is
  read/written; the MQL threshold).
- **Instructions.** Read the source/intent: does the hook (e.g. a high-intent Meta Lead Ad, a
  qualified Apollo entry) already imply **MQL-grade** fit, or does it need scoring first?
  **Default path** — enqueue the lead for scoring (→ lead-scoring / 01-G); scoring owns the
  threshold evaluation. **Seam path** — if the source already implies MQL-grade fit, **emit the
  threshold-crossing `lead_score`** that routes the lead to Chase (→ lead-response / Stream 02).
- **Gate / invariant inherited.** **A11** — the crossing is the explicit seam: Chase owns
  qualify, Belle owns capture; it is a deterministic route, not a co-owned hand-off and not an
  external actuation. **A9b** — idempotent on the hook/contact so a replay does not
  double-route. **A5** — MQL-grade routing is taken only when the source/intent justifies it,
  cited + as-of.
- **Inputs / outputs.** In: `capture.md` + `owner.md` + `attribution.md` + the `lead_score`
  room. Out: `disposition.md` (the disposition decision — enqueued-for-scoring | MQL-grade →
  Chase — the score reference, and the cited basis + as-of).
- **Autonomy & tracer.** All writes internal + reversible (**L2**); no external send occurs.
  The disposition + the route are stamped for the tracer; the emitted crossing is the
  deterministic Stream-02 hand-off, logged with its basis + as-of.

## Learning on-ramp (how this earns more autonomy)

This procedure's learning signal is the **dedupe / disposition decision trace**, not an
approve/feedback gate (there is no send). Every capture, owner resolution, and disposition
writes `agent_run` / `agent_message` with thought attribution; a human's dedupe spot-check or
disposition correction is the signal. A run that demonstrates earned reliability lets an admin
**raise the dial** per-workflow (ADR-0109/0121), within the L1 ceiling and never past a park
floor (ADR-0136 A3). **v1 = human-spot-checks;** the path to more automation runs through this
trace, not around it.

## Dependencies & dormancy (honest posture — this documents the target, names the gates)

This SOP describes the **target** loop. In v1 several legs are runtime-gated and the runtime
**fails closed** — the procedure is real and dry-runnable, but it does not silently pretend a
source is live:

- **The ICM executor is runtime-gated** — the self-hosted Managed Agents executor +
  delegate/handoff bus is not yet live (#489 / epic #695 / #341). Until then the workflow
  dry-runs stage-by-stage and stops (icm/CLAUDE.md: no Claude-Code send path — and there is no
  send here regardless).
- **`lead_hook` ingest is credential / home-server gated** — the source rooms hydrate only once
  the on-prem LP collectors land (the Meta Lead Ads scope for ad-lead hooks, the website-form /
  Event Registration / list-import feeds; #119). Until then stage 01 flags the source stale
  (A5c), never live.
- **#389 Voyage embeddings (worker recall) — TABLED.** Where dedupe or disposition would lean
  on semantic recall, v1 runs on rules only and says so (A5c); it does not present a dormant
  recall as a live signal.

## Security & grounding

No secrets, no client PII, no client identifiers in this document (ADR-0060 / ADR-0086; this
file replicates to every agent machine). Data is referenced by room/id, never by value. Every
captured field — source, consent basis, attribution touch — is cited to its source hook + as-of
or it parks (A5); a consent basis is never fabricated. The fail-closed posture above is
deliberate: dormant ≠ done, and a dormant leg is documented as dormant.
