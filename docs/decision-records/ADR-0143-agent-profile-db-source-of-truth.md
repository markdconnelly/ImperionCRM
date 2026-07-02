---
adr: 0143
title: "Agent profile: database is source of truth; ICM reflects"
status: proposed
date: 2026-07-01
repo: frontend
summary: "Make the full agent profile — including the persona NARRATIVE — database-authoritative, inverting the factory's git-SoT authoring model for persona content. New tables: agent_profile (agent_key PK, display_name, role_title, division, reports_to, status, priority_rank, human_counterpart, avatar bytea + avatar_mime, version, valid_from, content_hash), agent_persona_section (agent_key, section_key, ordinal, body_md — section keys identity_mandate / origin_character / how_you_work / voice_tone / behavioral_guardrails / boundaries, mirroring today's icm persona sections), and procedure_human_owner (procedure-scoped responsible human + approver set; feeds the Teams @mentions + approver validation + reject-task assignment; relates #1607). One-time seed import icm→DB; thereafter DB edits (admin GUI) regenerate icm persona files + SOP frontmatter (human_owner) + org.yaml human map as bot PRs — generated blocks never hand-edited. A drift detector (CI gate + scheduled) compares DB ↔ ICM reflection ↔ OKF concept files and flags 'ICM dated'/'OKF dated'; DB wins. Persona sections are vectorized by LP into the brain (MemPalace/Open Brain). Avatars are served via a public unauthenticated route /api/public/agent-avatar/[agent_key] (required for Teams card images; initials fallback). New tables join the web-role write allowlist (ADR-0127). Trade-off recorded honestly: inverts git-SoT for persona content; chosen for GUI editability + brain retrievability + single authority; mitigation = generated reflection PRs keep git history + review visibility."
tags: [agents, persona, data, governance]
---

# ADR-0143: Agent profile — database is source of truth; ICM reflects

> Number **0143** claimed at merge per system CLAUDE.md §10.3 / [ADR-0084](./ADR-0084-merge-time-number-assignment.md)
> (authored against a placeholder, renumbered at merge alongside its companions ADR-0141/ADR-0142).
> Docs-only ADR; the schema it specifies is claimed as a migration number in FE #1832.

