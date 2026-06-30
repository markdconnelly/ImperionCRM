---
id: marketing-01-O-advocacy-capture
agent: belle
domain: marketing
op: 01-O
archetype: B1
trigger: an advocacy candidate is surfaced (01-E listening routes it via Celeste) or an operator initiates
autonomy:
  ceiling: L1
  always_gate: [name/logo-use]
inputs:
  - a consented advocacy candidate handed over from Celeste (account id, contact id, the referenced material)
  - the recorded consent_event + its scope of use (the hard precondition, D4)
  - account / contact the reference attributes to
  - the typed reference record to format and stage
  - brand-voice + the consent-and-rights rules
outputs:
  - the precondition result (consent present / parked)
  - a consent-clean captured reference (status captured only with consent on file)
  - the name/logo-use rights decision (always_gate, human, marketing-owned)
  - an OPTIONAL content_asset(type=case_study) spawned → handed to content-studio (01-N)
  - the reference→account/opportunity links + provenance (the tracer)
seams: [Celeste, content-studio]
steps:
  - 01-intake-consent
  - 02-capture
  - 03-rights-gate
  - 04-spawn-asset
  - 05-reconcile
---

# SOP 01-O — advocacy-capture (Belle / the consent-gated customer-reference loop)

> **Dual-audience document (ADR-0136 A8).** This is the *one* canonical document for
> procedure 01-O: a human can follow it end-to-end to capture a consented customer
> reference, and the runtime executes the same steps against the machine config
> (`agent.yaml` / `room.yaml` / the stage `CONTEXT.md` I/O contracts). The prose is
> single-sourced here; the execution SoR stays the ICM Workspace config the steps bind to.
> `subject` is a parameter, not a duplicate — the loop is the same whether the reference
> attributes to a client or to Imperion.
>
> **Shape borrowed from the 01-D exemplar (#1759).** This SOP mirrors the social-inbox
> template; the control layer it cites (the §A invariants, the B1 archetype rule, the
> action-catalog kinds) is **cited, never redefined** here.

## What this procedure is

**Job.** Capture a **consented** customer **reference** (testimonial / review /
reference-case) as internal proof, gate any use of the customer's name or logo as a
rights commitment, optionally spawn a case-study `content_asset` backed by it, and
reconcile it to its account so advocacy is attributable. This realizes **Stream 01-O**
(capture a customer reference) as a **post-consent** capture flow. **Belle records
advocacy; she never solicits it.**

**Archetype: B1 — Triage / Route, intake/capture variant** (ADR-0136 §B). The spine is
the inherited B1 template — **Ground → Classify → Resolve-owner → Disposition → Log** —
instantiated here as an intake/capture: Ground (intake the consented candidate) →
Classify (the requested name/logo/quote use) → Resolve-owner (the marketing-owned rights
gate) → Disposition (capture + optional case-study spawn) → Log (reconcile + provenance).
The B1 rule is inherited from ADR-0136; this SOP honors it, it does not restate it.

**NOT this procedure.** The **solicitation is not here** — Belle **never contacts the
client**. The consented ask is **Celeste's** (Stream 08, BO-04 refusal floor, stronger
than any gate); this workspace begins ONLY after Celeste hands over a consented
candidate, and it has **no client-contact / send tool** by design. There is no send path:
nothing in this workspace talks to an external party. Authoring the spawned case-study is
**01-N** (content-studio), not here — stage 04 only spawns and hands off.

## Autonomy contract

- **Ceiling L1, dialed from L0.** Per ADR-0136 A3 the procedure is built capability-
  complete but **ships at L0 (observe-only)**; autonomy is earned per-workflow upward,
  admin-only, audited, reversible (ADR-0109/0121). The dial starts at **L1** (`agent.yaml`
  `autonomy_rung: L1`). v1 runs **human-approves-all**.
- **The L2 carve-out is narrow and internal.** When an operator flips this workflow to
  `auto`, **only** the INTERNAL, reversible capture/format of an already-consented
  reference (`reference_write`, stage 02) may self-execute at **L2** (ADR-0128 A10 row 1)
  — and **only** after stage 01 has verified a recorded `consent_event` with a scope of
  use. Nothing else here self-executes.
