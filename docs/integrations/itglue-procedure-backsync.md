# IT Glue back-sync for realized procedure documents — design note

**Status:** decided (design / path selection — not a build). **Issue:** #1615 (epic #1534).
**Cites:** ADR-0133 (Operating Procedure catalog) · ADR-0134 (policy dual-audience) · ADR-0136
(Workflow Doctrine A8 — one uniform dual-audience document) · system CLAUDE.md §1 (IT Glue = the
LocalPipelineEnrichment hub).

## The problem

The Workflow Doctrine (ADR-0136 A8) makes every realized Operating Procedure **one uniform,
dual-audience document** — the same artifact a human trains on and an agent executes from. IT Glue
is the human-facing knowledge system of record for client/internal ops, and **Alivia** (Knowledge /
Doc-Hygiene) owns doc-sync. We had **no decided mechanism** for pushing procedure documents *into*
IT Glue. This note picks the path and files the build issue; it does **not** build the connector.

## Decision

**One-way push, procedure → IT Glue, via the LocalPipeline IT Glue hub, as an IT Glue Document
keyed by a stable external reference, with a thin Flexible Asset for cross-linking (deferred).**

1. **Direction — one-way (procedure → IT Glue), authoritative upstream.** The uniform procedure
   document in the repo (`docs/workflows/streams/*` outline + the realized ICM Workspace, #1616) is
   the source of record. IT Glue is a **projection** for human consumption. **No round-trip edits**
   — an IT Glue-side edit is overwritten on the next push (IT Glue is not an authoring surface for
   procedures). If humans need to annotate, that is a separate IT Glue object, not the synced doc.

2. **IT Glue surface — Documents (primary), Flexible Asset (deferred).**
   - The human-readable rendering of the uniform document → an IT Glue **Document** (rich-text /
     markdown runbook). This is the priority: it makes the procedure a real human runbook in the
     tool techs already live in.
   - A thin IT Glue **Flexible Asset** carrying the structured metadata (owner agent · stream ·
     autonomy ceiling · realization status · linked client/CI) is **deferred** to a second slice —
     it makes procedures queryable and linkable to client/CI assets, but the Document is the MVP.
   - **Not** Runbooks (Kaseya/IT-Glue "Runbooks" are a narrower automation object; the dual-audience
     prose fits Documents better).

3. **Idempotency + mapping.** Each procedure maps to exactly one IT Glue Document via a stable
   **external reference = the procedure id** (e.g. `OP-06-03`). The push is upsert-by-external-ref
   (create on first sync, update in place after) — never a duplicate document per run. Org-scoped
   (Imperion's own IT Glue org for internal procedures; per-client only if/when a procedure is
   client-specific — most are internal).

4. **Trigger — re-push on source change.** A re-push fires when (a) the uniform procedure document
   changes (a git change to the procedure's authored doc / realized workspace), or (b) a realization
   change (the procedure graduates / its autonomy dial or owner changes). Cadence: ride the existing
   LocalPipeline IT Glue scheduled sync (no new trigger infrastructure in v1); a content hash gates
   "changed since last push" so unchanged procedures are skipped (no churn).

5. **Ownership split (cross-repo, the §1 contract).**
   - **Alivia domain (this repo, `icm/` + `docs/`)** owns **what** is canonical and **when** it is
     ready to publish — the uniform document is authored and graduated here; the doc-hygiene
     procedure decides a procedure is publish-ready.
   - **LocalPipelineEnrichment (the IT Glue hub)** owns the **push mechanics** — the IT Glue API
     client, auth (Key Vault, never inline — ADR-0060), rate/permission handling, the
     upsert-by-external-ref, and the content-hash skip. **A sibling LP build issue carries the
     connector** (filed below).

## Rate / permission / auth notes (for the LP build)

- IT Glue API auth is an API key in Key Vault (LP secret-resolution pattern) — **never inline, never
  in this repo**. Least-privilege key (Documents write scope for the target org).
- IT Glue API is rate-limited (per-key throttle) — the push batches + backs off; the content-hash
  skip keeps the working set small (only changed procedures).
- No client PII / no secrets in a synced procedure document (procedures are PII-free per ADR-0133 /
  ADR-0086 conformance) — the push inherits that invariant; a procedure that somehow references
  client specifics is a procedure-authoring defect, caught upstream, not pushed.

## Out of scope (this note)

Building the connector; the Flexible Asset schema; per-client procedure variants; bidirectional
sync (explicitly rejected — one-way only).

## Acceptance (this issue)

- [x] IT Glue write-back path selected (Documents primary, Flexible Asset deferred, one-way, upsert
      by procedure-id external ref, content-hash-gated re-push on the LP scheduled sync).
- [ ] LP build issue filed (the connector) — see below.

## Filed build issue

LocalPipelineEnrichment build issue: **"IT Glue procedure-document push (Alivia back-sync)"** —
implements §3–§4 above (Documents API client, upsert-by-procedure-id, content-hash skip, KV auth),
consuming the uniform documents this repo publishes. (Filed in `ImperionCRM_LocalPipelineEnrichment`;
referenced from #1615.)
