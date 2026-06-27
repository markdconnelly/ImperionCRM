# OS Brain — MWP (minimum-working-proof) + hydration runbook

**Trigger:** the OS Brain substrate is built (migrations 0166–0170) but unhydrated and
untested, and you want to prove the memory recall loop works end-to-end before paying for a
full-corpus Voyage pass. This runbook defines the minimum proof and the order in which the
gold knowledge surface is hydrated and turned on.

**Cross-references:** ADR-0113 (verbatim memory — bronze turns / gold summaries / drill-down
recall) · ADR-0114 (personal-knowledge-store data model) · ADR-0115 (gold hybrid-ranker
contract) · ADR-0116 (universal-memory MCP contract) · ADR-0105 (two-axis RLS access spine,
§3c integrity invariants) · #1318 (OS Brain umbrella) · #1319 (stress test) · #1152 (synthesis
store / curated vault) · #1400 (G1 platform-credentials epic — `conn-platform-voyage`) ·
#119 (backend trigger-sync) · LP #176 (vectorize knowledge) · LP #300 (`Get-/Set-ImperionKnowledge*`)
· BE #304 (backend query-embed).

---

## 1. MWP definition — the thinnest end-to-end slice

The minimum proof that the OS Brain works is **the memory recall loop on the thinnest slice**:
store → summarize → embed → recall → drill, on **~10 rows**, with the backend query-embed
pointed at the platform Voyage key. This proves the whole loop before any full-corpus pass.

The loop, step by step:

1. **Store a deliberate capture.** `POST /api/memory/store` writes a verbatim row to
   **`memory_drawer`** (bronze, non-agent verbatim — ADR-0113).
2. **Compose the gold summary.** `Get-ImperionKnowledgeMemory` (LP #300) reads the verbatim
   rows and `Set-ImperionKnowledgeObject` writes a gold **`memory`** summary
   (`knowledge_object`, `entity_ref = conversation/capture id`).
3. **Vectorize it.** `Invoke-ImperionVectorizeKnowledge -EntityType memory` (LP #176) embeds
   the gold summary with Voyage `voyage-3-large` @ 1024 dims (ADR-0041 contract).
4. **Recall.** `POST /api/memory/recall` query-embeds the request and hybrid-searches the gold
   summaries (ADR-0115 ranker).
5. **Drill summary → verbatim.** Follow the gold summary's reference back to the
   `memory_drawer` (or `agent_message`) verbatim rows for faithful recall (ADR-0113).

**Done check:** ~10 rows stored, summarized, embedded; a `POST /api/memory/recall` returns the
expected gold summary; drilling that summary resolves to its verbatim bronze rows. This proves
**store → summary → embed → recall → drill** before billing a full-corpus Voyage pass.

---

## 2. Hydration order

Hydrate (and bulk-vectorize) the gold surface in this order — narrow-and-proven first, broad
last:

1. **`memory` slice first (the MWP).** ~10 deliberate captures. Prove the loop end-to-end.
2. **`conversation` / agent transcripts.** `agent_message` is the second memory origin
   (ADR-0113). Summarize + embed agent-run transcripts once the loop is proven on the memory
   slice.
3. **The broad business corpus.** account / contact / contract / ticket / device / … —
   bulk-vectorized only **after** the loop is proven on (1) and (2).

**Rationale:** prove the loop on ~10 rows before billing a full-corpus Voyage pass. A
full-corpus embed of ~50k `knowledge_object` rows is the expensive, irreversible-cost step;
it should never be the thing that *discovers* a broken store/summary/recall wiring.

---

## 3. Key dependency — collapsed

The backend query-embed (**BE #304**) is **not unbuilt code**. It is the backend reading the
**same `conn-platform-voyage`** platform credential seeded by the **G1 platform-credentials
epic (#1400)** — the identical key LP #176 uses to embed the gold summaries. Query-embed and
corpus-embed point at one credential; there is no second key to provision and no separate
embedding path to build.

So recall **lights up once** all three hold:

- **(a)** LP #176 / #300 have hydrated the **memory slice** (gold `memory` summaries embedded);
- **(b)** the backend **resolves `conn-platform-voyage`** for query-embed (#1400 seeds it);
- **(c)** **trigger-sync (#119)** activates the `/api/memory/*` endpoints (backend deploys land
  code but leave triggers dormant until a manual `syncfunctiontriggers`).

There is no fourth blocker. Once (a)+(b)+(c) are true, the recall loop is live in prod.

---

## 4. The integrity invariants that must hold

These are the non-negotiable invariants of the OS Brain (ADR-0105 §3c + ADR-0113 / ADR-0114).
They must hold at the MWP and under load (see the stress-test plan, `docs/testing/os-brain-stress-test-plan.md`):

1. **No `BYPASSRLS`.** No role on the recall/curation path carries `BYPASSRLS`; RLS is the
   control plane, not an advisory.
2. **Append-only ledger.** The verbatim ledger (`memory_drawer`, `agent_message`) and the
   run/curation ledger are append-only — no in-place edit or destructive overwrite of captured
   memory.
3. **Human-approved, never-silent cross-wall curation.** Promotion across the personal↔company
   wall is human-approved; nothing crosses tiers silently.
4. **Non-impersonation.** RLS policies key on `current_user`, **not** a settable GUC — a
   request cannot impersonate another owner by setting a session variable.

Plus two structural invariants that fall out of the model:

5. **Tier separation.** A personal-tier row never lands in a company table (and vice versa).
6. **Drill always resolves.** Every gold summary's reference resolves to its verbatim bronze
   rows — summary↔verbatim drill is never dangling.