- **The rights-gate is `always_gate`, below every dial.** Any use of the customer's name
  or logo (stage 03) is a **rights commitment** — `always_gate`, human, **marketing-owned**
  (not Legal in v1). It **never** self-approves at any rung, in any mode
  (`always_gate: [name/logo-use]`; consent-and-rights.md; belle.md §6).
- **Refusal floor, below the rights-gate.** Belle **never** 1:1-contacts an existing
  customer; the consented solicitation is Celeste's (BO-04). No recorded consent → **park**;
  a use beyond the consented scope → **park**. These are floors, not gates — never best-
  efforted forward.

## Inputs (procedure-level)

| Input | Grounded as | Why |
|---|---|---|
| Consented candidate | Celeste hand-over | the existing customer who already agreed to be referenced (account id, contact id, material) |
| Recorded consent | `okf:consent_event` | the recorded consent + its scope of use (the hard precondition, D4) |
| Account | `okf:account` | the customer the reference attributes to |
| Contact | `okf:contact` | the consenting person of record |
| Reference record | `okf:reference` | the typed proof record to format and stage |
| Spawned asset | `okf:content_asset` | the OPTIONAL case-study record to create + back-link |
| Rights + voice rules | `./skills/consent-and-rights.md` · `domains/marketing/skills/brand-voice.md` | the consent/rights policy + how marketing copy reads |

Every `okf:` room above is in this workflow's `agent.yaml` `okf_rooms` allow-list
(least-privilege; ADR-0104 §5, enforced by `scripts/agent-yaml-gate.mjs`). This workspace
holds **no client-contact / send tool** — only `pg.read`, `reference.write`,
`knowledge.search`, `memory.recall`.

## Outputs (procedure-level)

The precondition result (consent present / parked), a consent-clean captured reference
(`status = captured` only with consent on file), the name/logo-use rights decision
(`always_gate`, marketing-owned), an OPTIONAL `content_asset(type=case_study)` handed to
content-studio (01-N), and the reference→account/opportunity links + provenance (the
tracer: who captured, the backing `consent_event`, the spawned asset if any). All data is
referenced by id, never by value — no client PII in any artifact.

## Seams (A11 — obligation/action separation)

This workflow owns only the **capture clock**; the act on either side belongs to another
owner. The seam is an explicit Procedure Step, never co-ownership (ADR-0136 A11):

- **Celeste** — the **solicitation** is hers (Stream 08). **01-E listening surfaces an
  advocacy candidate as a *suggestion only* → it routes through Celeste to SOLICIT**;
  advocacy-capture begins only *after* she hands over a consented candidate. Belle never
  reaches out (BO-04 refusal floor).
- **content-studio (01-N)** — an *elected* case-study `content_asset(type=case_study)` is
  spawned and **handed to 01-N** for authoring; this workflow spawns and back-links, it
  does not author the asset.

## The steps

Operate one stage at a time, in numbered order. Load only what each stage's Inputs table
lists; produce exactly its named Outputs; run its Audit — a red audit **parks** the run,
never best-effort past it. Each step below is documented to the human+machine standard
(`goal · grounding sources · instructions · gate/invariant inherited · inputs · outputs ·
autonomy & tracer`); the per-stage machine contract is the stage `CONTEXT.md`.

### Step 01 — intake-consent (B1: Ground — the hard precondition)

- **Goal.** Ingest the consented candidate Celeste handed over and verify a recorded
  `consent_event` with a scope of use exists — the hard precondition for advocacy.
- **Grounding sources.** The Celeste hand-over (account id, contact id, material);
  `okf:consent_event` (the recorded consent + scope); `okf:account`; `okf:contact`.
- **Instructions.** Ingest the candidate from the Celeste hand-over. **Belle does NOT
  contact the client** — this stage only reads an already-consented hand-over (BO-04). Verify
  a **recorded `consent_event`** exists and read its **scope of use** (what may be attributed
  / quoted / shown). **No recorded `consent_event` → PARK** (D4): do not infer, assume, or
  manufacture consent; do not reach out to obtain it.
- **Gate / invariant inherited.** **A5 evidence floor** — the consent is cited by reference
  + as-of; nothing inferred. The **D4 hard precondition** (consent-and-rights.md) and the
  **BO-04 refusal floor** (belle.md §6) gate regardless of dial — no consent → park, no
  client contact ever.
- **Inputs / outputs.** In: the Celeste hand-over + the three grounding rooms. Out:
  `intake-consent.md` (candidate by id + the consent_event reference and its scope; the
  precondition result: present / parked).
