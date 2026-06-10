# Session handoff — 2026-06-10 build sprint

Condensed state for the next working session. Detail lives in the
[production-readiness plan](../architecture/production-readiness-plan.md) (canonical,
re-synced to all four repos this session) and the per-PR ADRs.

## What shipped (15 PRs, 6 prod migrations, all deploys green)

| Repo | PRs | What |
| --- | --- | --- |
| ImperionCRM | #76–#83 | Agents page (ADR-0048) · grant migrations 0055/0057 · OAuth UI + callback route · agent-core/Board schema 0056 (ADR-0049) · Board page · docs refresh + secrets-rotation runbook |
| ImperionCRM_Backend | #15–#17 | Per-user OAuth flows (ADR-0038) · AI Board runtime (ADR-0039) · plan re-sync |
| ImperionCRM_Pipeline | #16–#17 | Webhook payload handlers — Autotask tickets land+merge inline with bulk-loader hash parity, Graph notifications → GDAP-checked refresh (ADR-0013) · plan re-sync |
| ImperionCRM_LocalPipelineEnrichment | #68–#70 | v0.5.0: 9 bronze post writers + 7 scheduled tasks · 5 new knowledge composers (9 entity types total) · plan re-sync |

**Prod DB:** migrations `0001–0057` applied and verified (`node scripts/migrate.mjs`,
Entra-token auth). 0052–0054 lit up saved views / device inventory / agent settings;
0055/0057 unblocked the pipeline write+read paths; 0056 created the agent core + Board
tables with 5 seeded personas (CEO/CFO/COO/CMO/CISO).

**No placeholder modules remain** — Agents and Board are real; OAuth connect/disconnect
is wired end-to-end (activation pending provider registrations).

## Operator checklist (blocks features, not builds — ordered by payoff)

1. Real **Voyage key** → KV `Voyage-Embedding-API-Key`, then
   `Invoke-ImperionKnowledgeSync -Vectorize` → semantic search live.
   Module v0.5.0 is installed (CurrentUser) on the dev box; config template seeded at
   `C:\ProgramData\Imperion\pipeline.config.psd1` — needs cert thumbprint/IDs filled.
2. **Knowledge re-sync** (interim mode) → gold gains devices/proposals/exposures/
   assessments/posture.
3. **OAuth provider registrations** (start m365) + `OAUTH_REDIRECT_BASE_URL`
   (`https://imperioncrm.azurewebsites.net/api/connections`) + backend MI
   **KV Secrets Officer**.
4. **ACS connection string** (SMS) · **GDAP partner app** · pipeline **`PARTNER_TENANT_ID`**
   (ticket webhook answers 503 until set).
5. **Secret rotation** per [the runbook](secrets-rotation-runbook.md) · on-prem **host
   provisioning** (local repo `docs/deployment/unattended-bringup.md`).

## Next-session build candidates (the deferred tail)

- **Pipeline:** Graph **subscription creation/renewal timer** (notifications can't flow
  without it); live-verify Autotask webhook payload shape + hash parity on first real ticket.
- **Backend:** ingestion engines (Graph email/Teams, Plaud, social) · lead-capture
  receivers · LLM enrichment endpoints (`contact_enrichment`, pre-discovery drafts).
- **Local pipeline:** Sentinel collector · KQM + DocuSign collectors (bronze tables exist) ·
  M365 mail/Teams bronze tables (front-end migration first) → post writers.
- **Front-end:** approval queue UI for agent-proposed sends (backend execute endpoint
  exists, ADR-0033) · move campaign launches behind the backend when they gain real sends.

## Working notes for the next session

- Verify state against **git log + prod DB**, not the docs — they can lag by a day.
- PR per major change; merge commits. Backend has **no PR CI** (deploy-only on main);
  the local PowerShell repo has **no CI at all** — gate locally with
  `Invoke-ScriptAnalyzer src -Settings .\PSScriptAnalyzerSettings.psd1` (0 findings) +
  `Invoke-Pester tests` (279 green at v0.5.0).
- Any new pipeline-written table needs a grant migration here first (0044/0055/0057
  pattern) or writes fail with permission denied.
- Merging to main auto-deploys all three Azure repos (OIDC, no secrets).
