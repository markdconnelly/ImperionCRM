# 📓 Runbook — Finish the M365 tenant mappings (`account_tenant`)

[← Runbooks](README.md) · Related: [ADR-0126](../decision-records/ADR-0126-client-communications-capture-model.md) · [ADR-0112 Client Mapping](../decision-records/ADR-0112-client-mapping.md) · epic [#1366](https://github.com/markdconnelly/ImperionCRM/issues/1366) · [#1371](https://github.com/markdconnelly/ImperionCRM/issues/1371)

---

**Trigger** — an account has **no Microsoft 365 tenant mapping** and therefore gets no
per-client security posture and no client-tenant directory collection. As of 2026-06-26
only **4 of 26** accounts are mapped (IPG notably unmapped). The Settings → Client mapping
(M365) page shows them under **"Accounts needing a tenant mapping."**

**Done check** — the account no longer appears in the "Accounts needing a tenant mapping"
list; it appears under **Mapped tenants** with its GUID; and (once the posture collectors
run, LP [#379](https://github.com/markdconnelly/ImperionCRM_LocalPipelineEnrichment/issues/379))
its posture surfaces light up on the account page.

> ℹ️ This is an **operator data-fill task, not a deploy.** The mapping *mechanism* is built;
> what is missing is the real tenant GUID per client — data that comes from M365 admin
> discovery. **Never seed `account_tenant` rows directly in prod** (Mark-gated, system
> CLAUDE.md §8); enter each GUID through the GUI so the `entity_xref` authority row and the
> legacy `account_tenant` join row are written together (ADR-0112 / ADR-0126).

---

## Identifiers (names/ids only — never secrets)

| Value | Where it comes from |
| --- | --- |
| **Tenant GUID** | The client's Microsoft Entra tenant id — a GUID like `00000000-0000-0000-0000-000000000000`. **NOT** a secret. |
| **Account** | The Imperion account (the managed customer) the tenant belongs to. |
| **Display name** *(optional)* | A friendly label for the tenant (e.g. `Acme — Production`). Shown on posture surfaces. |

---

## Where to find each client's tenant GUID

Pick whichever source you already have access to for that client (any one is sufficient —
they all return the same GUID):

1. **Entra admin center (you administer the tenant via the per-client app, ADR-0018):**
   sign into <https://entra.microsoft.com> → **Overview** → **Tenant ID**. Copy the GUID.
2. **Azure portal:** <https://portal.azure.com> → **Microsoft Entra ID** → **Overview** →
   **Tenant ID**.
3. **Unauthenticated lookup from a verified client domain** (when you know a domain the
   client owns but don't yet have a portal session):
   `https://login.microsoftonline.com/<client-domain>/v2.0/.well-known/openid-configuration`
   — the `issuer`/`token_endpoint` URL contains the tenant GUID
   (`https://login.microsoftonline.com/<GUID>/v2.0`). Confirm the domain truly belongs to
   the client before trusting the result.
4. **Pax8 / IT Glue / onboarding records** for that client, if the GUID was captured there.

> Verify the GUID belongs to the **right** client before mapping — a wrong GUID points
> posture collection at the wrong tenant. One tenant maps to exactly one account
> (`account_tenant.tenant_id` is the primary key); re-mapping a GUID repoints it.

---

## Steps

1. Sign into Imperion OS as an **admin** and open
   **Settings → Tools → Client mapping (M365)** (`/settings/client-mapping/m365`).
2. Find the account under **"Accounts needing a tenant mapping."**
   *Verify:* the count matches the number of still-unmapped active accounts (22 at the
   2026-06-26 audit).
3. Paste the client's **tenant GUID** into the row's GUID field, optionally add a display
   name, and click **Map**.
   *Verify:* the account drops off the "needs mapping" list and appears under
   **Mapped tenants** with the GUID shown.
4. Repeat for each remaining account.
5. (Downstream, separate threads — not part of this runbook.) Once a tenant is mapped:
   register that client's per-client M365 credential on the same page (the credential form
   above the list), then the LP posture collectors fan out across the mapped set
   (LP [#379](https://github.com/markdconnelly/ImperionCRM_LocalPipelineEnrichment/issues/379)).

---

## Gotchas

- **No discovered unit = invisible in the tenant-first table.** The main "Unmapped tenants"
  table only lists tenants already seen in posture bronze or already linked. An account
  whose GUID was never collected has nothing there — that's exactly why the **account-first**
  "Accounts needing a tenant mapping" list exists (#1371). Use it.
- **Credential ⟂ mapping (ADR-0122).** Mapping the tenant and registering the client's M365
  credential are two separate steps. The mapping makes posture/directory collection *able*
  to target the tenant; the credential lets it *authenticate*. Both are needed before data
  flows.
- **Dual-write during the cutover (#1049).** Mapping writes both `entity_xref`
  (`('account','m365',<guid>)`, the ADR-0112 authority, via the backend) and the legacy
  `account_tenant` row (the join key the posture rollups still read). If the credential
  backend isn't configured in this environment, the `account_tenant` row is still written so
  the mapping is not lost.
- **Inactive accounts are excluded** from the list — they don't get posture/comms
  collection (ADR-0126). Re-activate the account first if it genuinely needs a mapping.

---

## Rollback

On the same page, find the tenant under **Mapped tenants** and click **Unlink** — this drops
both the `entity_xref` link and the legacy `account_tenant` row, returning the account to the
"needs mapping" list. No data is destroyed beyond the mapping itself.
