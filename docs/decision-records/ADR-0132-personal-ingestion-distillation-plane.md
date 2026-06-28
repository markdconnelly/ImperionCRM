---
adr: 0132
title: "Personal Ingestion & Distillation Plane — the feed for the Personal Knowledge Store"
status: proposed
date: 2026-06-28
repo: frontend
summary: "The feed half of the OS Brain's personal tier: a COLLECT -> DISTILL -> SYNC -> RECALL loop that turns raw material (browsing, app logs, OneDrive/SharePoint, AI-tool chats, dropped PDFs/Visio) into cleaned, deduped, queryable personal knowledge. Load-bearing principle: MCP is the agent's recall surface, a deterministic SDK pipeline is ingestion. No Sentinel MCP (SCU-billed) — pull via Azure Monitor Query SDK. OneDrive ingests personal-first + flag; SharePoint ingests company-tier. Distillation is a scheduled Claude Code routine on the owner's subscription (ADR-0043 untouched, no company AI key). Records the substrate it feeds (ADR-0114/0116/0115) and the four HARD invariants the build must not violate."
tags: [meta, knowledge-tiers, security]
---

# ADR-0132: Personal Ingestion & Distillation Plane — the feed for the Personal Knowledge Store

> **Number is a placeholder.** ADR-0132 is claimed at MERGE per system CLAUDE.md §10.3 —
> the branch that merges second renumbers. Issue/PR numbers are race-free and used for all
> cross-references; the ADR index is regenerated (`node scripts/adr-index.mjs`) at merge.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-28 |
| **Epic** | #1379 (build record) · parent OS Brain #1318 · tiered knowledge #966 |
| **Cross-references** | ADR-0114 / #1152 (Personal Knowledge Store substrate — Synthesis Store + Curated Vault, **this feeds it**) · ADR-0116 (Memory MCP — the recall + deliberate-capture surface) · ADR-0115 (gold ranker — returns entity_ref + summary, never verbatim) · ADR-0105 / #967 (two-axis RLS access spine + §3c promotion wall — **the wall this plane respects**) · ADR-0041 (Voyage `voyage-3-large`/1024 vector contract) · ADR-0086 / ADR-0113 (OKF + PII boundary — personal tier is OUT of OKF) · ADR-0043 (Claude generation tiers — the front end holds no AI key) · ADR-0042 (four-repo split) |

## Problem

