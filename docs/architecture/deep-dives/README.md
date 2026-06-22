# 🧬 Deep dives — the architecture, one layer at a time

The **canonical deep dives** behind Imperion OS's agentic data design. Each is the
single authoritative explainer for one layer; the public papers
([executive summary](../../../public/papers/executive-summary.html) ·
[research paper](../../../public/papers/research-paper.html)) and the sibling repos link
**here** rather than restating. These go deeper than the
[architecture overview](../README.md) and the
[data & automation doctrine](../data-and-automation-doctrine.md); the *why-it's-superior*
argument is [data design for agents](../data-design-for-agents.md).

## The five canonical deep dives

| Deep dive | Layer | Home repo |
| --- | --- | --- |
| [Medallion architecture](medallion-architecture.md) | Data — the kernel filesystem (bronze/silver/gold + vector) | **`ImperionCRM`** (this repo) |
| [Open Knowledge Format](open-knowledge-format.md) | Meaning — the type system / grounding cortex | **`ImperionCRM`** (this repo) |
| [Model Workspace Protocol / ICM](https://github.com/markdconnelly/ImperionCRM_Backend/blob/main/docs/architecture/deep-dives/model-workspace-protocol.md) | Action — filesystem-as-orchestration | `ImperionCRM_Backend` |
| [MemPalace memory architecture](https://github.com/markdconnelly/ImperionCRM_LocalPipelineEnrichment/blob/main/docs/architecture/deep-dives/mempalace-memory-architecture.md) | Memory — verbatim recall patterns | `ImperionCRM_LocalPipelineEnrichment` |
| [Open Brain second brain](https://github.com/markdconnelly/ImperionCRM_LocalPipelineEnrichment/blob/main/docs/architecture/deep-dives/open-brain-second-brain.md) | Memory — one store, many agents | `ImperionCRM_LocalPipelineEnrichment` |

## Synthesis

| Doc | What it covers |
| --- | --- |
| [How it all fits together](how-it-all-fits-together.md) | How ICM/MWP + medallion + OKF + MemPalace + Open Brain compose into **one** agentic system — one loop, three altitudes (medallion → OKF → ICM), three memory tiers (canon · company · personal). Links out to all five deep dives. |

> **Ownership.** The two deep dives in the table above marked *this repo* are owned here
> (this repo owns the schema and the OKF canon, per CLAUDE.md §1/§11). The sibling deep
> dives are owned by their home repo and linked by stable GitHub blob URL; this repo never
> forks them.
