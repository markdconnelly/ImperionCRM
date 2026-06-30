---
id: marketing-01-N-content-studio
agent: belle
domain: marketing
op: 01-N
archetype: B7 variant (publish = HANDOFF to Loveable, not a send)
trigger: a content brief, a campaign milestone (01-L), or an operator "write this"
autonomy:
  ceiling: L1
  always_gate: []
inputs:
  - the content brief (type · audience · linked campaign)
  - read-only brand_asset compliance rules (the brand registry)
  - the linked campaign objective/theme/angle
  - recent content/social performance for the audience
  - brand-voice + content-types + substantiation references
outputs:
  - a grounded brief (type × audience resolved, sources cited + as-of)
  - the drafted content_asset (substantiated, internal silver write)
  - a brand-compliance + substantiation review note stamped on the asset
  - the asset handed to Loveable with its publish_ref stored (handoff, not a send)
  - the asset→campaign attribution link fed to 01-M
seams: [Loveable, 01-F, 01-M]
steps:
  - 01-ground
  - 02-compose
  - 03-review-gate
  - 04-publish-handoff
  - 05-reconcile
---

# SOP 01-N — content-studio (Belle / the long-form authoring + publish-handoff loop)

> **Dual-audience document (ADR-0136 A8).** This is the *one* canonical document for
> procedure 01-N: a human can follow it end-to-end to author a Content Asset and hand it
> to Loveable, and the runtime executes the same steps against the machine config
> (`agent.yaml` / `room.yaml` / the stage `CONTEXT.md` I/O contracts). The prose is
> single-sourced here; the execution SoR stays the ICM Workspace config the steps bind to.
> `subject` is a parameter, not a duplicate — the loop is the same whether the asset is
> authored for a client's brand or for Imperion's own.
>
> **This SOP mirrors the social-inbox exemplar (#1759).** It inherits that document's
> shape; the control layer it cites (the §A invariants, the B7 archetype rule, the
> action-catalog kinds) is **cited, never redefined** here.

## What this procedure is

**Job.** Author **one typed `content_asset`** — content (`blog` / `case_study` /
`whitepaper`), sales-enablement (`battlecard` / `one_pager`), or PR (`press_release` /
`announcement`) — ground it in the brand rules, substantiate every claim, gate it on
brand-compliance, and **hand it to Loveable to publish**. This realizes **Stream 01-N**
(author a content asset, publish-handoff). Content + enablement + PR are **one entity
differing by `type` × `audience`** (epic #1696 D2) — there is no separate procedure for a
battlecard or a press release.

**Archetype: B7 — Client-facing-send, the publish-HANDOFF variant** (ADR-0136 §B). The
spine is the inherited B7 template — **Ground → Compose → REVIEW GATE → Send → Log** —
instantiated here as the five stages below, **with one substitution that defines the
variant: the terminal is a publish-HANDOFF to Loveable, not an ADR-0058 send.** No contact
is touched, no consent gate applies, the run never enters the Social Action gauntlet. The
B7 compose rule (no fabricated capability/timeline/price) is inherited from ADR-0136; this
SOP honors it, it does not restate it.

**NOT this procedure.** No money enters this loop — a boost or ad is procedure 01-B / 01-C
and is `always_gate` class-1 forever (ADR-0136 A2; belle.md §6). No customer send enters
it either — a send is ADR-0058, and this procedure has no send path: the publish step is a
human export to Loveable, end of story. A net-new public **post** is 01-A. Consent-gated
advocacy **capture** (the case-study's source `reference`) is 01-O, upstream of here.

## Autonomy contract

- **Ceiling L1, dialed from L0.** Per ADR-0136 A3 the procedure is built capability-complete
  to Belle's **L1** ceiling for this workflow (`agent.yaml` `autonomy_rung: L1`) but **ships
  at L0 (observe-only)**; autonomy is earned per-workflow upward, admin-only, audited,
  reversible (ADR-0109/0121). v1 runs **human-approves-all**.
- **The review-gate is a brand-compliance check, not a send ceiling.** This is an
  **internal** approval (`draft → approved`), not a customer touch, so the ceiling is set by
  the most-irreversible step — and the most-irreversible step is an **internal silver write**
  (`content.write`), which caps at **L2** internally-reversible (ADR-0136 A10 row 1). The
  workflow rung is held at **L1** because no step here is even externally reversible against a
  client: nothing this procedure does is client-visible until a **human** chooses to export to
  Loveable. There is no carve-out and nothing self-approves a published claim.
- **What `auto` would unlock (and what it never does).** When an admin flips this workflow to
  `auto`, only the **internal, reversible compose/stage** of a `content_asset` draft
  (`content.write`) may self-execute at L2 (`agent.yaml` `auto_may_self_approve`). The
  **review-gate stays human-approved in every mode** — a failed brand/substantiation check or
  an **empty brand registry parks** regardless of dial (A5). The **publish-handoff is a human
  Loveable export, never autonomous**.

## Inputs (procedure-level)

| Input | Grounded as | Why |
|---|---|---|
| The content brief | trigger payload | what we're writing, for whom (`type` × `audience`), and why |
| Brand rules | `okf:brand_asset` | read-only on-brand compliance rules to author against (D5) |
| Linked campaign | `okf:campaign` | the objective / theme / angle the asset serves |
| Recent performance | `okf:campaign_metric` / `okf:social_metric` | what content has landed for this audience lately |
| Brand voice | `domains/marketing/skills/brand-voice.md` | how every marketing word sounds |
| Content types | `./skills/content-types.md` | the type × audience matrix + shape/length norms |
| Substantiation rules | `./skills/substantiation-rules.md` | cite-or-cut for every claim |

Every `okf:` room above is in this workflow's `agent.yaml` `okf_rooms` allow-list
(`content_asset, campaign, campaign_metric, brand_asset, social_metric`; least-privilege,
ADR-0104 §5, enforced by `scripts/agent-yaml-gate.mjs`).

## Outputs (procedure-level)

A grounded brief (type × audience resolved, brand rules to honor, cited sources + as-of), a
substantiated `content_asset` draft (internal silver write), a stamped brand-compliance +
substantiation review note, the asset handed to Loveable with its `publish_ref` stored
(handoff, not a send), and the asset → campaign attribution link fed to 01-M.

## Seams (A11 — obligation/action separation)

This workflow owns the **authoring + brand-compliance clock**; the act on the other side of
each seam is owned elsewhere. The seam is an explicit Procedure Step, never co-ownership
(ADR-0136 A11):

- **Loveable** — the **landing page is Loveable's**, not this workflow's. The publish is a
  human-mediated copy/export to Loveable (D3); we own the asset and its attribution, Loveable
  hosts the page. There is **no Loveable API in v1**.
- **01-F (lead-capture)** — the **whitepaper form stays Imperion's**: a gated whitepaper feeds
  `lead-capture` (01-F → attribution), which owns the contact touch. This procedure never
  captures a lead.
- **01-M (analytics / attribution)** — the asset → campaign attribution link (#1316) is fed to
  01-M; the metric rollup hydrates there async. This procedure records the link, never the
  rollup.

## The steps

Operate one stage at a time, in numbered order. Load only what each stage's Inputs table
lists; produce exactly its named Outputs; run its Audit — a red audit **parks** the run,
never best-effort past it. Each step below is documented to the human+machine standard
(`goal · grounding sources · instructions · gate/invariant inherited · inputs · outputs ·
autonomy & tracer`); the per-stage machine contract is the stage `CONTEXT.md`.

### Step 01 — ground (B7: Ground)

- **Goal.** Assemble the grounded brief for one Content Asset — the brand rules, the brief,
  the linked campaign, and recent performance — each cited with its as-of.
- **Grounding sources.** the trigger brief; `okf:brand_asset` (read-only rules);
  `okf:campaign` (the linked campaign); `okf:campaign_metric` / `okf:social_metric` (recent
  performance); `brand-voice.md` + `content-types.md` (the type/audience lens).
- **Instructions.** Resolve the brief — the `type`
  (blog/case_study/whitepaper/battlecard/one_pager/press_release/announcement), the `audience`
  (prospect/seller/press, per `content-types.md`), and the linked `campaign` id (if any). Load
  the read-only `brand_asset` rules to author against. Read recent `campaign_metric` /
  `social_metric` for the audience and note what to lean into. Write the brief — objective,
  angle, audience, key message, shape/length norm — **citing each source + as-of**.
- **Gate / invariant inherited.** **A5 evidence floor** — every grounded fact cites a source
  + as-of; nothing fabricated; an **empty/missing brand registry parks** (A5, never invent a
  voice or a brand claim). **A5c staleness honesty** — a dormant collector is flagged stale,
  never presented as live.
- **Inputs / outputs.** In: the brief + the brand/campaign/performance rooms + the two type
  skills. Out: `brief.md` (resolved type × audience, linked campaign id, the brand rules to
  honor, objective + angle + key message + shape norm, cited sources each with as-of).
- **Autonomy & tracer.** Grounding is read-only → internal (A10). The run writes `agent_run`
  / `agent_message` with per-source attribution.

### Step 02 — compose (B7: Compose)

- **Goal.** Author the `content_asset` for its type and audience, every claim substantiated.
- **Grounding sources.** Stage-01 `brief.md`; `content-types.md` (the shape/length norm);
  `substantiation-rules.md` (cite-or-cut).
- **Instructions.** Compose the single `content_asset` per its `type` × `audience` — on-brand,
  in voice, to the shape/length norm. Substantiate per `substantiation-rules.md`: for each
  claim name its source (id/location) + as-of; **no source → cut the claim or soften to honest
  language.** No fabricated stat, testimonial, quote, capability, or result; a case-study claim
  must trace to a consented `reference` (01-O). Stage the draft via `content.write` — the
  **INTERNAL** silver write (no publish, no send here).
- **Gate / invariant inherited.** **A5 evidence floor** + **substantiation-rules.md** — an
  unsourced stat/testimonial/quote/capability/result is cut, not invented (refusal-class).
  **B7 compose rule** — no fabricated capability/timeline/price.
- **Inputs / outputs.** In: the brief + the two type skills. Out: `draft.md` (the drafted
  `content_asset` — type, audience, body to the shape norm — plus the substantiation refs, each
  claim → its source id/location + as-of).
- **Autonomy & tracer.** The draft is an **internal silver write** (`content.write`),
  reversible → auto at **L2** once an admin flips this workflow to `auto` (A10 row 1). The
  substantiation refs per claim ride the tracer (A5 grounded-why feeds the easy-button).

### Step 03 — review-gate (B7: REVIEW GATE) — the brand-compliance checkpoint

The first-class gate of this procedure: **brand governance has no procedure of its own (D5) —
it bites HERE.** The draft is checked against the read-only `brand_asset` registry and every
claim's substantiation before a human approves `draft → approved` and a compliance note is
stamped on the asset. This is an **INTERNAL approval, not an ADR-0058 send** — the human's
decision is a brand sign-off, not a dispatch.

- **Goal.** Gate the draft on brand-compliance against the read-only brand registry and on
  every claim being substantiated, then stamp the compliance note on the asset.
- **Grounding sources.** Stage-02 `draft.md`; `okf:content_asset` (the asset to gate and
  stamp); `okf:brand_asset` (read-only on-brand compliance rules).
- **Instructions.** Check the draft against the read-only `brand_asset` registry for on-brand
  compliance (voice, naming, claims policy, prohibited language). Verify **every** claim is
  substantiated (the stage-02 refs trace to a real source + as-of); any unsourced claim fails
  the gate. Stamp the **brand-compliance note** on the `content_asset` via `content.write`
  (the checks run, the approver, the as-of) — internal, reversible.
- **Gate / invariant inherited.** **A5 evidence floor** — an **empty brand registry parks** (an
  unverifiable draft does not proceed); an unsubstantiated claim is the audit failure the gate
  refuses (slop / an unsubstantiated published claim). **A10 row 1** — the stamp is an internal
  reversible write (L2-capped); the human approval is the checkpoint regardless of dial.
- **Inputs / outputs.** In: the draft + the asset record + the brand rules. Out: `review.md`
  (the brand-compliance result pass/fail per check, the per-claim substantiation summary, the
  stamped compliance note; on a fail it names exactly what parks the run).
- **Autonomy & tracer.** **A human approves `draft → approved` in the cockpit.** A failed brand
  or substantiation check — or an empty brand registry — **parks in every mode** (A5). v1
  **never self-approves a published claim**: this is an internal approval, so even at `auto`
  the gate stays human-approved. Every decision writes the approval to the tracer.

### Step 04 — publish-handoff (B7-variant: HANDOFF, not Send)

The variant's defining step. The approved asset is **handed to Loveable by a human** — there is
**no Loveable API in v1** and **no ADR-0058 send path**. No contact is touched, no consent gate
applies. We own the asset and its attribution; Loveable hosts the landing page.

- **Goal.** Hand the approved asset to Loveable and record where it landed.
- **Grounding sources.** Stage-03 `review.md` (the approved, brand-compliant asset);
  `okf:content_asset` (the asset to mark ready and stamp `publish_ref`).
- **Instructions.** Mark the asset `approved → ready` via `content.write` (internal,
  reversible). **Hand to Loveable** — a **human-mediated copy/export** of the approved asset;
  the human publishes the landing page on Loveable and returns the live URL. Store the returned
  `publish_ref` URL on the `content_asset` via `content.write`. The whitepaper **form** stays
  Imperion's (it feeds lead-capture / 01-F); the landing **page** is Loveable's.
- **Gate / invariant inherited.** **Not B7's SEND GATE — there is no send.** This is a
  **handoff** (epic #1696 D3): no contact, no consent gate, **not ADR-0058**. The only writes
  are internal `content.write` (mark ready, store `publish_ref`) → L2-capped (A10 row 1); the
  external publish is performed by the human, not the agent.
- **Inputs / outputs.** In: the approved asset + the asset record. Out: `handoff.md` (the
  asset's `ready` state, the stored `publish_ref` URL, and a note that the publish was a human
  Loveable export — no API, no send).
- **Autonomy & tracer.** v1 = the publish is a **human export**, always (never autonomous, at
  any rung). The internal `ready` / `publish_ref` writes are L2-class behind the run; the human
  publisher + as-of are stamped.

### Step 05 — reconcile (B7: Log; the attribution close)

- **Goal.** Wire the published asset's attribution to its campaign and close the run.
- **Grounding sources.** Stage-04 `handoff.md` (the published asset + its `publish_ref`);
  `okf:content_asset` (the run to attribute and close); `okf:campaign` (the attribution target).
- **Instructions.** Link the `content_asset` → its `campaign` via `content.write` so the
  **asset → campaign → lead → won** loop holds (#1316) and the asset's contribution is
  attributable. Feed the attribution link to **01-M** (marketing analytics / attribution); the
  metric rollup hydrates async — this stage only records the link. Close the run.
- **Gate / invariant inherited.** **A11** — the rollup is 01-M's act; this stage records the
  link and meets 01-M at the seam, never co-owns the metric. **A7 pool-never-bleed** — only
  internal/aggregated attribution data in the record, no cross-client/audience bleed.
- **Inputs / outputs.** In: the published asset + the asset record + the linked campaign. Out:
  `reconcile.md` (the recorded asset → campaign attribution link and the run close state).
- **Autonomy & tracer.** Mechanical link + close (L2-class internal writes behind the run). The
  close is logged with the as-of.

## Learning on-ramp (how this earns more autonomy)

The review-gate approval is the procedure's learning signal. Every brand sign-off /
substantiation pass / park writes to the run trace; these feed the **eval-harvest** (#1037) → an
agent that demonstrates earned reliability on the **internal compose/stage** lets an admin **raise
the dial** so `content.write` self-executes at L2 per-workflow (ADR-0109/0121), within the L1
workflow ceiling and never through the review-gate or the publish-handoff (both stay human in
every mode). **v1 = human-approves-all;** the path to more automation runs through this feedback
loop, not around it — and it never reaches publish.

## Dependencies & dormancy (honest posture — this documents the target, names the gates)

This SOP describes the **target** loop. In v1 several legs are runtime-gated and the runtime
**fails closed** — the procedure is real and dry-runnable, but it does not silently pretend to
publish:

- **ICM executor integration is runtime-gated** — the self-hosted Managed Agents executor +
  delegate/handoff bus is not yet live (#489 / epic #695 / #341). Until then the workflow
  dry-runs stage-by-stage and stops at the review-gate (icm/CLAUDE.md: no Claude-Code send/publish
  path).
- **The publish-handoff has no API** — there is **no Loveable API in v1** (epic #1696 D3); stage
  04 is a **human copy/export**, and the `publish_ref` is whatever the human returns. This is a
  documented handoff, not a missing integration.
- **`content_asset` + `brand_asset` substrate** — the asset write (`content.write` → #1697/#1701)
  and the read-only brand registry (#1699) are the substrate; an **empty `brand_asset` registry is
  a hard park** (A5), not a license to invent a voice or a claim.
- **LP ingest is collector-gated** — `campaign_metric` / `social_metric` grounding (stage 01) and
  the gold/recall path (#389) hydrate only once the on-prem collectors + credentials land; until
  then those sources are dormant and stage 01 flags them stale (A5c), never live.

## Security & grounding

No secrets, no client PII, no client identifiers in this document (ADR-0060 / ADR-0086; this file
replicates to every agent machine). Data is referenced by room/id, never by value. Every public
claim the asset makes is grounded and cited or it is cut (A5; brand-voice.md; substantiation-
rules.md). The fail-closed posture above is deliberate: dormant ≠ done, and a dormant leg is
documented as dormant.
