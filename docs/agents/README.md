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
and memory, **enforces permissions**, and returns one response. The AI layer is
**provider-agnostic** (OpenAI / Azure OpenAI / Claude behind a model-routing layer).

## What belongs here

Every agent gets a dedicated doc: **identity · responsibilities · inputs · outputs ·
tool access · security boundaries · failure handling · a workflow diagram**. Start each
from this template and link it back here.

> Status: the agent runtime is in progress; this area defines the contract it will
> implement. The app calls the agent through a single server-side entry point (ADR-0018).

Governing decisions:
[ADR-0004 single orchestrator](../decision-records/ADR-0004-single-orchestrator-agent-model.md) ·
[ADR-0015 agent platform & board](../decision-records/ADR-0015-agent-platform-and-board.md)
