---
adr: 0114
title: "Personal Knowledge Store data model — two-substrate synthesis + curated vault"
status: proposed
date: 2026-06-21
repo: frontend
summary: "The personal tier is two substrates: a Postgres Synthesis Store (immutable Captures -> temporal-KG Knowledge Facts with Validity Windows -> pgvector embeddings) and a blob Curated Vault (an agent-curated markdown filesystem the owner reviews). A background Personal Curator with ledgered god-view keeps them bidirectionally synced and hunts Knowledge Contradictions for owner approval. Inverts the original 'bronze-in-blob' framing; amends ADR-0105 (curator god-view)."
tags: [meta, knowledge-tiers, security]
---

# ADR-0114: Personal Knowledge Store data model — two-substrate synthesis + curated vault

> **Number is a placeholder.** ADR-0114 is claimed at MERGE per system CLAUDE.md §10.3 —
> the branch that merges second renumbers. Migrations referenced here are authored against
> `0NNN_*` placeholders and numbered last.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-21 |
| **Epic** | #1152 (build) · #966 (tiered knowledge) · #968 (design of record) |
| **Cross-references** | ADR-0105 (two-axis RLS access spine — **amended here**) · ADR-0041/0102 (Voyage vector contract) · ADR-0086 (OKF — personal is excluded) · ADR-0042 (four-repo split) · ADR-0111 (agent event substrate) · ADR-0043 (Claude generation tiers) |

## Problem

