---
adr: 0116
title: "Universal Memory MCP contract — write+recall memory MCP over one governed brain"
status: proposed
date: 2026-06-22
repo: frontend
summary: "Phase 4 of the unified-memory build (epic #1169). A write+recall memory MCP (store/recall/list_agents) lets Claude Code, Cursor, and the orchestrator share ONE governed brain. Decisions: (1) the MCP is a THIN CLIENT over new backend /api/memory/* endpoints, not a read-write pg-MCP — recall needs Voyage embed (AI key = backend-only, ADR-0043) and a Cursor-reachable write surface must expose 3 tools, never raw SQL on prod PII. (2) Identity = az-minted Entra token for the backend audience; the human's claims flow through (pg-mcp pattern). (3) store writes to memory_drawer (0167), reframing §4 from non-agent to non-TRANSCRIPT deliberate capture; a new nullable agent_slug column attributes the agent (free-text + convention). (4) The MCP write surface is PERSONAL-SCOPE ONLY (owner = authenticated human) — shared agent diaries (owner NULL, wing agent:<slug>) are backend-in-process only; this contains injection/exfil and keeps the personal->company promotion wall (#967 §3c) intact. recall reads ACROSS diaries (RLS-permitted). (5) recall = the single canonical gold ranker (ADR-0115), deploy-dormant until BE #304 + LP #300 + LP #176. (6) list_agents = RLS-scoped distinct readable namespaces, roster-enriched. (7) store self-audits (append-only row); recall is ledgered only on cross-scope/shared reads (audit_log, query HASH not text). One additive dormant migration (0169: agent_slug). Companion backend ADR carries the endpoints + clients/memory-mcp server (BE #306)."
tags: [architecture, agents, memory, mcp, security, rls]
---

# ADR-0116: Universal Memory MCP contract

