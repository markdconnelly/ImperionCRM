# 📓 Runbooks

**Runbooks are the exact keystrokes for one situation.** Each one is a single,
copy-paste-able sequence with a clear **trigger** ("use this when…") and a clear **done
check** ("you're finished when…"). If you are mid-incident or mid-task and need the
*precise* commands, you are in the right place.

[← Documentation library](../README.md) ·
[Operations (the standing picture)](../operations/README.md) ·
[Security](../security/README.md) ·
[Incident response](../security/incident-response.md) ·
[Deployment](../deployment/README.md) ·
[Disaster recovery](../disaster-recovery/README.md)

---

## Runbook vs. operations vs. security

| If you want… | Go to |
| --- | --- |
| The **exact commands** for one situation | **Runbooks** (this area). |
| The **standing operational picture** (what's wired, what's deferred, ops state) | [Operations](../operations/README.md). |
| The **why / the rules / the model** | [Security](../security/README.md). |
| The **incident loop** these runbooks plug into | [Incident response](../security/incident-response.md). |

> A runbook is *not* a place to argue a decision — it executes one. Decisions live in
> ADRs; the standing picture lives in operations; runbooks are the muscle memory.

---

## Anatomy of a runbook (the house style)

Every runbook in this area follows the same shape, so a newcomer can trust the format:

1. **Trigger** — the one condition that means "run this now."
2. **Done check** — the observable proof it worked.
3. **Identifiers** — the environment values you'll paste (resource group, app names, …).
   *Never secret values* — only names/ids.
4. **Numbered steps** — copy-paste commands, each with a `Verify` follow-up.
5. **Gotchas** — the traps that cost someone an afternoon last time.
6. **Rollback** — how to undo it.

> ⚠️ Several runbooks touch **production auth and infra**. Read each command before you
> run it, run them yourself (you own `az` / Azure RBAC), and treat anything irreversible
> or touching permissions/billing/deploys/production data as **Mark-gated** (system
> CLAUDE.md §2).

---

## Index

| Runbook | Trigger — use it when… |
| --- | --- |
| [dev-node-blocked-by-intune-firewall](dev-node-blocked-by-intune-firewall.md) | Local `npm` / Node is blocked from the network by an Intune/Defender firewall rule on a managed dev workstation. |
| [activate-company-credential-wiring](activate-company-credential-wiring.md) | You want saving a **company credential** in Settings to actually write to Key Vault and flip the row to `active` — enable backend Easy Auth + the web-app MI token (backend ADR-0036). |
| [finish-tenant-mappings](finish-tenant-mappings.md) | An account has **no M365 tenant mapping** (4/26 mapped at the 2026-06-26 audit) so it gets no per-client posture/directory collection — map each client's tenant GUID via the GUI (ADR-0126, #1371). |

### Related runbooks living in other areas

Some procedures are owned by a neighbouring area but are runbook-shaped:

| Runbook | Lives in | For |
| --- | --- | --- |
| [secrets-rotation runbook](../operations/secrets-rotation-runbook.md) | Operations | The full secret inventory + rotation steps + suspected-compromise quick-reference. |
| [Applying a migration](../../db/README.md) | `db/` | Apply a DB migration to prod with an Entra token (raw SQL, ADR-0017) — separate from the app deploy. |

---

## Runbooks still to write (tracked)

As the platform hardens for go-live, these belong here (file an issue per runbook):

- **Inspect the running app via Kudu** (AAD bearer token) and **tail logs / triage a
  5xx**.
- **Disable / re-enable break-glass** as an incident containment step (the levers are in
  [incident-response](../security/incident-response.md); the keystrokes deserve their own
  runbook).
- **DB point-in-time restore + restore validation** (the procedure behind
  [disaster-recovery](../disaster-recovery/README.md)).

---

## See also

[Operations](../operations/README.md) ·
[Incident response](../security/incident-response.md) ·
[Deployment](../deployment/README.md) ·
[Disaster recovery](../disaster-recovery/README.md) ·
[Security](../security/README.md)
