# Stage 01 — gather

**Job:** assemble the window's incident/alert stream and the assets/accounts in
blast radius into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| SOC run ledger | `agent_run` (via pg.read) | Cyrus runs this window | what the SOC tier detected and did |
| Handoff bus | `relationship.*` handoff signals (via pg.read) | SOC escalations this window | incident/escalation signals between agents |
| Security tickets | silver `ticket` · `okf:ticket` | open security-class tickets | the incident working records (Autotask SoR) |
| Devices / CIs | silver `device` · `okf:device` | CIs tied to the incidents | endpoint blast radius |
| Cloud assets | silver `cloud_asset` · `okf:cloud_asset` | cloud CIs tied to the incidents | cloud blast radius |
| Tenant posture | silver `tenant_posture` · `okf:tenant_posture` | affected tenants | per-tenant exposure context |
| Accounts in scope | silver `account` · `okf:account` | tenants behind the incidents | who the exposure belongs to |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this window's threats | recall, cited by reference |

## Process

1. `[script]` Pull the SOC run ledger and the handoff-bus signals into a flat
   list keyed by incident/tenant. Read-only; never write.
2. `[script]` Pull the open security-class tickets into the same flat list,
   keyed to their incident where linked. Read-only.
3. `[script]` Resolve referenced devices, cloud assets, and accounts from
   silver; attach id only. No client PII, no secret values — reference by id.
4. `[haiku]` Recall prior threat context for the window via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of incident/alert signals keyed by
incident/tenant, with the ticket/device/cloud-asset/account ids in scope and
cited recall items. Reference only; no PII, no secrets.

## Audit

- [ ] Every signal carries an incident and/or tenant key
- [ ] Every ticket / asset / account reference states its id (audit by reference)
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] No client PII, no secret values present
- [ ] Read-only — nothing contained, isolated, or written
