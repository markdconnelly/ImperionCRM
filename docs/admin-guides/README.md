# 🔑 Admin Guides

For administrators configuring and supporting Imperion CRM — the controls behind the
day-to-day UI.

[← Documentation library](../README.md)

## What belongs here

| Topic | Notes |
| --- | --- |
| Identity & roles | Map Entra groups → app roles (RBAC, ADR-0016). |
| Connections | Approve/manage company integrations; oversee per-user connected accounts ([integrations](../integrations/README.md)). |
| Questionnaires | Edit discovery/assessment questions (data-driven, ADR-0023). |
| Consent & compliance | Review the [consent ledger](../data-governance/README.md); honor opt-outs. |
| Tenant Mapping | Settings → Tenant mapping: map customer Microsoft tenant GUIDs → accounts so posture data reaches the right account (ADR-0051; explicit, never inferred from domains). Watch the unmapped-tenants list — unmapped posture is invisible on account pages. |
| Time tracking | [Time approvals](timesheet-approvals.md) (admin correctness gate) → [payroll approval](payroll-approval.md) (CFO sign-off + Paid via QuickBooks match) → [employee mapping](employee-mapping.md) (one-time Autotask/QuickBooks ids). ADR-0082; no comp data on these surfaces. |
| Break-glass | Emergency access procedure (ADR-0008). |

> Audience: internal admins, not end users — for the latter see
> [user-guides](../user-guides/README.md). Fill these in as each admin surface ships.