The tiered-knowledge architecture (#966) needs a **personal tier** — a per-employee,
owner-scoped "second brain." The access spine (ADR-0105) supplies the owner-axis RLS floor and
a single pilot table (`personal_note`), but #968 left the actual storage shape as a design
sketch whose load-bearing decisions were unresolved: where verbatim content lives, who
vectorizes it, how the temporal knowledge graph is shaped, and how an autonomous curator reads
owner-private data without becoming a silent superuser. This ADR records the decisions reached
in the 2026-06-21 `grill-with-docs` session so the model is buildable.

## Decision

The Personal Knowledge Store is **two substrates with distinct jobs**, not the single medallion
the original #968 sketch implied.

### 1. Two substrates (inverts "bronze-in-blob")

- **Synthesis Store (Postgres)** is the system of record and the queryable/retrievable half:
  immutable **Captures** → synthesized **Knowledge Facts** (a temporal knowledge graph) →
  **pgvector** embeddings. OpenBrain-style — Postgres is where data is *synthesized*.
- **Curated Vault (Azure Blob container per owner + a local synced folder — see §8)** is a **markdown-only filesystem**, agent-curated and human-reviewable
  — the navigable "memory palace" the owner reads and edits, and a fast context-load for the
  Jarvis orchestrator. Binary artifacts (images/audio) land here with a routing record into
  Distillation.

> #968 originally said *"bronze = verbatim drawer in Azure blob."* That is **superseded**: blob
> holds the *curated* projection (markdown) + binaries, **not** raw bronze. Raw verbatim text is
> a Postgres **Capture**. The inversion is deliberate — the owner-scoping privacy contract is
> Postgres RLS (ADR-0105), and re-implementing it on blob (SAS prefixes) for the most sensitive
> tier would be a second enforcement mechanism on the data that least tolerates a gap.

### 2. Immutable Capture layer + admin purge

Raw input persists verbatim and immutable — text inline in Postgres, binaries in blob with a
routing record. It is the audit floor and the re-synthesis source (so improved extraction can
re-run). The only mutation is an explicit, audited **admin purge** of garbage.

### 3. Temporal knowledge graph, day-one

Synthesis produces **Knowledge Facts** — entity–relation–object triples carrying a **Validity
Window** (`valid_from`/`valid_to`) with `add` / `invalidate` / `timeline` operations. Facts
*expire* rather than silently going stale: "freshness = correctness" becomes data. Built in full
from the start (not deferred), per Mark.

### 4. Multi-level Distillation

Each Capture (and each upload) is distilled into **several resolution levels** — literal
(verbatim) → summary → meaning (Knowledge Facts). The Curated Vault presents the distilled,
*current* state; stale levels flush as their Validity Windows close. Drill from summary to
verbatim on demand (the only worthwhile half of MemPalace's "AAAK" two-level shape; its lossy
dialect is rejected, ADR/#968).

### 5. Bidirectional, agent-mediated sync — the Personal Curator

A background **Personal Curator** keeps the substrates in sync **both ways**: it projects
Synthesis → Vault markdown, and ingests blob-first / human-edited markdown back into
Captures+Facts. It **hunts Knowledge Contradictions** (between substrates, or new-vs-existing
fact) and surfaces them for the **owner's approval** — never auto-resolved. The Curator runs
intra-owner and **never crosses the personal→company wall** (that is the separate ADR-0105 §3c
promoter).

### 6. Structural scoping = Room Path (path mirror)

Wing (person/project) → room (topic) → drawer (content) is expressed as the **Vault folder
tree**; Postgres mirrors it with a **`room_path`** column, and scoped retrieval is a path-prefix
filter. No first-class wing/room tables. This was verified against the actual **MemPalace**
implementation (the `mempalace/mempalace` repo): it backs its temporal ER graph with SQLite, its
verbatim as files, and treats wings/rooms/drawers as *scoping metadata over the graph + vectors*
— it does **not** make rooms a first-class container schema either. Promote `room` to a table
only if a real driver (per-room ACL/metadata/ordering) appears.

### 7. LP vectorizes personal (keeps system §1)

Voyage `voyage-3-large` @ 1024 dims (ADR-0041). Personal embeddings ride the existing on-prem
**LocalPipeline** vectorization path like everything else — one vectorization owner, no §1
exception. Synthesis and embedding **coordinate through a DB state column** (`embed_state`):
the FE/curator enqueues `pending`, LP drains and flips to `embedded`. No direct FE/BE→LP call.

### 8. Vault substrate — Azure Blob container per employee + a local synced folder (no server)

The Curated Vault cloud substrate is an **Azure Blob container per employee** (stable slug, e.g.
`vault-mark`) holding the markdown filesystem. The owner interacts with it through a **real local
folder on their own machine, mirrored to the container over HTTPS** — *not* a mounted network drive.
Decided 2026-06-21 (Mark): there is **no on-prem server**, which rules out both a directly-mounted
Azure Files SMB share (residential ISPs block SMB port 445) and Azure File Sync (its agent requires
Windows Server). An earlier draft of this section chose Azure Files + native mount; that is
**superseded** by this no-server design.

- **Per-employee container = the owner boundary.** One container per owner; **rooms are blob path
  prefixes** within it (`projects/imperion-os/decisions.md` = the Room Path) — Blob's virtual
  directories. The container is the blob-layer mirror of the Postgres owner axis.
- **Local editing = a synced folder.** The owner edits a real local folder in Obsidian/VS Code
  (native, **offline-capable** — local files exist offline, sync when connectivity returns). A
  sync mirrors it to the `vault-<owner>` container over **HTTPS (443)** — no SMB, no port 445, no
  VPN, no server.
- **The sync + capture arm is LocalPipeline**, which already runs on the owner's machine as
  `svc-imperion`: it watches the local folder, pushes to Blob, and enqueues Captures. `rclone
  bisync <local> vault-<owner>:` is the quick-start before LP owns it. (For employees who do not
  run LP locally, the vault is reachable via the app's web view; a personal sync client is
  optional.)
- **Identity-based access (not a shared key):** Entra ID + per-container RBAC
  (`Storage Blob Data Contributor` scoped to `vault-<owner>`), so the owner gets direct scoped
  access to their **own** container; agent/cross-owner access stays backend-mediated.
- **Storage-path columns** (`personal_capture.blob_ref`, `personal_vault_file.blob_ref`) carry the
  **blob path** within the owner's container.
- **Event-driven sync.** Blob's **Event Grid** gives the Personal Curator first-class
  `BlobCreated`/`BlobDeleted` events, so human edits are detected on arrival (no polling). The
  `personal_vault_file.content_hash` column remains the idempotency/diff key, not the change trigger.

This is the original Option B from the design discussion, re-selected once the server-dependent
mount paths were ruled out. It trades the literal drive-letter for a synced folder that edits
identically, and in return removes all networking prerequisites and restores event-driven change
detection.

## Amendment to ADR-0105 — the Personal Curator god-view

ADR-0105 §3 anticipated a curation identity but scoped it to the **cross-wall** promoter (which
"never impersonates / never sets `app.user_id`"). The Personal Curator is a **different actor**:
it stays **intra-owner**, so it needs broad owner-scoped read+write over the personal tier to do
its synthesis/projection job. Resolution (Mark): the Curator is a **background process with
god-view over the personal tier**, implemented as:

- a **permissive RLS policy** on each personal table for the curator service role — **NOT
  `BYPASSRLS`** — so its reach is visible in `pg_policies` (same choice ADR-0105 §3b made for the
  admin god-view);
- **personal-tier only** (no company tables);
- **every god-view action ledgered** to an append-only `personal_curation_event` row;
- a non-`BYPASSRLS` managed-identity→Postgres login (FE owns the role + policies + ledger schema;
  the backend owns the runtime).

The LP vectorization role gets the **same concession** (elevated personal read to embed across
owners), under the same non-`BYPASSRLS` + ledgered constraints. The owner-scoping invariant
survives because both actors only ever write back to the **same** `owner_user_id` they read —
they never re-scope a row to another owner.

This is the deliberate trade: a privileged autonomous curator is the price of a self-maintaining
personal brain. It is contained by *visible* (non-bypass) policies, an append-only ledger, the
personal-tier-only blast radius, and the intra-owner write invariant — not by pretending the
autonomous actor can run as each user.

## Options considered

- **Single medallion, bronze-in-blob (original #968).** Rejected: puts the most sensitive tier's
  privacy on a second enforcement mechanism (blob SAS) and makes the human-facing vault and the
  raw bronze the same artifact, which they are not.
- **Vault authoritative with sync-back / split-authority-by-zone.** Folded into the chosen
  bidirectional model: both substrates can originate change, reconciled by the Curator with
  human-approved contradiction resolution — simpler to reason about than per-zone authority.
- **First-class wing/room tables / KG-node rooms.** Rejected for v1: duplicates the room
  definition the Vault folder tree already owns (a self-inflicted sync burden), and MemPalace
  itself doesn't do it.
- **Backend embeds personal (drop §1 for personal).** Rejected by Mark: keep one vectorization
  owner (LP); coordinate via `embed_state`.

## Consequences

### Security impact

Owner-scoped privacy is the ADR-0105 owner axis (already merged, dormant) extended to every new
personal table. The new privileged actors (Personal Curator, LP vectorizer) are the main added
surface; they are contained by non-`BYPASSRLS` visible policies + append-only ledger +
personal-tier-only scope + the intra-owner write invariant. Personal data flows to the on-prem LP
host for embedding — accepted; it is the same trust boundary that already does all vectorization.
Personal tier stays **out of the OKF canon** (ADR-0086 PII rule): no concept files; personal
answers resolve against the live owner-scoped store.

### Cost impact

Negligible incremental — reuses the existing Postgres + pgvector + blob + LP vectorization
infrastructure. No new services.

### Operational impact

Schema lands in this repo (§1), one migration per slice, Mark-gated per prod apply, each in its
own worktree (§10). Build order: A1 Capture → A2 Knowledge Fact/Validity Window → A3 embeddings +
semantic retrieval (ranker L1) → A4 vault-sync + curator policy + ledger + contradiction table;
then backend curator/Distillation runtime (BE #302) and LP vectorization (LP #298). Ranker layers
2–5, the ingestion connectors, and the personal→company promotion path are Slice B+.

## Future considerations

- **Ranker** is incremental (#968): semantic (L1) ships alone; FTS boost → temporal-proximity →
  preference-pattern → optional LLM rerank are added layer-by-layer, stopping when retrieval is
  good enough for the six day-one brains. No promise of MemPalace's benchmark number on messy
  multi-source prod data.
- **Promotion path personal→company** (ADR-0105 §3c) is built last, behind the human-approval
  gate, with its own backend ADR — it is the only actor that crosses the wall.
- **Concurrent edit conflicts** (human edits a Vault file while the Curator projects into it) are
  reconciled through the same Knowledge Contradiction flow; a tighter locking model is deferred
  until observed.
- Vault **binary routing** (vision/OCR for images) is a Distillation concern, deferred to Slice B+.
