# Company security posture

[← User guides](README.md)

Every company (Account) has a **security posture** view at
`/accounts/[id]/posture`, reached from the **Posture** button on the company
360. It is a pure **read** over the posture silver/bronze: nothing here mutates
state except the reused account-scoped **Refresh posture** / **Snapshot now**
actions. Each section degrades to an empty state on schema lag — a posture
section never blanks the page (#301).

## What you see

- **Per-tenant rollups** — secure score, user counts, open dark-web exposures,
  and policy classification (compliant / drift / ungoverned / missing) for each
  Customer Tenant mapped to the company (ADR-0051).
- **Policy classification** — observed policies vs the approved Golden State,
  problems first.
- **Secure score controls** — Microsoft's improvement actions, grouped by
  category (the drill-down behind the score).
- **DNS posture** — per-domain governance, see below (ADR-0063, #309).
- **Credential exposures** — Dark Web ID matches for the company (ADR-0040).

The company 360 itself carries at-a-glance cards: the **Imperion Secure Score**
card (Score Model v1 over the mapped tenants) and the **DNS posture** card.

## DNS posture (ADR-0063)

DNS is **account-keyed**, not tenant-mapped: it reads the company's
operator-curated tracked-domain list (`account_domain`, the domain system of
record per the ADR-0063 amendment) LEFT-JOINed to its captured `dns_domain`
rollup. So it shows whenever the company tracks **any** domain, independent of
Tenant Mapping.

**Governance verdict** (the badge color carries the read):

| Verdict | Color | Meaning |
|---|---|---|
| Managed | green | Hosted in Azure **and** write-proven **and** NS-delegated |
| In Azure (read-only) | amber | Present in Azure but not write-proven |
| Not in Azure | red | Ungoverned — not hosted in Azure |
| Tracked | grey | In the list but the on-prem merge hasn't captured it yet |

- **Company-360 card** — worst verdict across captured domains, tracked-domain
  count, summed record drift/missing, and last-captured date; links into the
  posture view.
- **Posture-page rows** — one row per tracked domain (worst-verdict-then-drift
  first), each with its verdict badge and the record-level classification
  **counts** (compliant / drift / ungoverned / missing) mirroring the
  policy-family badges, plus the domain's DNS score and capture date. A
  tracked-but-uncaptured domain reads *awaiting first capture*.

> **Record-level drilldown is counts-only today.** The shipped account-keyed
> rollup (#334) carries per-domain drift/missing *counts*, not individual
> records. A true record-by-record drift list is a follow-up that needs a
> record-level read — see issue #576.

## Permissions

Reads follow the company's normal visibility. The Refresh / Snapshot actions
re-classify the mapped tenants and are only offered when a Tenant Mapping
exists (DNS rows need no tenant mapping — they key on the domain list).