The OS Brain's **personal tier** (the "second brain") already has its *substrate*: the Synthesis
Store (`personal_fact` + Validity Windows, ADR-0114), the Curated Vault (`personal_vault_file`),
the Memory MCP (ADR-0116), the gold ranker (ADR-0115), and the owner/company/data_class RLS
spine (ADR-0105). **What it lacks is the feed** — the loop that turns raw material (research
dumps, vendor PDFs/Visio, OneDrive, browsing, app logs, AI-tool chats) into *cleaned, deduped,
queryable* knowledge the owner uses through Claude Code + Obsidian, and that selectively crosses
into the company brain. The design was settled in a 2026-06-26 `grill-with-docs` session; this
ADR records it so it survives the build (epic #1379), and restates the invariants the children
must not violate.

## Decision

The personal ingestion plane is a four-stage loop, with a single load-bearing architectural
principle separating the two ways an agent touches data.

### Architectural principle — MCP = recall, deterministic SDK = ingestion

**An MCP server is the agent's *recall* surface (ad-hoc, interactive, free); a deterministic SDK
pipeline is *ingestion* (scheduled, bulk, no LLM in the hot path).** Ingestion never tolls an
LLM or an MCP per item — it runs as plain code on a schedule. This keeps the high-volume path
cheap and auditable and reserves model spend for the one place judgment is needed (distillation).

### The loop

```
COLLECT  (LocalPipeline, deterministic, scheduled — no LLM, no MCP toll)
  browsing  -> KQL via Azure Monitor Query SDK (Sentinel data lake) ─┐
  app logs  -> KQL via Azure Monitor Query SDK (Log Analytics)       ┤
  OneDrive  -> Graph /me/drive delta (personal-first + flag)         ┤-> stage raw markdown in
  SharePoint-> Graph delta (company tier)                            ┤   vault/_inbox/ (+ optional
  AI chats  -> Claude Code ~/.claude/**/*.jsonl, Cursor SQLite       ┤   bronze row memory_drawer)
  dumps     -> drop .md/PDF/Visio in Obsidian OR in-app upload       ┘

DISTILL  (scheduled Claude Code routine — the ONLY LLM step; runs on the owner's subscription)
  reads vault/_inbox/ + new uploads
  -> business-relevance gate (discard personal browsing)
  -> extract personal_fact triples + write a CLEAN note to the right vault folder
  -> dedup against existing ("don't redo work"); Visio via vsdx + Mermaid/vision; PDF via extraction
  -> clears _inbox

SYNC  (LocalPipeline, deterministic, bidirectional)
  vault <-> Postgres by content_hash; Obsidian edits re-trigger distill on change
  -> on new/changed notes, enqueue Voyage embedding

RECALL  (Claude Code = the interaction surface)
  primary: Memory MCP recall (Voyage embeddings)   fallback: grep-vault skill (no embeddings needed)
  skills: /brief-me, /meeting-prep, /what-do-i-know-about-X
```

### Settled decisions

| Dimension | Decision |
|---|---|
| **Tier** | Personal-private; primary consumer = the owner's agentic OS (Claude Code), not company agents. |
| **Source of truth** | Postgres = queryable SoT; the Obsidian vault = a bidi-synced, indexed projection. |
| **Vault layout** | `People/ Clients/ Projects/ Topics/ Research/ Daily/ _inbox/`; frontmatter `source, business_relevant, entities[], valid_from, content_hash`. |
| **Sentinel** | **NO Sentinel MCP** — it is SCU-billed per call (Apr 2026). Browsing/app logs are pulled via the **Azure Monitor Query SDK** (deterministic, no per-call SCU). |
| **M365** | Graph **SDK delta** for ingestion; the official Graph/ODSP **MCP** is allowed for ad-hoc *recall* only (free, no SCU). |
| **Source -> tier** | **OneDrive = personal-first + a business flag; SharePoint = company-tier directly.** |
| **Distill runtime** | A scheduled **Claude Code routine on the owner's desktop + Anthropic subscription**, NOT the backend Azure-Function curator. ADR-0043 is untouched — this is a personal tool on the owner's own subscription, not the company app holding an AI key. |
| **Write / promotion** | The routine writes **personal-tier + flag only**. Business-relevant items cross to company tier via a **one-click promote** in the app, through the ADR-0105 §3c human-approved wall. Owner authoring *via the app with their own role* is a direct, authorized company write — not a wall crossing. |
| **Visio** | `vsdx` lib extracts shape text + connectors; Claude renders Mermaid + prose; vision fallback for layout-heavy diagrams. |
| **Embeddings** | Voyage `voyage-3-large`/1024 (ADR-0041). The current `knowledge_embedding = 0` is an **operational gap (unseeded key), not architectural** — seed the key + a small run. A local model is rejected (it would fork the vector contract + ranker). |
| **Company comms** | Read **in place** via RLS (the owner sees the personal + company axes at once) — NOT re-ingested into the personal tier. |

## HARD invariants (no child PR may violate these)

1. **Promotion wall** (ADR-0105 §3c / #967, BE #432 extends BE #379): only the privileged,
   human-approved, append-only-ledgered crossing moves personal -> company. **No autonomous
   agent writes the company tier.**
2. **Memory-MCP `store` is personal-scope-only** (ADR-0116 §4): no cross-owner / NULL-owner
   writes from Claude Code or Cursor.
3. **Three RLS axes fail closed** (owner / company / data_class): privileged actors (the curator
   god-view, the LP vectorizer) stay **non-`BYPASSRLS`** and are intra-owner-write only.
4. **PII / OKF boundary** (ADR-0086 / 0113): personal + verbatim content carries PII and is **OUT
   of OKF**; the ranker returns `entity_ref` + summary, never verbatim; the recall ledger stores
   a query **hash**, not the query text.

## Security impact

The whole plane is owner-scoped personal data and is the most PII-dense surface in the system, so
the four invariants above ARE the security design: a fail-closed three-axis RLS floor, a single
human-approved append-only promotion wall as the only personal->company path, no `BYPASSRLS`
privileged actor, and a PII/OKF boundary that keeps verbatim text out of the semantic layer and
out of recall ledgers (hash only). Secrets (Graph app creds, the Voyage key) live in Key Vault,
referenced by name. The distill routine runs on the owner's own Anthropic subscription, so no
company AI key is introduced (ADR-0043 preserved).

## Cost impact

The MCP-vs-SDK split is a cost decision: bulk ingestion runs as plain scheduled code (no per-item
LLM/MCP toll), and Sentinel is read via the Azure Monitor Query SDK specifically to avoid the
SCU-per-call billing of the Sentinel MCP. The only metered LLM spend is the single distillation
step, on the owner's personal subscription. Voyage embedding cost is bounded by the change-driven
sync (only new/changed notes are enqueued).

## Operational impact

Distillation is a scheduled Claude Code routine on the owner's desktop — its availability is tied
to that machine, and the `_inbox` staging design makes the loop restartable (raw material waits
in `_inbox` until the next run; SYNC reconciles by `content_hash`, so re-runs are idempotent).
The critical path for activation is: **seed the Voyage key + a small vectorize run** (unblocks
recall) -> personal capture schema (#1381) -> vault sync engine (LP #388) + `_inbox` collectors
(LP #385/#386/#387) -> distill routine (#1384) -> app upload + promote-queue (#1382/#1383) with
the BE landing/promotion endpoints (BE #432/#433).

## Future considerations

- Per-source confidence/lineage on `personal_fact` once multiple collectors overlap.
- Promotion heuristics (suggesting candidates for the one-click wall) — still human-gated.
- Extending the AI-tool chat collectors beyond Claude Code + Cursor as the owner adopts new tools.
- Revisiting the local-embedding rejection only if the Voyage vector contract (ADR-0041) itself
  changes (which is its own ADR).