- **Autonomy & tracer.** Read + verify is internal (L1/L2-class). The run writes
  `agent_run` / `agent_message`; the consent reference + scope ride the tracer.

### Step 02 — capture (B1: Disposition — the internal write)

- **Goal.** Format the `reference`, consent-clean — using only the approved attribution and
  in-scope verbatim.
- **Grounding sources.** Stage-01 verified consent; `okf:reference` (the typed proof record);
  `consent-and-rights.md` + `brand-voice.md` (the rights rules + how copy reads).
- **Instructions.** Format the `reference` (kind: `testimonial` | `review` |
  `reference_case`) using **only the approved attribution** and **verbatim within the consent
  scope** — no paraphrase beyond scope, no fabricated quote, no attribution the consent does
  not cover. Stage the record **internally** via `reference_write`; set `status → captured`
  **only with consent on file** (stage 01 verified it).
- **Gate / invariant inherited.** **A5 evidence floor + brand-voice.md** — an out-of-scope or
  fabricated quote/attribution is cut, not invented (refusal-class). **The `reference_write`
  action-catalog kind** (FE `src/lib/agent/action-catalog.ts`) is the INTERNAL silver write —
  `dataClass: client_pii`, `autoAtLevel: 2`, `alwaysGate: false`; the ADR-0118 data-class
  ceiling parks it in v1. The DB CHECK enforces D4: no `captured`/published without consent.
- **Inputs / outputs.** In: the verified consent + the reference record + the rules. Out:
  `captured-reference.md` (id, kind, account/contact by id, the in-scope attribution +
  verbatim, the backing `consent_event` ref; `status = captured` only with consent on file).
- **Autonomy & tracer.** The internal write is reversible → **auto at L2** once an admin flips
  this workflow to `auto`, and **only** after stage 01 verified consent (A10 row 1). The
  staged record + backing consent ref ride the tracer.

### Step 03 — rights-gate (B1: Classify → Resolve-owner — the rights commitment)

The first-class, human gate of this procedure. The name/logo-use decision is the
**rights commitment**; it never self-approves.

- **Goal.** Gate any use of the customer's name or logo as a rights commitment, bounded to
  the consented scope.
- **Grounding sources.** Stage-02 `captured-reference.md`; stage-01 verified consent (the
  scope the request must fall within); `consent-and-rights.md` (the rights rules).
