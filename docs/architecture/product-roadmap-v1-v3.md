# Product roadmap — v1 "Complete" → v2 "Refined" → v3 (TBD)

| Field | Value |
|---|---|
| **Scope** | Cross-repo product roadmap (frontend · backend · pipeline · local-pipeline) |
| **Status** | Adopted 2026-06-10 (issue #119); **recut 2026-06-11 per ADR-0057** (issue #179) |
| **Companions** | `go-live-roadmap.md` (internal v1 sequencing), ADR-0054 (board governance), ADR-0055 (autonomy tiers), ADR-0056 (versioning standard), ADR-0057 (this recut) |

## Vision

Appify every business process, automate as much as possible, inject agents where they
genuinely optimize, and keep the human element structural — not decorative. The AI Board
of Directors is the flagship of that last principle: agents deliberate, a human ratifies.

**v1 is the complete product, and it ships AI-first.** Employees' first touch is the
finished thing — pipelines and GUI exist to drive the knowledge layer and the human
interaction with it, and the agent experience must be crisp from the first session.
v2 and v3 are major *iterations* of that product, not completions of it.

**Versions are capability-gated, not calendar-gated.** Honest cadence estimate: v1
≈ 10–14 weeks from 2026-06-11; when a gate and a date conflict, the gate wins. Every
work item follows the standing change workflow (issue → branch → micro-PR → docs in the
same PR); each version cut is a release-please Release PR per ADR-0056, never a
hand-rolled tag.

## v1.0 "Complete" — the whole filed product, AI-first

**Theme:** everything filed as of 2026-06-11 ships; the agent experience is sharp;
go-live = the v1.0.0 cut = the first time employees touch the app (no 0.x soft launch).

**Scope rule (ADR-0057): if it was filed by 2026-06-11, it is v1.** The live ledger is
the per-repo v1 epics + the `v1.0` GitHub milestone in each repo.

Capability gates (all must hold):

1. **Go-live unblocked** (sequenced in `go-live-roadmap.md` Phases 0–4): grant
   migrations for the local-pipeline read scopes; gold re-sync + full vectorization
   (Voyage key is live); Graph subscription create/renew timer (pipeline); GDAP partner
   app + `PARTNER_TENANT_ID`; per-provider OAuth registrations; Easy Auth verified;
   secret rotation done; on-prem host runs unattended.
2. **AI core crisp (the AI-first gate):** semantic search + agent retrieval answer over
   all nine gold entity types; a **scripted agent-quality eval** (orchestrator answers
   per entity type, a board session over a real packet, RAG citation spot-checks) runs
   green; Mark signs off on the agent UX hands-on. The eval script is itself a filed
   deliverable.
3. **Board upgrade shipped** (ADR-0054 as amended — deputy model): influence personas,
   CISO Staff Analyst deputy, board packet composer, facilitator synthesis, advisor
   invitees, convene-time CISO-position field, ratify/overrule review UI. *(Shipped
   2026-06-10/11 — backend epic #27 closed; frontend items in #122.)*
4. **Sub-agents wired** (orchestrator tools, T0/T1 grants): `autotask`, `itglue`,
   `m365`, `crm`, `documentation`, plus advisor consult agents (ADR-0054) and Plaud MCP
   tools (backend #20).
5. **Client communications real** (T2 propose-only per ADR-0055, consent-gated):
   1:1 sends from the composer (ACS email/SMS config + executor land together),
   campaign blasts + scheduling, Meta/FB ads push + metric polling, workflow nurture
   automation + auto-enroll.
6. **Lead loop closed:** lead-capture receivers (web form, email alias) land in the
   inbox; M365 mail/Teams ingestion populates the `interaction` timeline; LLM
   contact-enrichment executor fills the dossier.
7. **Agent memory in use:** `agent_memory` read/write wired into the orchestrator loop.
8. **Deputy flow live** (ADR-0054 §4 second stage): board sessions resumable, pausing
   `awaiting_ciso` after round 2 for the human CISO to approve/amend the deputy draft
   before synthesis.
9. **Cost telemetry visible:** per-process cost rollups (spend per board session, per
   enriched contact, per drafted send) on the AI Agents page.
10. **Build-tail shipped** (the filed backlog): Plaud ingestion, UniFi device +
    compliance, posture UI + snapshots (ADR-0051 chain), Sentinel/KQM/DocuSign
    collectors, events + registration, projects/meetings/sales-activity, tasks→Autotask
    tickets, feedback→app-dev queue, shareable ticket views.
11. **Release machinery real:** PR-gating CI on all four repos, release-please wired
    everywhere, branch rulesets verified (ADR-0056).
12. **Autonomy policy carried** (ADR-0055): tier labels on every new tool/action
    surface; T2 client-visible actions ship propose-only.
13. **Budget set:** $250/month org ceiling configured; balanced preset default; board
    on premium tier.

## v2.0 "Refined" — the product learns from its own operation

**Theme:** real usage drives refinement; automation graduates by track record; the
board gains a sense of time. *(This is the former v3, promoted by ADR-0057.)*

Capability gates:

1. **Feedback incorporated:** a structured business-feedback review (what saved time,
   what produced noise, what got overruled and why) is held and its outcomes filed as
   issues; the refined backlog ships.
2. **Earned autonomy live:** `agent_tool_grant` enforcement in the backend loop
   (ADR-0055); at least the first T2 step graduated to whitelisted autonomy on a proven
   approval streak — or a documented decision that none qualified.
3. **Trend-aware board:** packets reference prior packets/sessions (deltas, trajectory);
   recommendation review history feeds the next packet.
4. **Persona editing UI:** influence profiles editable in-app (admin-only), with audit.
5. **Cost-effectiveness gate:** total AI spend < ~1% of MRR with ≥5 processes running on
   T1 autonomy; monthly spend-per-process review in place.

## v3.0 — deliberately undefined

The next major iteration, named and scoped by v2's feedback review. Standing candidate:
productization for other MSPs (ADR-0054's no-impersonation rule keeps that door open).
Also parked until then: billing/invoicing automation, revenue forecasting, field-service
scheduling.

## Issue & release mechanics

- One epic per repo per version (`epic` label) holds the version's checklist; every work
  item is its own issue/branch/micro-PR linked to the epic.
- A **`v1.0` GitHub milestone exists in each repo**; every open feature issue is
  assigned to it. The milestone progress bar is the at-a-glance burn-down; the epics
  carry the narrative.
- State lives on the issues (triage labels), not in chat. Session handoffs go to the
  handoff-memory repo per the standing /handoff rule.
- A version is *cut* when its gates hold and the release-please Release PR merges on
  each affected repo. v1.0.0 is declared by Mark (ADR-0056) and is the go-live event:
  employee rollout, comms, training.
- Descoping anything out of v1 requires Mark's sign-off on the specific issue — the
  wave model is not silently reintroduced (ADR-0057).

## Panel review — the agentic-engineering lens (2026-06-10)

The original roadmap was stress-tested against the published positions of five
practitioners Mark designated as the product's engineering conscience; their emphasis
survives the recut unchanged — evidence over vibes (Willison: every AI claim metered
and audited, packets show provenance), narrow tools (Ronacher: named tools per
sub-agent), loops with forced decisions (Steinberger: T2 graduation must graduate or
document), boring enablers first (Osmani: CI gates + release-please before features),
earned autonomy only (Zechner: T2 propose-only stays the default; per-step whitelisting
with automatic demotion ships with the graduation mechanic, now a v2 gate).
