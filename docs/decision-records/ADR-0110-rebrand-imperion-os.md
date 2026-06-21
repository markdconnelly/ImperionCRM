---
adr: 0110
title: "Rebrand product to Imperion OS; identity names remain ImperionCRM*"
status: accepted
date: 2026-06-21
repo: frontend
summary: "Rename the product in all prose to Imperion OS — the agentic operating system for an MSP — retiring 'Imperion Business Manager' and 'Imperion CRM' as product names. Record the canonical positioning: data-as-kernel + second-brain-as-OS, argued in docs/architecture/data-design-for-agents.md. All identity-bearing names are explicitly OUT of scope and unchanged: repo slug ImperionCRM, package imperion-crm, Entra app names, database names, and *.azurewebsites.net URLs (a rename of those is Mark-gated, ADR-0016)."
tags: [meta, product, branding]
---

# ADR-0110: Rebrand product to Imperion OS; identity names remain ImperionCRM*

> **Number is a placeholder.** ADR-0110 is claimed at MERGE per system CLAUDE.md §10.3 —
> the branch that merges second renumbers. Latest at authoring is ADR-0109.

| Field | Value |
|---|---|
| **Repo** | frontend (docs hub for the four-repo estate) |
| **Status** | Accepted |
| **Date** | 2026-06-21 |
| **Epic** | #1020 |
| **Relates to** | ADR-0016 (identity/app naming — slug/package out of scope), ADR-0086 / ADR-0104 (OKF grounding cortex), ADR-0092 (medallion), ADR-0105 (RLS spine), ADR-0109 / ADR-0107 / ADR-0106 (autonomy / action-grant / eval) |
| **Companion** | [`docs/architecture/data-design-for-agents.md`](../architecture/data-design-for-agents.md) |

## Problem

