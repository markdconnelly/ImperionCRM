---
adr: 0004
title: "Single-orchestrator agent model"
status: consolidated
date: 2026-06-06
repo: frontend
summary: "Users interact with one orchestrator agent; specialized sub-agents never face the user directly."
tags: [agent-icm]
consolidated_into: ADR-0091
---
# ADR-0004: Single-orchestrator agent model

> Consolidated into [ADR-0091](ADR-0091-agent-icm-platform-consolidated.md). Retained for history.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-06 |
| **Cross-references** | — |

## Problem

Define how users interact with the platform's multiple specialized agents.

## Context

Many sub-agents (CRM, Sales, Proposal, Onboarding, Documentation, IT Glue,
Autotask, M365, Reporting). Users should feel they talk to one intelligent system.

## Options considered

- Single orchestrator that routes to sub-agents.
- Multiple user-facing agents.

### Tradeoffs

Multiple user-facing agents fragment UX and scatter permission enforcement. A single
orchestrator centralizes routing, tool selection, context/memory, and permission
enforcement, at the cost of being a critical path.

## Decision

Users interact with one orchestrator. Sub-agents never interact with users directly.
The orchestrator routes requests, selects tools, invokes sub-agents, manages context
and memory, enforces Entra-scoped permissions, and returns responses.

## Consequences

### Security impact

Single choke point for permission enforcement and audit; sub-agent tool access is
gated centrally.

### Cost impact

Routing can select models by cost/capability via the provider-agnostic layer.

### Operational impact

One server-side entry point to monitor and rate-limit.

## Future considerations

Stub sub-agents behind interfaces; add per-agent docs (docs/agents) as they land.