> **Number `0116` claimed at MERGE** per system CLAUDE.md §10.3 — authored against a placeholder; renumber if another ADR merges first. Phase 4 of the unified-memory build (epic #1169, under #966).
>
> **Cross-references:** ADR-0042 (four-repo division), ADR-0043 (settled AI stack / no FE key), ADR-0105 (two-axis RLS access spine), ADR-0113 (verbatim memory tier), ADR-0114 (personal knowledge store), ADR-0115 (gold hybrid ranker), backend ADR-0035 (Easy-Auth caller allowlist); companion **ImperionCRM_Backend ADR — Memory MCP endpoints + custom client** (BE issue #306).

## Problem

The unified-memory build gave Imperion a governed brain: verbatim bronze (`memory_drawer` 0167 / `agent_message`), gold summaries + the hybrid ranker (`searchGoldKnowledge`, ADR-0115), and a temporal knowledge graph (0168). All of it is reachable only from *inside* the platform — the Next.js app and the backend orchestrator. Today's only external door is the **read-only** Postgres MCP (system CLAUDE.md §8): raw SQL, `SELECT`-only, Mark's identity.

The agentic-OS thesis needs more: the tools an engineer actually builds *with* — **Claude Code, Cursor** — and the runtime **orchestrator** should all read and write **one** memory, governed by the same RLS, so a fact learned in one surface is recallable in another. OB1's signature is exactly this: a universal memory MCP exposing `store` / `recall` / `list_agents`. We need that, without turning a prod store of client PII into an ungoverned write target reachable from a third-party editor.

## Context

- **No FE AI key (ADR-0043).** `recall` requires embedding the query (Voyage `voyage-3-large`); embedding is an AI call, so it cannot run on the edge or in the front end — it must be backend.
- **Two-axis RLS already fits (ADR-0105, 0167).** `memory_drawer`'s policy: `owner_user_id` present ⇒ owner-only (personal axis); `owner_user_id` NULL ⇒ visible to any identified caller (company axis). The WHY-block already names "an agent's diary" as the NULL-owner case.
- **Split-by-origin (§4 / ADR-0113).** Verbatim is split: agent *transcripts* → `agent_message`; non-agent verbatim → `memory_drawer`. But every MCP caller (Claude Code, Cursor, orchestrator) *is* an agent, and a deliberate "remember this" is neither a transcript turn nor a human GUI note — it fits the existing `memory_drawer` shape but trips the literal word "non-agent".
- **The promotion wall (#967 §3c).** Personal→company is an explicit, ledgered curation path with a service identity. Nothing else may cross it.
- **Precedent.** The read-only pg-MCP mints a short-lived Entra token from the local `az` CLI — no stored secret, the human's identity flows through.

## Options considered

**A — MCP shape: thin client over backend HTTP, vs read-write pg-MCP.** A read-write clone of the pg-MCP would run SQL directly with an Entra token. But (1) it physically cannot do semantic `recall` (no AI key on the edge), and (2) a write surface reachable from Cursor that speaks arbitrary SQL against prod PII is unbounded. The read-only MCP is safe *because* it is read-only.

**B — `store` write target.** (a) Attribute to the human owner → land in `memory_drawer` unchanged, lose agent attribution; (b) reframe `memory_drawer` from *non-agent* to *non-transcript* and add an `agent_slug` discriminator; (c) a third `agent_diary` table.

**C — `recall` availability.** (a) Ship a bronze keyword/recency fallback so recall is live at merge; (b) keep recall as the single canonical gold ranker and accept it is dormant until the embedding deps land.

### Tradeoffs

- **A:** the thin client adds an HTTP hop and depends on the backend being deployed + trigger-synced (#119), but gives one audit choke-point, a 3-tool surface (never raw SQL), reuse of `withIdentity` + the existing ranker, and keeps the AI key backend-only.
- **B(b)** costs one nullable column + a one-line §4 reframe, but avoids fragmenting bronze verbatim into three tables that recall and the Personal Curator must all union; the *real* distinction was always transcript-vs-deliberate, not agent-vs-non-agent. **B(c)** is the cleanest separation but the most schema and union surface. **B(a)** is cheapest but throws away the per-agent diary the thesis wants.
- **C(a)** makes Phase 4 demonstrable at merge but adds throwaway SQL the gold ranker later subsumes, and means two recall code paths. **C(b)** keeps one canonical recall path at the cost of dormancy — acceptable because the entire pre-go-live system is deploy-dormant by design.

## Decision

1. **The Memory MCP is a thin client over new Backend HTTP endpoints**, not a read-write pg-MCP (Option A). The MCP server is a protocol adapter; `POST /api/memory/{store,recall}` + `GET /api/memory/agents` carry the logic, Easy-Auth + caller-allowlist gated (backend ADR-0035), RLS enforced server-side via `withIdentity`. Endpoint detail is the companion backend ADR (BE #306).

2. **Identity = the human's Entra claims, end-to-end.** The local stdio MCP mints a short-lived token via the `az` CLI for the **backend API audience** (the pg-mcp pattern, different resource), passes it as the bearer. Backend resolves `app_user` → sets `app.user_id` / `app.groups` → RLS decides. No stored secret on the edge.

3. **`store` writes to `memory_drawer`** (Option B(b)). §4 is reframed: *non-agent verbatim* → ***non-transcript deliberate capture***. A new nullable **`agent_slug`** column is the authored-by-agent discriminator (`agent_slug IS NOT NULL`); free-text + convention now, FK to an agent registry later. The `wing` convention gains `agent:<slug>` alongside `user:<id>` / `project:<id>`. **No RLS change** — 0167's policy already handles both axes.
   - **Class 1** (Claude Code / Cursor on a human's machine): `owner_user_id = <human>`, `agent_slug = 'claude-code'`, wing `user:<id>` → **owner-private** (the agent held the pen; the human is the author).
   - **Class 2/3** (autonomous orchestrator / Felix): `owner_user_id = NULL`, `agent_slug = 'felix'`, wing `agent:<slug>` → **shared diary**, company axis.

4. **The MCP write surface is personal-scope only.** Every MCP `store` is `owner_user_id = <authenticated human>`. An external client **cannot** write a NULL-owner shared/agent diary — those are written **backend-in-process** by autonomous agents. This contains the injection/exfil surface (a compromised Cursor can only poison its own user's personal memory, which only ever grounds that user) and keeps the personal→company promotion wall (#967 §3c) intact for free. **`recall` reads *across* diaries** (RLS-permitted) — that is how a per-agent diary becomes consultable.

5. **`recall` is the single canonical gold ranker** (Option C(b)): `searchGoldKnowledge` (ADR-0115), two-level — gold summary → drill to verbatim bronze via `entity_ref`. **No bronze fallback.** It is **deploy-dormant** until BE #304 (query-embed) + LP #300 (gold `memory` summary from the drawer) + LP #176 (hydrate `knowledge_embedding`). Phase 4 therefore ships `store` + `list_agents` **live**, `recall` **dormant-by-dependency**.

6. **`list_agents` lists readable recall scopes.** An RLS-scoped `SELECT DISTINCT` over `memory_drawer` (+ `agent_message`) namespaces — the caller's own `user:`/`project:` wings **and** every shared `agent:<slug>` diary RLS permits — enriched with roster display metadata (`docs/agents/agent-roster.md`) where the slug is a known agent. Name kept for OB1 familiarity; semantics = "list the scopes I can recall from."

7. **Audit is asymmetric.** `store` self-audits — the append-only `memory_drawer` row records who (`agent_slug`), provenance (`source_metadata`), and `created_at`; no separate ledger. `recall` is ledgered **only when it crosses into shared/agent diaries**: one `audit_log` row (`action = 'memory.recall'`, `detail` = `{scopes, agent_slugs, result_count, query_hash}`) — the **query hash, never the raw text** (a query can itself carry PII/secrets). Pure-personal self-recall is not ledgered (high-volume, reading your own notebook).

## Consequences

- One additive, dormant migration (`0169` placeholder): `memory_drawer.agent_slug` + an index for the `list_agents` DISTINCT. No table rewrite, no RLS change.
- CLAUDE.md §4 (this repo + the system-level copy) reframes "non-agent" → "non-transcript"; this is the only canon change.
- The companion backend ADR + BE #306–#309 carry the endpoints and the `clients/memory-mcp` server. The read-only pg-MCP is unchanged and co-exists.
- "One governed brain" is realized: Claude Code, Cursor, and the orchestrator write/read the same tables under the same RLS and the same ranker.

### Security impact

A write surface reachable by third-party editors is a new injection + exfil vector. Containment is layered: caller-allowlist (only registered identities reach the endpoints), **personal-scope-only writes** (external clients cannot touch the shared brain or cross the promotion wall), RLS on every read (you recall only what your identity may see), cross-scope recall ledgered with a query *hash*. The bearer is a short-lived Entra token minted per session; no secret is stored on the edge. App roles remain non-BYPASSRLS — the policy, not the connection, is the control.

### Cost impact

Negligible. One column + index; reuse of the existing ranker, `audit_log`, and `withIdentity`. The MCP server is a small Node process running locally on each engineer's machine. No new managed service.

### Operational impact

Live `recall` depends on backend deploy + trigger-sync (#119) and on three sibling tickets (BE #304, LP #300/#176). Until then `store` and `list_agents` work and `recall` returns empty — consistent with the rest of the deploy-dormant pre-go-live system. The MCP launcher is registered per machine in `.mcp.json` next to `postgres`/`graphify`.

## Future considerations

- Promote `agent_slug` to a FK against a first-class agent registry once one exists.
- A backend-in-process write path/contract for autonomous agent diaries (this ADR covers only the external MCP write surface; in-process diary writes ride the existing data layer).
- Re-evaluate the no-fallback recall decision if a useful pre-hydration recall (bronze keyword/recency) is wanted before the embedding deps land.
- `required_group` role-scoping of shared diaries lands with access-spine slice 3a (#979).
