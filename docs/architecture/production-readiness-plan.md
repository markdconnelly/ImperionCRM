# Imperion CRM — cross-repo production-readiness plan

> **You are in: `ImperionCRM` — the CANONICAL copy.** Synced copies live in the three sibling repos; update here and re-sync. **As of 2026-06-09 (post decision-lock).** This repo's section is marked **← this repo** below.

## TL;DR

**The big decisions are now locked (2026-06-09)** and the code refactors landed with them:

1. **AI stack settled:** Claude (generation, Haiku/Sonnet tiers) + Voyage `voyage-3-large`
   @ 1024 (embeddings). OpenAI/Azure OpenAI code paths **removed**; the legacy 1536-dim
   vector tables are **dropped** (they were never populated). One vector space.
   *(backend ADR-0034, front-end ADR-0041)*
2. **Identity is the perimeter:** public endpoints + Entra-only auth + per-app managed
   identities; private networking **deferred**, no longer a blocker on any list.
   *(backend ADR-0035, mirrored in every repo's unified security standard)*
3. **Division of labor:** front end = strictly GUI (direct DB **reads** OK; every
   *process* runs in the backend) · backend = all functions · cloud pipeline = live data
   (webhooks + merge + on-demand refresh; bulk pollers **retired**) · on-prem pipeline =
   heavy lifting (bulk ingestion + all vectorization).

What remains to a live AI loop is **operator configuration** (two Key Vault secrets +
app settings, Key Vault public access, Postgres grants, Easy Auth) and **two builds**
(local vectorization stage; backend real orchestrator loop).

## The four planes (status snapshot)

| Repo | Role | State (2026-06-09) |
| --- | --- | --- |
| **`ImperionCRM`** (front-end) ← *this repo* | GUI; direct DB reads; **owns DB schema + migrations** | Built, deployed, live (Entra SSO, Postgres+pgvector). Migrations `0001–0045` applied. |
| **`ImperionCRM_Backend`** | ALL processes: agent runtime, OAuth, sends, credentials, semantic search | **Claude+Voyage router wired (code-complete)**; search reads the gold store; degrades gracefully until the two Key Vault secrets are set. Orchestrator still a deterministic stub loop. |
| **`ImperionCRM_Pipeline`** (cloud) | Live data: webhooks, bronze→silver `merge-sources`, on-demand refresh | Bulk pollers retired (scope-down ADR); on-demand refresh endpoint added; `merge-sources` still misses the new entities. |
| **`ImperionCRM_LocalPipelineEnrichment`** (on-prem) | Heavy lifting: bulk ingestion + **all** vectorization | Bronze get+post built (tests green); SP identity + cert→token→Postgres chain **proven live**. Vectorization stage in progress; host bring-up remains. |

## Per-repo change lists

### `ImperionCRM` (front-end) ← *this repo*
- [ ] **Apply the legacy-vector-drop migration** (drops `interaction_embedding` /
      `contact_embedding`, both unpopulated) — committed, needs prod apply.
- [ ] **Rotate the deferred secrets** before go-live (signing cert, `AUTH_SECRET`, etc.).
- [ ] **Un-stub the AI Agents / Board pages** once the backend agent runtime is real.
- [ ] Ongoing: when a server action *processes* (not just reads), move it behind a
      backend API (the strictly-GUI rule, applied incrementally).

### `ImperionCRM_Backend`
- [x] ~~Wire Claude generation~~ — model-router is Claude-only (ADR-0034).
- [x] ~~Add a Voyage embeddings client~~ — `embed()` calls Voyage, enforces 1024.
- [x] ~~Point semantic search at the gold store~~ — `knowledge_object`/`knowledge_embedding`
      with the pinned-contract filter; agent retrieval follows.
- [x] ~~Converge the vector spaces~~ — resolved by dropping the never-populated 1536 tables.
- [ ] **Operator: set the secrets** — `anthropic-api-key` + `voyage-api-key` in Key Vault;
      `ANTHROPIC_API_KEY_SECRET`/`VOYAGE_API_KEY_SECRET` app settings; remove
      `OPENAI_API_KEY_SECRET`. *(This is now THE unblock for all AI.)*
- [ ] **Operator: posture convergence** — Key Vault public access (RBAC-only), Postgres
      grants migration, Easy Auth + `ALLOWED_CALLER_CLIENT_ID`
      (see `docs/operations/infrastructure.md`).
- [ ] **Replace the orchestrator's stub router** with a real Claude tool-use loop.
- [ ] **Live OAuth flows + real sends** behind the consent gate.

### `ImperionCRM_Pipeline` (cloud)
- [x] ~~Stop double-ingest~~ — the 6 bulk pollers (`apollo-enrich`, `autotask-poll`,
      `darkwebid-poll`, `itglue-poll`, `m365-users`, `televy-poll`) retired; cloud keeps
      `webhooks/*` + `gdap-health` + `merge-sources`.
- [x] ~~On-demand refresh~~ — authenticated endpoint for targeted live refreshes from the
      UI/agent.
- [ ] **Extend `merge-sources`** to fold the new entities into silver — contracts,
      tickets, televy→assessment, darkwebid→credential_exposure, security-posture.

### `ImperionCRM_LocalPipelineEnrichment` (on-prem)
- [ ] **Build the §7 vectorization stage** — chunk gold → Voyage `voyage-3-large`/1024 →
      `knowledge_embedding` (schema live, front-end 0045); content-hash idempotency +
      cost telemetry.
- [ ] **Build silver→gold `knowledge_object` population** for the new entities.
- [ ] **Provision the unattended host** — cert→`LocalMachine\My`, local service account,
      SecretStore, `Register-ImperionTask` (`docs/deployment/unattended-bringup.md`).
- [ ] **Remaining post writers** (m365 / itglue / kqm / docusign / website) once their
      bronze tables land.

## Recommended sequence

1. **Operator config** (Key Vault secrets + public access, Postgres grants, Easy Auth)
   → *every AI feature lights up; `/api/ready` goes green.*
2. **Local: vectorization stage + provision the host** → vectors flow into the gold store.
3. **Cloud: extend `merge-sources`** → silver complete for all entities.
4. **Backend: real orchestrator loop** → the agent reasons over everything.
5. **Front-end: un-stub Agents/Board + rotate secrets + apply the drop migration** →
   user-facing go-live.

## Already verified live in prod (the foundation under all of this)

- Schema migrations `0038–0045` applied; gold `knowledge_object` / `knowledge_embedding`
  (Voyage/1024, HNSW) live.
- Local-pipeline SP identity (`imperion-localpipeline`) + least-privilege grants + the
  cert→token→Postgres write chain **proven live** against `imperioncrm-pg-prd`.
- Local bronze **get + post** layers built; unit tests green.

## References

- **Settled decisions:** backend ADR-0034 (Claude+Voyage) · backend ADR-0035 (public
  endpoints + Entra-only identity) · the per-repo `docs/security/unified-security-standard.md`.
- **ADRs:** `ImperionCRM` ADR-0041 (gold/vector store), ADR-0039 (per-source bronze),
  ADR-0040 (Dark Web ID/Televy); `ImperionCRM_LocalPipelineEnrichment` ADR-0001–0008.
- **Local bring-up runbook:** `ImperionCRM_LocalPipelineEnrichment/docs/deployment/unattended-bringup.md`.
- **Vector contract (producer side):** `ImperionCRM_LocalPipelineEnrichment/docs/database/vector-lifecycle.md`.
