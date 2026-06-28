# Stage 01 — gather

**Job:** assemble the cycle's SOC/GRC/Identity posture and the assets/accounts in
scope into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Posture snapshots | silver `posture_snapshot` · `okf:posture_snapshot` | current snapshot per pillar | the SOC/GRC posture baseline |
| Tenant posture | silver `tenant_posture` · `okf:tenant_posture` | per-tenant rollup | per-client exposure |
| Posture policy / golden | silver `posture_policy` · `okf:posture_policy` | active goldens | control-drift reference |
| Devices / CIs | silver `device` · `okf:device` | CIs tied to findings | asset/security context |
| Cloud assets | silver `cloud_asset` · `okf:cloud_asset` | cloud CIs tied to findings | cloud exposure context |
| Accounts in scope | silver `account` · `okf:account` | tenants behind the findings | who the posture is for |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's threats | recall, cited by reference |

## Process

1. `[script]` Pull current posture snapshots, tenant posture, and active policy
   goldens into a flat list keyed by pillar/tenant.
2. `[script]` Resolve referenced devices, cloud assets, and accounts from silver;
   attach id only. No client PII, no secrets — reference by id.
3. `[haiku]` Recall prior context for the cycle's threats via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of posture signals keyed by pillar/tenant,
with the device/cloud-asset/account ids in scope and cited recall items. Reference
only; no PII, no secrets.

## Audit

- [ ] Every signal carries a pillar and/or tenant tag
- [ ] Every asset / account reference states its id (audit by reference)
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] No client PII, no secrets present
