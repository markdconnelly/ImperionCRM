---
adr: 0002
title: "Entra ID as sole identity provider"
status: accepted
date: 2026-06-06
repo: frontend
summary: "Entra ID is the mandatory, sole identity provider; no third-party IdP without a superseding ADR."
tags: [platform]
---
# ADR-0002: Entra ID as sole identity provider

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-06 |
| **Cross-references** | — |

## Problem

Select the identity provider for authentication and authorization.

## Context

MSP environment, Microsoft-first posture, "Mythos Proof" security requirements
(Zero Trust, least privilege, Conditional Access, MFA, passkeys, device compliance).

## Options considered

- Entra ID (OAuth/OIDC) as sole IdP.
- Third-party IdPs (Clerk, Auth0, Supabase Auth).

### Tradeoffs

Third-party IdPs offer fast DX but add an identity surface outside the Microsoft
trust boundary and duplicate controls. Entra centralizes identity truth and
inherits Conditional Access / device compliance.

## Decision

Entra ID is the mandatory, sole identity provider. No third-party IdP without a
compelling, documented justification (a future superseding ADR).

## Consequences

### Security impact

Single source of identity truth; Conditional Access, MFA, passkeys, device
compliance, RBAC enforced centrally.

### Cost impact

Uses existing Microsoft entitlements; avoids additional IdP subscriptions.

### Operational impact

Identity lifecycle managed in Entra; app consumes OAuth/OIDC.

## Future considerations

Service principals and managed identities for service-to-service auth.
