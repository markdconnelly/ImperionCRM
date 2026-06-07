# 📋 Compliance

Where the platform's controls map to external obligations, and where the evidence lives.

[← Documentation library](../README.md)

## Obligations in scope

| Area | Driver | Where it's enforced |
| --- | --- | --- |
| Outreach (email/SMS/calls) | TCPA · CAN-SPAM · GDPR | [Consent ledger](../data-governance/README.md) — sends blocked unless consent is current (ADR-0014). |
| Profiling & enrichment | GDPR lawful basis | Per-fact `lawful_basis` on every enrichment row (ADR-0025). |
| Ad targeting | Consent | `ad_targeting` gate on audiences (ADR-0026). |
| Access & audit | Least privilege | RBAC from Entra groups + append-only audit log (ADR-0016). |

## What belongs here (to expand)

Control-to-framework mappings, audit evidence, and the data-handling attestations the
business needs. The substance of the controls lives in
[security](../security/README.md) and [data-governance](../data-governance/README.md);
this area is the **mapping and evidence** layer over them.
