# ADR-0001: Open web stack over Power Platform

- **Status:** Accepted
- **Date:** 2026-06-06

## Problem
Choose the primary application framework for Meridian.

## Context
The platform is an operational intelligence layer above M365 and Kaseya. It needs
relational + semantic/vector data, agent memory, and a premium UX — beyond what
low-code delivers maintainably.

## Options considered
- Power Platform / Dataverse / Copilot Studio as the primary framework.
- Modern open web stack (Next.js/React/TypeScript) using Microsoft where it adds value.

## Tradeoffs
Low-code accelerates simple CRUD but constrains UX, testability, portability, and
AI/vector workloads. Open web requires more engineering but is portable,
maintainable, and developer-friendly.

## Decision
Build a modern web application on open web technology. Microsoft provides identity,
security, collaboration, automation, and ingestion — not the app framework.
Power Automate is limited to triggers/approvals/notifications, never core logic.

## Security impact
Full control over the security stack (OWASP, SAST/DAST, secure CI/CD); not bound to
low-code platform limits.

## Cost impact
Higher build cost; lower per-seat platform licensing and lower long-term lock-in risk.

## Operational impact
Standard web ops (CI/CD, observability) rather than Power Platform ALM.

## Future considerations
Modular monolith first; decompose only when scale justifies it.