The product carries **three names** — "Imperion Business Manager", "Imperion CRM", and the
repo slug "ImperionCRM" — and the docs lead with "Imperion Business Manager", a name that
undersells what the system became. A 2026-06 deep-research pass on the state of the art in
agentic memory / second-brain / context-engineering found that the patterns that literature
advocates for agent memory — tiered, provenanced, semantically-grounded, citation-backed,
identity-scoped — were **already substantially built here** via the medallion data platform,
the OKF semantic layer, and the gold/Voyage vector tier, and that the remaining gap was
closed by the knowledge tiers (#966/#967/#968), the two-axis RLS access spine (ADR-0105),
the 1–5 autonomy dial + approval cockpit (ADR-0109), the eval/quality plane (ADR-0106), the
deny-by-default action/tool-grant plane (ADR-0107), the event/trigger substrate (#991), and
the OKF grounding cortex (ADR-0104).

In other words: the system is an **operating system for AI agents over a company's knowledge
and actions**, and the naming and positioning did not yet say so. We also do not want to pay
the cost and risk of renaming identity-bearing artifacts (the repo, the package, the Entra
apps, the databases, the live URLs) just to fix the *product* name.

## Context

- **Identity names are load-bearing and expensive to change.** ADR-0016 settled that the
  repo slug `ImperionCRM`, the `package.json` name `imperion-crm`, the Entra application
  names, the database names, and the `*.azurewebsites.net` URLs are out of scope to rename —
  doing so touches deploys, OAuth registrations, DNS, and CI, and is a Mark-gated operation.
- **The positioning already exists in prose** — the capability overview's "why we build it
  this way" section and the data & automation doctrine already argue the substrate-first,
  agent-first thesis. This ADR names it and points at the canonical doc rather than inventing
  new reasoning.
- **One canonical home for the argument.** Per the docs-hub role (this repo, CLAUDE.md §1),
  the "why our data design is superior for agentic workloads" case lives in **one** doc and
  the sibling repos + the `/story` page link it — never restating it (the canon-ownership
  pattern used for the security standard and the OKF bundle).

## Options considered

1. **Status quo** — keep "Imperion Business Manager"; leave three names in play.
2. **Full rename including identity names** — rename the repo, package, Entra apps, DBs, URLs
   to an `ImperionOS*` family as well.
3. **Prose-only rename to "Imperion OS"; identity names frozen** — product name and all
   human-facing docs become Imperion OS; identity-bearing names stay `ImperionCRM*`.
   (Chosen.)

### Tradeoffs

| Option | Pro | Con |
|---|---|---|
| 1 Status quo | zero work | three competing names; positioning undersells the product; no canonical agentic-OS argument |
| 2 Full rename | perfectly consistent | high-risk, Mark-gated: touches deploys, OAuth, DNS, CI, DB; reverses ADR-0016 for cosmetic gain |
| 3 Prose-only + frozen identity | captures the positioning win at doc cost only; preserves ADR-0016; zero runtime risk | a documented split between product name (Imperion OS) and identity names (ImperionCRM*) that authors must understand |

## Decision

**Adopt Option 3.**

### D1 — Product name is Imperion OS
"**Imperion OS** — the agentic operating system for an MSP" is the product name in all prose:
README, the product overview, CLAUDE.md, architecture docs, and the public `/story` page.
"Imperion Business Manager" and "Imperion CRM" are **retired as product names** (they may
appear once, historically, as "formerly known as").

### D2 — Identity names are frozen and unchanged
The repo slug `ImperionCRM`, the package `imperion-crm`, the Entra application names, the
database names, and the `*.azurewebsites.net` URLs are **explicitly unchanged** (ADR-0016).
A future rename of any of these remains a separate, Mark-gated decision. Docs that must name
an identity artifact use its real name and may note "(legacy slug)".

### D3 — Canonical positioning: data-as-kernel + second-brain-as-OS
The settled framing is that Imperion OS is an operating system for agents:

- **Kernel** = the medallion data platform (filesystem) + OKF semantic layer (type system /
  grounding cortex) + gold/Voyage `voyage-3-large` @ 1024d vectors (addressable long-term
  memory) + the two-axis RLS access spine (ring/permission model).
- **Memory (second brain)** = tiered knowledge (canon · company · personal ×6) under
  two-axis RLS — the agent's memory hierarchy.
- **Scheduler / syscalls** = the backend orchestrator + sub-agents, ICM, the autonomy dial
  (1–5 / L0–L3), the `agent_run`/`agent_message` ledger, the eval/quality plane, the
  deny-by-default action/tool-grant plane, and the event/trigger substrate.
- **Processes** = the 5-tier agent roster. **I/O** = Pipeline (sensory ingest) +
  LocalPipeline (consolidation/vectorization — the hippocampus). **Protected mode** = the
  autonomy dial + approval cockpit + Mark-gates.
- One refinement DNA at three altitudes: medallion refines **data**, OKF/IKF refines
  **meaning**, ICM refines **action**.

The full argument — and the superiority case versus an LLM + RAG bolted onto a human-form
CRM schema — is the canonical doc
[`data-design-for-agents.md`](../architecture/data-design-for-agents.md) (epic #1020,
sub-issue #1021). This ADR records the *decision* to adopt that positioning; the doc carries
the reasoning, and other docs/repos link the doc rather than restating it.

## Consequences

### Security impact

- **None.** This is a naming/positioning decision with no code, schema, identity, or
  permission change. Freezing identity names (D2) specifically **avoids** the security
  surface a rename of Entra apps / URLs / DBs would touch. No secrets in any rebranded doc
  (the literal rule: **Never commit secrets**); the canonical doc and all rebrand prose are
  PII-free.

### Cost impact

- Negligible — documentation edits across this repo and link updates in the siblings. Option
  2 (full identity rename) is the costly path and is explicitly not taken.

### Operational impact

- Authors and agents must understand the **product-name vs identity-name split**: write
  "Imperion OS" in prose, but keep `ImperionCRM` / `imperion-crm` / the Entra/DB/URL names
  verbatim in code, config, and deploy contexts. The CLAUDE.md §1 "What this project is"
  section and this ADR are the reference for that split.
- The rollout is a set of docs micro-PRs under epic #1020 (canonical doc, README + overview
  rename + CLAUDE.md, doctrine + STATE refresh, and sibling-repo READMEs that link the
  canonical doc).

## Future considerations

- **Identity rename, if ever.** If the product name and identity names should later
  converge, that is a separate Mark-gated ADR that supersedes ADR-0016's freeze — covering
  the repo, package, Entra apps, DBs, and URLs together with a migration/cutover plan.
- **Trademark / external surface.** Public-facing use of "Imperion OS" (marketing, the
  `/story` page, any external docs) should confirm the name is clear for external use before
  broad publication.