| Field | Value |
|---|---|
| **Repo** | frontend (owns the schema + the ICM factory + the OKF bundle, ADR-0042). **LocalPipeline** consumes it for vectorization (ImperionCRM_LocalPipelineEnrichment#455) |
| **Status** | Proposed |
| **Date** | 2026-07-01 |
| **Issue** | #1832 (schema), #1833 (seed), #1839 (reflection + drift), epic #1829 |
| **Amends** | [ADR-0135](./ADR-0135-persona-schema-and-three-matrix-org.md) (persona schema + org SoT — the 7-section persona `.md` and `org.yaml` human map become a **reflection** of DB truth for the fields captured here, not the origin) |
| **Companion** | [ADR-0141](./ADR-0141-per-procedure-autonomy-dial-only-dial.md) (per-procedure dial), [ADR-0142](./ADR-0142-teams-human-gate-rail.md) (the rail that consumes `procedure_human_owner` + the avatar) |
| **Cross-references** | [ADR-0127](./ADR-0127-web-role-least-privilege-write-allowlist.md) (new tables join the write allowlist), [ADR-0086](./ADR-0086-okf-semantic-layer-over-silver.md) (OKF concept files — the third leg of the drift check), [ADR-0041](./ADR-0041-gold-knowledge-vector-store.md) (Voyage `voyage-3-large` @1024d vector contract for the persona embeddings), [ADR-0133](./ADR-0133-operating-procedure-catalog.md) (the procedure the human-owner is scoped to), [ADR-0042](./ADR-0042-division-of-labor-reads-direct-processes-backend.md) (schema ownership; ALL vectorization is LP's) |

## Problem

The Agent GUI rework wants agent profiles — identity, org placement, avatar, **and the persona narrative** — to be **editable in the admin GUI**, **retrievable by agents from the brain**, and to have **one unambiguous authority**. Today the persona is a git file under `icm/` authored by the factory (ADR-0135): great for review and history, but it is not GUI-editable, not directly brain-retrievable, and it competes for authority with any DB copy the GUI would need. We must decide **where agent-profile truth lives**, knowing that whichever we pick, the *other* representation has to stay in sync.

## Context

- **ADR-0135 already defines the persona schema** — a 7-section persona `.md` per agent + `org.yaml` as the org SoT. This ADR does not discard that shape; it **moves the authority** for the fields the GUI edits into the DB and makes the `icm/` files a **generated reflection** of it.
- **The GUI needs to write persona content** (the profile page, #1835) — a git file is not a write target for an admin surface.
- **Agents need to retrieve persona narrative from the brain** — the recall path reads embeddings, and **all vectorization is LocalPipeline's** (four-repo contract §1, ADR-0042). A DB row is the natural embedding source.
- **The Teams rail (ADR-0142) needs an approver set and an avatar image** — `procedure_human_owner` (the approver set) and a **public avatar route** (Teams card image fetch is unauthenticated) are both required, and both are naturally DB-backed.
- **`org.yaml` human nodes / agent→human map already exist as work** (#1607); the `human_counterpart` on `agent_profile` and the generated `org.yaml` human map align with it.
- **The OKF bundle** (ADR-0086) carries the curated *meaning* of entities; where a persona and an OKF concept overlap, the drift check must include OKF as a third leg.

## Options considered

1. **Keep git as SoT; GUI is read-only over `icm/`** (rejected). Preserves the factory model but fails the core ask — no GUI editing, no direct brain retrieval, and the admin can't change a persona without a code PR.
2. **DB and git dual-authoritative** (rejected). Two writable authorities guarantee drift and an unresolvable "which wins" — the exact failure mode the autonomy-dial consolidation (ADR-0141) is removing elsewhere.
3. **DB is SoT; `icm/` + SOP frontmatter + `org.yaml` are a generated reflection; a drift detector keeps them honest with DB winning** (chosen). One authority (DB), GUI-editable, brain-retrievable; git keeps history + review via **generated reflection PRs**.

### Tradeoffs

This **inverts the factory's git-SoT authoring model for persona content** — a real and deliberate reversal of ADR-0135's "persona prose is authored in `icm/`." We accept it because the three requirements (GUI editability, brain retrievability, single authority) all point at the DB, and dual-authority (Option 2) is worse. The honest costs: (a) persona edits no longer *originate* in a reviewed PR — mitigated by the **reflection job emitting a bot PR** so every DB edit still lands in git history with review visibility; (b) generated blocks must **never be hand-edited** — enforced by the drift detector's CI gate; (c) two more representations to keep in sync (ICM + OKF) — addressed by the `content_hash`-based drift detector with a clear "DB wins" rule. Note this inverts authority **for persona content specifically**; the autonomy dial (ADR-0141) and capabilities (`agent.yaml`) are governed by their own ADRs.

## Decision

### D1 — DB-authoritative profile tables

Three new app-native tables (FE #1832; migration number claimed at merge):

- **`agent_profile`** — `agent_key` PK, `display_name`, `role_title`, `division`, `reports_to`, `status`, `priority_rank`, `human_counterpart`, `avatar` `bytea`, `avatar_mime`, `version`, `valid_from`, `content_hash`.
- **`agent_persona_section`** — (`agent_key`, `section_key`, `ordinal`, `body_md`); the section keys are **`identity_mandate` · `origin_character` · `how_you_work` · `voice_tone` · `behavioral_guardrails` · `boundaries`**, mirroring the ADR-0135 persona sections so a persona `.md` reconstructs losslessly from rows.
- **`procedure_human_owner`** — the procedure-scoped **responsible human + approver set**. Feeds the Teams @mentions, the ADR-0142 verdict-side authorization, and the reject-task assignee. Relates #1607 (org.yaml human nodes + agent→human map; humans exist as `icm/employees/*.md` bios).

These are the **source of truth**.

### D2 — One-time seed, then DB edits regenerate ICM as bot PRs

- A **one-time importer** (FE #1833) reads `icm/` and hydrates D1 (26 personas, org structure, procedure rows default-disabled per ADR-0141).
- Thereafter **DB edits (admin GUI) are authoritative**; a **sync job regenerates** the ICM reflection — the `icm/` **persona files**, the **SOP `human_owner` frontmatter**, and the **`org.yaml` human map** — as **bot PRs** (FE #1839). **Generated blocks are marked and never hand-edited.**

### D3 — Drift detector, DB wins

A **drift detector** (a **CI gate** + a **scheduled** run, FE #1839) compares **DB ↔ ICM reflection ↔ OKF concept files** (via `content_hash`). On a mismatch it raises a **drift flag** — **"ICM dated"** or **"OKF dated"** — and **DB wins** (the flagged side is regenerated/updated, never the DB). A PR that hand-edits a generated block fails the gate.

### D4 — Personas vectorized into the brain (LocalPipeline)

`agent_persona_section` rows are **vectorized by LocalPipeline** into the brain (MemPalace / Open Brain), pg-retrievable by agents, using **Voyage `voyage-3-large` @ 1024d** (ADR-0041). All vectorization is LP's (ADR-0042 §1); re-embed is keyed off `content_hash`. (ImperionCRM_LocalPipelineEnrichment#455.)

### D5 — Public avatar route

Avatars are served via a **public, unauthenticated** route **`/api/public/agent-avatar/[agent_key]`** (FE #1838) — **required** because a Teams adaptive-card image fetch (ADR-0142) carries no session. The route serves **image bytes only** (no other profile field, no PII); an **initials fallback** covers agents without an avatar.

### D6 — Least-privilege grants

The new tables join the **web-role write allowlist** (ADR-0127 least-privilege pattern) — the web role gets exactly the writes the admin GUI needs (profile/persona/avatar/human-owner), not a blanket grant; the backend gets the reads/writes its dispatch + verdict paths need.

## Consequences

### Security impact

- **One authority.** DB-SoT removes the dual-authority drift/ambiguity for persona content; the drift detector's "DB wins" rule (D3) makes reconciliation deterministic.
- **Public route is minimal.** The avatar route exposes only image bytes for a key (D5) — a deliberately tiny public surface; a security review must confirm no PII leaks through it (the profile page and persona narrative stay behind auth).
- **Least privilege preserved.** New tables follow the ADR-0127 allowlist (D6); no blanket grants (the CI guard that bans them still applies).
- **Review visibility retained despite the inversion.** Persona edits still land in git via bot PRs (D2), so the audit trail and human review of persona *changes* survive the move off git-SoT.
- **No secrets/PII in embeddings.** The vectorized text is persona narrative only (D4) — no client data, no secrets.

### Cost impact

- **Embeddings.** Persona sections add a small, bounded corpus to the LP vectorization run (Voyage, ADR-0041) — 26 agents × 6 sections, re-embedded only on `content_hash` change. Negligible.
- **Storage.** Avatar `bytea` in `agent_profile` — small; no blob service needed for v1.

### Operational impact

- **FE:** the migration (#1832) adds the three tables + allowlist grants; the seed importer (#1833); the profile page write path (#1835); the public avatar route (#1838); the reflection job + drift detector (#1839).
- **ICM:** persona `.md`, SOP `human_owner` frontmatter, and the `org.yaml` human map become **generated reflections**; contributors edit the DB (GUI), not the files. This is the notable process change for anyone used to editing personas in `icm/` — coordinate with in-flight factory PRs so a reflection PR does not collide with hand-authored capability changes.
- **LocalPipeline (cross-repo, ADR-0042):** persona vectorization (ImperionCRM_LocalPipelineEnrichment#455).
- **OKF (ADR-0086):** where a persona overlaps an OKF concept, the drift detector includes it; the "OKF dated" flag routes a concept-file refresh.
- **CONTEXT.md** gains *Agent Profile · ICM Reflection · Drift Flag*.

## Future considerations

- **Versioned persona history in-DB** — `version`/`valid_from`/`content_hash` are present for a future temporal/SCD view of persona evolution; v1 uses them for drift + the bot-PR diff, not a full history UI.
- **Structured technical-limitations register** — ADR-0135's README-linked technical-limitation doc could later become DB-structured alongside these tables.
- **Human bios into the same model** — `icm/employees/*.md` (#1607) could follow the same DB-SoT + reflection pattern once the agent side proves out; out of scope here.