- **Instructions.** Classify the requested use from the captured reference — **name use** /
  **logo use** / **quote**. Mark any **name or logo use** `always_gate`, human,
  **MARKETING-owned** (not Legal in v1). Confirm the requested use falls **within the consent
  scope**; a use **beyond scope → PARK** (re-consent is required, and re-consent is Celeste's
  act, never Belle's). A **quote** use is bounded by the captured reference's in-scope
  verbatim. Present the **A4 easy-button**: the classified use + the consent-scope evidence
  (the backing `consent_event` ref) + a one-click **human approve**.
- **Gate / invariant inherited.** **A2.2 / commitment-class** — name/logo-use is a rights
  commitment, `always_gate`, dial-proof at every level (it never self-approves; ADR-0136 A3).
  **A4 easy-button bar.** The rights-gate is a **workflow-layer** gate, separate from the
  `reference_write` tool (which is not `always_gate`) — the commitment is the *use*, not the
  internal write.
- **Inputs / outputs.** In: the captured reference + the verified consent + the rules. Out:
  `proposed-rights-use.md` (the classified use, the `always_gate` marking, the consent-scope
  coverage check, the gate routing decision).
- **Autonomy & tracer.** **Never auto at any rung, in any mode** — `always_gate`, human,
  marketing-owned. The human approver + the consent-scope evidence are stamped for the tracer.

### Step 04 — spawn-asset (B1: Disposition — OPTIONAL hand-off)

- **Goal (OPTIONAL).** Spawn a case-study `content_asset` backed by this reference, or skip.
- **Grounding sources.** Stage-02 captured reference; stage-03 approved rights use (the
  human-approved name/logo/quote use the asset may rely on); `okf:content_asset` (the record
  to create + back-link).
- **Instructions.** If a case-study is **elected**, create a `content_asset(type=case_study)`
  and set its **backing link** (`backed_by_reference_id`) to this reference; hand it to the
  **content-studio** workflow (01-N) for authoring. If **not elected**, skip — produce no
  asset. The asset relies **only** on the stage-03 human-approved rights use.
- **Gate / invariant inherited.** **A11 seam** — the spawn is the explicit hand-off; 01-N owns
  authoring. **The `content_write` action-catalog kind** (`enum` includes `case_study`) is the
  INTERNAL operational write — `autoAtLevel: 2`, internal-reversible, no external commitment.
  Publish is a HANDOFF to Loveable (D3), not a send — there is no publish/send path here.
- **Inputs / outputs.** In: the captured reference + the approved rights use + the asset
  record. Out: `spawned-asset.md` (the `content_asset` ref — id, `type=case_study`, the
  backing reference id, the content-studio hand-over — or **none** if not elected).
- **Autonomy & tracer.** The spawn is an internal-reversible write (L2-class). The spawned
  asset id + its backing reference ride the tracer.

### Step 05 — reconcile (B1: Log)

- **Goal.** Link the reference to its account/opportunity and record provenance so advocacy
  is attributable.
- **Grounding sources.** Stage-02 captured reference; stage-04 spawned asset (if any);
  `okf:account` (the account, and its opportunity).
- **Instructions.** Link the `reference` → its `account` (and its opportunity, if one
  applies) for analytics attribution. Record **provenance**: who captured the reference, the
  backing `consent_event`, and the spawned `content_asset` (if any).
- **Gate / invariant inherited.** **A9 idempotent actuation** — the link/provenance write is
  idempotency-keyed so a replay is a no-op (A9b). **A7** — no cross-client data in the record.
  All links are by id (no PII).
- **Inputs / outputs.** In: the captured reference + the spawned asset (if any) + the account.
  Out: `reconciliation.md` (reference → account / opportunity links + provenance: captured-by,
  backing consent_event, spawned asset id if any).
- **Autonomy & tracer.** Mechanical link + provenance write (L2-class internal). The
  captured-by + backing consent + spawned asset are logged as the tracer.

## Learning on-ramp (how this earns more autonomy)

The rights-gate decision and the capture are this procedure's learning signal. Every human
approve / park at the rights-gate, and every consent-verified capture, writes to the
`agent_run` / `agent_message` trace; these feed the **eval-harvest** (#1037) → an agent that
demonstrates earned reliability lets an admin **raise the dial** per-workflow (ADR-0109/0121),
within the L1 ceiling and **never** past the `always_gate` rights-gate or the BO-04 refusal
floor (ADR-0136 A3). **v1 = human-approves-all;** the path to more automation runs through this
feedback loop, not around it — and even at the ceiling the rights-gate stays human.

## Dependencies & dormancy (honest posture — this documents the target, names the gates)

This SOP describes the **target** loop. In v1 several legs are runtime-gated and the runtime
**fails closed** — the procedure is real and dry-runnable, but it does not silently pretend to
capture or hand off:

- **The ICM executor integration is runtime-gated** — the self-hosted Managed Agents executor +
  delegate/handoff bus is not yet live (#489 / epic #695 / #341). Until then the stages dry-run
  to their checkpoint and stop (icm/CLAUDE.md: no Claude-Code send path).
- **The Celeste upstream seam (the solicitation)** is the consented-candidate source (#1703 /
  #1692, Stream 08). Until it hands over a consented candidate, advocacy-capture has no entry —
  Belle never originates a candidate by reaching out (BO-04).
- **`reference` + `content_asset` substrate** depends on the silver tables (#1698 / #1697) and
  the `reference_write` / `content_write` executor kinds; the data-class ceiling (ADR-0118)
  parks `reference_write` in v1 even at `auto`.
- **LP ingest is credential / home-server gated** — the consent + reference data hydrate only
  once the on-prem collectors land; until then the source is dormant and stage 01 flags it stale
  (A5c), never live. Worker recall is `#389`-gated (Voyage embeddings, TABLED).

## Security & grounding

No secrets, no client PII, no client identifiers in this document (ADR-0060 / ADR-0086; this
file replicates to every agent machine). Data is referenced by room/id, never by value — and a
`reference` itself holds client names / verbatim, so it is captured by id and never reproduced
here. Every attribution + quote stays within the recorded consent scope or it is cut (D4;
consent-and-rights.md). The fail-closed posture above is deliberate: dormant ≠ done, and a
dormant leg is documented as dormant.
