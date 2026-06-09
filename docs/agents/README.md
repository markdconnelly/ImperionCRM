# 🤖 Agents

**One agent experience.** The user talks to a single orchestrator; many specialized
sub-agents exist internally but never address the user directly (CLAUDE.md §2, ADR-0004).

[← Documentation library](../README.md)

## The model

```mermaid
flowchart TD
    USER(["User"]) <--> ORC["Orchestrator agent<br/>routes · selects tools · enforces permissions · manages memory"]
    ORC --> CRM["CRM"]
    ORC --> SALES["Sales"]
    ORC --> PROP["Proposal"]
    ORC --> ONB["Onboarding"]
    ORC --> DOC["Documentation"]
    ORC --> ITG["IT Glue"]
    ORC --> AT["Autotask"]
    ORC --> M365["M365"]
    ORC --> REP["Reporting"]
    ORC -. scoped to .-> PERM["the user's Entra permissions"]
```

The orchestrator routes requests, selects tools, invokes sub-agents, manages context
and memory, **enforces permissions**, and returns one response. The AI stack is
**settled** (ADR-0043 / backend ADR-0034): **Claude** for generation (Haiku cheap tier,
Sonnet premium tier) + **Voyage `voyage-3-large` @ 1024** for embeddings.

## What belongs here

Every agent gets a dedicated doc: **identity · responsibilities · inputs · outputs ·
tool access · security boundaries · failure handling · a workflow diagram**. Start each
from this template and link it back here.

> Status: the agent runtime is **deferred to the next phase** — the panel and the
> single server-side entry point exist, but execution is stubbed. This area defines the
> contract the runtime will implement (ADR-0018). The AI Agents and Board pages are
> still placeholders pending it.

Governing decisions:
[ADR-0004 single orchestrator](../decision-records/ADR-0004-single-orchestrator-agent-model.md) ·
[ADR-0015 agent platform & board](../decision-records/ADR-0015-agent-platform-and-board.md)
