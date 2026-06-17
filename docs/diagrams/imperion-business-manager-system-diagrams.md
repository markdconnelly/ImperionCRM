# Imperion Business Manager — system diagrams (consolidated source)

> **What this is:** the cross-cutting, estate-level diagrams that several documents in
> the library refer to, gathered in one place so there is a single canonical source to
> update. Each diagram below is plain Mermaid — copy it into the doc that needs it, or
> link here. Module-specific and component-specific diagrams stay inline in their own
> docs (see the [diagrams index](README.md)).

[← Diagrams](README.md) · [Documentation library](../README.md) ·
[System of systems](../architecture/system-of-systems.md)

---

## 1. The capability surface (CRM · ERP · Extras · AI)

Imperion Business Manager is **not just a CRM** — it is CRM + ERP + extras + a full AI
suite on one surface (CLAUDE.md §1). The four families:

```mermaid
flowchart TB
    IBM(["Imperion Business Manager"])
    IBM --> CRM["🤝 CRM<br/>leads · contacts · accounts · pipeline ·<br/>campaigns · journeys · lifecycle"]
    IBM --> ERP["🏭 ERP<br/>sale→delivery · projects/PM · time &amp; expense ·<br/>Monthly Close · collections · CMDB/assets"]
    IBM --> EXTRA["✨ Extras<br/>BI hub · connector marketplace ·<br/>security posture · consent &amp; governance"]
    IBM --> AI["🤖 Full AI suite<br/>orchestrator + sub-agents · ICM + autonomy dial ·<br/>Managed Agents runtime · agent rooms · RAG"]
```

Full narrative: [capability overview](../product/imperion-business-manager-overview.md).

---

## 2. The four-repo estate (high-level + integration)

The product is one application spread across four repositories with a settled division of
labor (ADR-0042). This front end is **GUI only**; every *process* runs in a sibling.

```mermaid
flowchart TB
    USER([Employee]) -->|browser| FE["ImperionCRM<br/>(this repo — GUI)<br/>Next.js · React · TS"]
    FE -->|reads for render| DB[("PostgreSQL + pgvector<br/>system of record · embeddings · agent memory")]
    FE -->|every process| BE["ImperionCRM_Backend<br/>identity-gated Azure Functions<br/>orchestrator · sends · executors · token custody"]
    BE --> DB
    PL["ImperionCRM_Pipeline<br/>webhooks · bronze→silver merge · on-demand refresh"] --> DB
    LP["ImperionCRM_LocalPipelineEnrichment<br/>on-prem PowerShell · bulk ingest · IT Glue · ALL vectorization"] --> DB
    BE -->|providers| EXT["Claude · Voyage · M365 / Graph · Kaseya (Autotask/IT Glue)<br/>QuickBooks Online · Meta · ACS"]
    LP --> EXT
    PL --> EXT
```

Full ownership table + cross-repo rules: [system-of-systems](../architecture/system-of-systems.md).

---

## 3. Data-flow — medallion enrichment (bronze → silver → gold)

All external data flows through three tiers (CLAUDE.md §4); most agent reasoning consumes
**gold** only.

```mermaid
flowchart LR
    SRC["Sources<br/>M365 · Autotask · IT Glue · Meta ·<br/>Defender · Entra · website · QBO"] --> BRONZE["🥉 Bronze<br/>raw per-source payloads<br/>(one table per source × entity)"]
    BRONZE --> SILVER["🥈 Silver<br/>normalized + enriched + deduped<br/>(contact · account · device · …)"]
    SILVER --> GOLD["🥇 Gold<br/>summaries · embeddings ·<br/>knowledge objects · agent-ready"]
    GOLD --> AGENTS["🤖 Agents &amp; RAG"]
    SILVER --> APP["GUI relational reads"]
```

Meaning of each silver entity lives in the OKF semantic layer
([semantic-layer/index](../database/semantic-layer/index.md), ADR-0086).

---

## 4. Identity / security boundary

Entra ID is the sole identity provider; the front end holds no AI provider key.

```mermaid
flowchart LR
    USER([Employee]) -->|Entra SSO<br/>cert client assertion| FE["Front end (GUI)"]
    FE -->|Easy Auth + caller allowlist| BE["Backend (processes)"]
    BE -->|Managed Identity| KV[("Azure Key Vault<br/>OAuth tokens · secrets")]
    BE -->|read-only Entra token| DB[("PostgreSQL")]
    subgraph TRUST["Trust boundary (identity-gated)"]
        BE
        KV
    end
    FE -. "no AI key in the front end" .- BE
```

Baseline: [unified security standard](../security/unified-security-standard.md)
(referenced, never restated).

---

## 5. Single-orchestrator agent model

The user talks to **one** orchestrator; specialized sub-agents never address the user
directly (CLAUDE.md §2).

```mermaid
flowchart TB
    USER([Employee]) <-->|one conversation| ORCH["Orchestrator<br/>routes · selects tools · enforces permissions ·<br/>manages context + memory"]
    ORCH --> SA1["CRM / Sales sub-agents"]
    ORCH --> SA2["Proposal / Onboarding sub-agents"]
    ORCH --> SA3["Documentation / IT Glue / Autotask / M365"]
    ORCH --> SA4["Reporting sub-agent"]
    ORCH -->|autonomy dial<br/>draft → auto| ICM["ICM workspaces (business processes)"]
    ORCH --> GOLD[("Gold knowledge + RAG")]
```

Deeper: [agents area](../agents/README.md) and the orchestration matrix.

---

## 6. Assessment-led customer lifecycle

The go-to-market motion the CRM models — from lead to continuous customer success.

```mermaid
flowchart LR
    LEAD["Lead captured"] --> NURT["Nurture / pre-discovery<br/>(consent-gated)"]
    NURT --> DISC["Discovery call<br/>(eight captures)"]
    DISC -->|fit| ASSESS["AI Security Readiness Assessment<br/>(paid engagement)"]
    DISC -->|not a fit| NURT
    ASSESS --> PROP["Proposal"]
    PROP --> ONB["Onboarding"]
    ONB --> DELIVER["Implementation / delivery"]
    DELIVER --> SUCCESS["Managed relationship<br/>+ recurring SBR cadence"]
```

Full narrative: [customer-lifecycle](../architecture/customer-lifecycle.md); source assets:
[reference/sales-marketing](../reference/sales-marketing/README.md).

---

## Keeping these honest

These are **maps, not the territory** — verify against source before acting on a picture.
When the system changes, update the diagram in the same PR as the code (docs-as-code,
CLAUDE.md §8). Brand every title **Imperion Business Manager**; never embed secrets,
client identifiers, or PII.
