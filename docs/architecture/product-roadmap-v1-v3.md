# Product roadmap — v1 "Operational" → v2 "Automated" → v3 "Refined"

| Field | Value |
|---|---|
| **Scope** | Cross-repo product roadmap (frontend · backend · pipeline · local-pipeline) |
| **Status** | Adopted 2026-06-10 (decisions locked with Mark; issue #119) |
| **Companions** | `go-live-roadmap.md` (ops unblocking, canonical), ADR-0054 (board governance), ADR-0055 (autonomy tiers) |

## Vision

Appify every business process, automate as much as possible, inject agents where they
genuinely optimize, and keep the human element structural — not decorative. The AI Board
of Directors is the flagship of that last principle: agents deliberate, a human ratifies.

**Versions are capability-gated, not calendar-gated.** Target cadence: v1 ≈ 2–3 weeks,
v2 ≈ +4–6 weeks, v3 ≈ +6–8 weeks; when a gate and a date conflict, the gate wins. Every
work item follows the standing change workflow (issue → branch → micro-PR → docs in the
same PR); each version cut is a release-please Release PR, never a hand-rolled tag.

## v1.0 "Operational" — the platform runs the business on real data

**Theme:** kill everything blocking go-live, make version numbers real, and ship the
board upgrade so the flagship feature deliberates on grounded data.

Capability gates (all must hold):

1. **Go-live unblocked** (tracked in `go-live-roadmap.md` Phases 0–4): grant migrations
   (0059+) for the local-pipeline read scopes; real Voyage key in Key Vault + gold
   re-sync/vectorization; Graph subscription create/renew timer (pipeline); GDAP partner
   app + `PARTNER_TENANT_ID`; ACS connection string; per-provider OAuth registrations;
   Easy Auth verified; secret rotation done.
2. **Release machinery real:** PR-gating CI on all four repos (the backend's 105 tests
   currently gate nothing), release-please wired everywhere, branch rulesets verified.
3. **Board upgrade shipped** (ADR-0054): influence personas (migration + data
   migration), board packet composer, facilitator synthesis, advisor invitees (cap 7),
   `board_recommendation` ratify/overrule review UI for the human CISO.
4. **Autonomy policy adopted** (ADR-0055): ADR merged; tier labels carried in any new
   tool/action surface from here on.
5. **Budget set:** $250/month org ceiling configured; balanced preset default; board on
   premium tier.

## v2.0 "Automated" — the process-automation wave

**Theme:** the seven reserved sub-agents come alive, outbound becomes real (behind the
consent gate and T2 propose-only), and the engagement data loop closes.

Capability gates:

1. **Sub-agents wired** (orchestrator tools, T0/T1 grants): `autotask` (ticket queries +
   AI-labeled triage notes), `itglue` (config/doc lookups), `m365` (mail/calendar
   context), `crm` (account/contact/opportunity queries + T1 draft writes),
   `documentation` (knowledge authoring drafts), plus advisor consult agents
   (Negotiation/Performance coaches as one-on-one orchestrator personas, per ADR-0054).
2. **Real sends live:** ACS email/SMS execution behind the consent gate, T2
   propose-only, with approval-rate bookkeeping recorded per step (the data that later
   justifies T2 whitelisting). Campaign sends + workflow step executor fire for real.
3. **Lead loop closed:** lead-capture receivers (web form, email alias) land in the
   inbox; M365 mail/Teams ingestion populates the `interaction` timeline (bronze tables +
   collectors already built on-prem); LLM contact-enrichment executor fills the dossier.
4. **Agent memory in use:** `agent_memory` read/write wired into the orchestrator loop.
5. **Cost telemetry visible:** per-process cost rollups (spend per board session, per
   enriched contact, per drafted send) surfaced on the AI Agents page.

## v3.0 "Refined" — the closed loop

**Theme:** business feedback drives refinement; automation graduates by track record;
the board gains a sense of time.

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

## Issue & release mechanics

- One epic per repo per version (`epic` label) holds the version's checklist; every work
  item is its own issue/branch/micro-PR linked to the epic.
- State lives on the issues (triage labels), not in chat. Session handoffs go to the
  handoff-memory repo per the standing /handoff rule.
- A version is *cut* when its gates hold and the release-please Release PR merges on each
  affected repo.

## Panel review — the agentic-engineering lens (2026-06-10)

The roadmap was stress-tested against the published positions of five practitioners Mark
designated as the product's engineering conscience:

- **Willison (evidence-based skepticism):** the strongest feature of this plan is that
  every AI claim is metered and audited — keep publishing real cost/outcome numbers per
  process, and treat the v3 feedback review as falsification, not celebration. Where the
  board's packet cites data, show provenance; never let a persona's confident prose
  outrun what the packet actually contains.
- **Ronacher (agentic workflows):** the sub-agent registry + tool-grant design matches
  how agentic systems actually stay maintainable — resist the temptation to give agents
  broad tools early; narrow, named tools per sub-agent (v2 gate 1) is the right call.
- **Steinberger (design loops, not prompts):** the T2 graduation mechanic — propose-mode
  streaks earning autonomy — is a loop design, not prompt babysitting; the risk is
  building it and never graduating anything. v3 gate 2 deliberately forces an explicit
  graduate-or-document decision.
- **Osmani (team rollout):** v1's unglamorous items (CI gates, release-please) are the
  team-scale enablers; do them first exactly as planned. Add the cost rollups (v2 gate 5)
  to the page humans already visit, not a dashboard nobody opens.
- **Zechner (over-automation counterweight):** the permanent T2 propose-only default for
  client-visible action is the load-bearing safety decision; per-step (never per-channel)
  whitelisting with automatic-demotion-on-rejection (ADR-0055 future work) should be
  implemented with the graduation, not after it.

Net verdict: approved, with the panel's emphasis baked into the gates above — evidence
over vibes (Willison), narrow tools (Ronacher), loops with forced decisions
(Steinberger), boring enablers first (Osmani), earned autonomy only (Zechner).

## Out of scope until after v3

Billing/invoicing automation, revenue forecasting, field-service scheduling,
productization for other MSPs (revisit only after the v3 feedback review; ADR-0054's
no-impersonation rule keeps that door open).
