---
adr: 0117
title: "Public technical papers + canonical deep-dive doc set"
status: accepted
date: 2026-06-22
repo: frontend
summary: "Establish two layers of architecture explainer: a canonical per-layer deep-dive set in docs/architecture/deep-dives/ (this repo owns medallion, OKF, and the synthesis; siblings own MWP, MemPalace, Open Brain at fixed paths), and two unauthenticated public papers under public/papers/ (executive summary + long-form research paper) served the same way as /story via a middleware bypass. The deep dives are the single authoritative source; the papers and siblings link to them rather than restating."
tags: [meta, docs, architecture, public-surface]
---

# ADR-0117: Public technical papers + canonical deep-dive doc set

> **Number is a placeholder.** ADR-0117 is claimed at MERGE per system CLAUDE.md §10.3 —
> the branch that merges second renumbers. Latest at authoring is ADR-0116.

| Field | Value |
|---|---|
| **Repo** | frontend (docs hub for the four-repo estate) |
| **Status** | Accepted |
| **Date** | 2026-06-22 |
| **Supersedes** | — |
| **Related** | [ADR-0110](ADR-0110-rebrand-imperion-os.md) (Imperion OS positioning), [ADR-0086](ADR-0086-okf-semantic-layer-over-silver.md), [ADR-0092](ADR-0092-medallion-data-platform-consolidated.md); the canonical argument `docs/architecture/data-design-for-agents.md`; the `/story` precedent (#248) |

## Context

The agentic-OS positioning (ADR-0110) gave the project a thesis — *data-as-kernel +
second-brain-as-OS* — argued in `docs/architecture/data-design-for-agents.md` and the
doctrine. But there were two gaps:

1. **No single authoritative explainer per layer.** The doctrine and data-design docs
   reference the medallion, OKF, ICM/MWP, and the borrowed memory patterns at altitude,
   but a reader (or a sibling repo, or a public reader) had nowhere canonical to go *deep*
   on one layer, and siblings risked each restating the same material (drift).
2. **No public, citable surface.** `/story` (#248) is the only unauthenticated page; it is
   a narrative, not a technical argument. There was nothing to hand a technical reader who
   wants the thesis at altitude or the long-form rationale.

## Decision

Establish **two layers of explainer**, with the deep dives as the single source of truth:

1. **Canonical deep-dive set** under `docs/architecture/deep-dives/` — one authoritative
   markdown explainer per layer, at **fixed paths siblings link to**:
   - `medallion-architecture.md` and `open-knowledge-format.md` — **owned by this repo**
     (it owns the schema + OKF canon, CLAUDE.md §1/§11).
   - `how-it-all-fits-together.md` — the synthesis, **owned by this repo**.
   - `model-workspace-protocol.md` (Backend), `mempalace-memory-architecture.md` +
     `open-brain-second-brain.md` (LocalPipeline) — **owned by their home repo**, linked by
     stable GitHub blob URL; never forked here.
2. **Two public papers** under `public/papers/`, self-contained static HTML in the `/story`
   visual style, **served unauthenticated** via a `papers(?:$|/)` matcher bypass in
   `src/middleware.ts` (same deliberate-public-surface pattern as `/story`):
   - `executive-summary.html` — the thesis at altitude, with a deep-dive quick-link block
     and links to the research paper + synthesis.
   - `research-paper.html` — the long-form rationale for each data-structure decision, with
     real external citations.

The deep dives are the canonical source; the papers and `data-design-for-agents.md` link to
them rather than restating.

## Options considered

- **A. One mega-doc.** Rejected — unmaintainable, and siblings could not own their layer.
- **B. Deep dives only, no public papers.** Rejected — leaves no citable public surface for
  a technical reader; the thesis stays buried in the repo.
- **C. Public papers only, no deep dives.** Rejected — papers would have nothing
  authoritative to link to, and the restatement/drift problem stays unsolved.
- **D (chosen). Deep dives (canonical) + papers (public, linking to them).** Solves both the
  drift problem (one home per layer) and the public-surface gap.

## Consequences

- **Positive.** One authoritative home per layer; siblings link instead of restating; a
  public, unauthenticated technical surface; the docs match the ADR-0110 positioning.
- **Negative / cost.** Two more unauthenticated routes to keep honest; the cross-repo blob
  links can dangle until each sibling lands its deep dive (the paths are fixed and reserved).
- **Maintenance.** The papers and deep dives are docs-as-code; they ride normal docs-gate.
  Status claims in them must stay grounded (e.g. "embeddings not yet generated" while
  vectorization is pending).

## Security impact

Adds one static, data-free public route family (`/papers`) behind an anchored
`papers(?:$|/)` middleware exclusion — no session, data layer, secrets, or PII reachable,
the same guarantee as `/story`. The deep dives and papers are PII-free by construction.
Operational detail: [`docs/operations/public-papers-page.md`](../operations/public-papers-page.md).

## Cost / operational impact

Negligible — static files copied into the App Service bundle by the existing deploy
workflow; no compute, no new dependency.

## Future considerations

- A bare `/papers` landing index + `next.config.mjs` rewrite if more papers are added.
- Vectorizing the deep dives into the gold layer once LocalPipeline #176 lands, so agents
  can retrieve the architecture explainers as RAG context.
