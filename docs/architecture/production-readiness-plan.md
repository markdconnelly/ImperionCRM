# Imperion CRM — cross-repo production-readiness plan

> **You are in: `ImperionCRM` (front-end) — this is the CANONICAL copy.** Sibling repos carry a
> synced copy at `docs/production-readiness-plan.md`. Update this one and re-sync when you pick
> the work back up. **As of 2026-06-09.**

## TL;DR

The code across all four repos is **largely built, but the system is not yet wired into a live
AI + data flow.** The single biggest blocker: **no AI provider is configured anywhere** — the
backend model-router throws *"no provider configured,"* so nothing embeds or reasons yet. Almost
everything else is an **integration seam, not a new subsystem** — the subsystems mostly exist.

## The four planes (status snapshot)

| Repo | Role | State (2026-06-09) |
| --- | --- | --- |
| **`ImperionCRM`** (front-end) ← *this repo* | Live web app; **owns DB schema + migrations** | Built, deployed, live (Entra SSO, Postgres+pgvector). Migrations `0001–0045` applied. |
| **`ImperionCRM_Backend`** | Orchestrator agent + sub-agents, OAuth, sends, semantic search (MI-auth, front-end-only) | Scaffolded; CI live. **No AI provider wired** (`complete()`/`embed()` throw); orchestrator = deterministic **stub** router. |
| **`ImperionCRM_Pipeline`** (cloud) | Webhooks + low-latency ingestion; bronze→silver `merge-sources` | Built; CI live. **8 timers still bulk-polling** (double-ingest); `merge-sources` misses the new entities. |
| **`ImperionCRM_LocalPipelineEnrichment`** (on-prem) | Bulk ingestion + **all** vectorization | Bronze get+post built (190 tests green); SP identity + grants + cert→token→Postgres write chain **proven live**. Gold/vectorization + host bring-up remain. |

## Per-repo change lists

### `ImperionCRM` (front-end) — closest to done
- [ ] **Rotate the deferred secrets** before go-live (signing cert, `AUTH_SECRET`, etc.).
- [ ] **Un-stub the AI Agents / Board pages** once the backend agent runtime is real (they call the backend).

### `ImperionCRM_Backend` — scaffolded, not wired
- [ ] **Wire an AI provider** — `src/shared/model-router.ts` STATUS: *"no provider configured"*; `complete()`/`embed()` throw. Enable **Claude** (generation) so the agent + gold summaries can run.
- [ ] **Add a Voyage embeddings client** — the router has OpenAI/Azure/Anthropic but **no Voyage**; the pinned embedding model is Voyage `voyage-3-large`/1024 (ADR-0041).
- [ ] **Replace the orchestrator's stub router** (`src/functions/agent/orchestrator.ts`) with a real LLM tool-use loop (single-orchestrator model; see Claude API tool-use).
- [ ] **Point semantic search at the gold store** — `src/functions/search/semantic.ts` + `src/shared/embeddings.ts` query the legacy `vector(1536)` `interaction_embedding`/`contact_embedding`; the agent should query `knowledge_embedding` (Voyage/1024, migration 0045).
- [ ] **Converge or bridge the 1536 ↔ 1024 vector spaces** so the agent has one retrieval surface.
- [ ] **Live OAuth flows + real sends** behind the consent gate (needs live credentials + testing).

### `ImperionCRM_Pipeline` (cloud) — double-ingesting; scope it down
- [ ] **Stop double-ingest** — the on-prem local pipeline now owns bulk loads, but cloud still bulk-polls on timers: `apollo-enrich`, `autotask-poll`, `darkwebid-poll`, `itglue-poll`, `m365-users`, `televy-poll`. Retire/scope these to GUI-refresh; **keep `webhooks/*` + `gdap-health` + `merge-sources`** (the documented division of labour).
- [ ] **Extend `merge-sources`** (`src/shared/merge.ts`) to fold the new entities into silver — today it covers `website/m365/itglue/apollo/autotask` only; add **contracts, tickets, televy→assessment, darkwebid→credential_exposure, security-posture**.

### `ImperionCRM_LocalPipelineEnrichment` (on-prem) — bronze proven; gold/host remain
- [ ] **Build the §7 vectorization stage** — chunk gold → **Voyage `voyage-3-large`/1024** → `knowledge_embedding` (schema live, front-end 0045). Needs a Voyage client behind the model-router + cost telemetry + content-hash idempotency.
- [ ] **Build silver→gold `knowledge_object` population** for the new entities (coordinate ownership with the cloud `merge-sources` — see cross-cutting #4).
- [ ] **Provision the unattended host** — cert→`LocalMachine\My`, local service account, SecretStore, `Register-ImperionTask`. See `docs/deployment/unattended-bringup.md` (non-domain box → local service account, no gMSA).
- [ ] **Remaining post writers** (m365 / itglue / kqm / docusign / website) once their bronze tables land.

## Cross-cutting integration seams (the part that's easy to miss)

1. **Wire ONE generation provider (Claude)** into the shared model-router — unblocks the agent loop *and* gold summarization everywhere. *Highest-leverage single action.*
2. **Add a Voyage embeddings client** to the shared model-router pattern (backend + local pipeline) — it is present in **no** router today.
3. **Converge the vector space** — re-embed the legacy 1536 `interaction`/`contact` embeddings into the 1024 gold store (or formally keep two spaces) so the agent queries one surface.
4. **Draw the silver→gold ownership line** — cloud `merge-sources` owns bronze→silver; local pipeline §7 owns gold `knowledge_object` generation + embedding. Make it explicit so each new entity lands in gold exactly once.
5. **Operational / human-approval gates** — any remaining migrations, the on-prem host bring-up, GDAP role scoping, secret rotation, and enabling real OAuth/sends.

## Recommended sequence

1. **Wire one AI provider** (Claude generation + Voyage embeddings) into the shared router → *unblocks all AI*.
2. **Cloud: stop double-ingest + extend `merge-sources`** → silver complete and conflict-free.
3. **Local: vectorization stage + provision the host** → data + vectors flow end-to-end.
4. **Backend: real orchestrator loop + point search at the gold store** → the agent reasons over everything.
5. **Front-end: un-stub Agents/Board + rotate secrets** → user-facing go-live.

> Net: **4 of the 5 hardest blockers are integration/wiring, not new subsystems.** Critical path: *provider wiring → de-dup the pipelines → vectorize → real agent loop*.

## Already verified live in prod (the foundation under all of this)

- Schema migrations `0038–0045` applied; gold `knowledge_object` / `knowledge_embedding` (Voyage/1024, HNSW) live.
- Local-pipeline SP identity (`imperion-localpipeline`) + least-privilege grants + the cert→token→Postgres write chain **proven live** against `imperioncrm-pg-prd`.
- Local bronze **get + post** layers built; 190 unit tests green.

## References

- **ADRs:** `ImperionCRM` ADR-0041 (gold/vector store), ADR-0039 (per-source bronze), ADR-0040 (Dark Web ID/Televy); `ImperionCRM_LocalPipelineEnrichment` ADR-0001–0008.
- **Local bring-up runbook:** `ImperionCRM_LocalPipelineEnrichment/docs/deployment/unattended-bringup.md`.
- **Vector contract (producer side):** `ImperionCRM_LocalPipelineEnrichment/docs/database/vector-lifecycle.md`.
- **Cross-repo action items (local):** `ImperionCRM_LocalPipelineEnrichment/docs/cross-repo-action-items.md`.
