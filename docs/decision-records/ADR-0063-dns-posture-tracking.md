# ADR-0063: DNS posture tracking — per-customer DNS state capture, golden drift, and Azure-managed verification

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted (2026-06-12, decisions locked with Mark) |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0051 (security posture model / Imperion Secure Score), ADR-0039 (per-source bronze), ADR-0042 (division of labor), local-pipeline ADR-0008 (golden states and drift), local-pipeline ADR-0002 (certificate-rooted unattended execution) |

## Problem

We have no per-customer DNS visibility. We need to (a) capture each customer's DNS state on a cadence and measure it against a known-good baseline, and (b) verify — as a managed-service process check — that the customer's DNS is **hosted in Azure DNS and that Imperion can actually manage it**. DNS drift (a weakened SPF, a missing DMARC enforcement, a dangling CNAME, an NS change) is both a security exposure and an operational-readiness signal, and "is this customer's DNS even under our control yet?" is a recurring onboarding/QBR question with no system answer.

## Context

This slots into the existing posture machinery rather than inventing a new one:

- The on-prem pipeline already holds **ARM Reader** globally via the certificate-rooted SP (local ADR-0002) and has generic ARM access (`Invoke-ImperionArmRequest`, `Get-ImperionAzureResource`). `Microsoft.Network/dnsZones` + `/recordsets` and role-assignment reads are reachable **with no new permission grant**.
- ADR-0051 already defines the golden/drift classification (`compliant` / `drift` / `ungoverned` / `missing` via full-outer-join), the bronze→silver two-tier refresh (on-prem bulk merge + cloud on-demand), and the pillar-based Imperion Secure Score. DNS posture is a natural new feed and a candidate future pillar.
- ADR-0039 sets the per-source bronze convention each collector follows.

Two facts force the shape of the solution:

1. **The Azure manage plane and the real world disagree, and both matter.** ARM `dnsZones` only sees zones hosted *in Azure DNS*. It is the authoritative manage plane and the only way to prove "manageable". But a customer not yet migrated to Azure DNS is invisible to ARM, and even an Azure-hosted zone can be overridden by registrar-level NS. So we also need **public resolution** as ground-truth.
2. **"Manageable" is a check that can fail.** Its value is precisely in failing — surfacing customers whose DNS we cannot yet control. So the model must represent non-Azure and read-only-Azure states as first-class verdicts, not absences.

## Options considered

- **A. ARM only.** Enumerate Azure DNS zones, diff recordsets, prove write access. Simple, no resolver code. Rejected as sole approach: blind to every customer not on Azure DNS (exactly the population the "is it hosted in Azure?" check exists to find), and blind to registrar-level NS overrides of an Azure zone.
- **B. Public resolution only.** Resolve every customer domain from the outside. Sees the real world for everyone, no Azure dependency. Rejected as sole approach: cannot prove "manageable" (no manage-plane signal) and cannot read authoritative zone config — only what currently resolves.
- **C. Both planes, golden drift, governance verdict (chosen).** ARM gives the manage plane (and proves write); public resolution gives ground-truth and covers non-Azure customers; a per-domain golden baseline drives drift; a governance verdict rolls up the manageability question.

### Tradeoffs

C is more collector surface (two feeds) and introduces a cross-plane reconciliation (does Azure zone config match what resolves publicly?). Accepted: the two planes answer different questions and a single plane leaves a blind spot that defeats the feature's stated purpose. Golden-per-domain (vs a generic best-practice template) was chosen as the baseline because Mark wants record-level drift against an *approved* state, consistent with ADR-0051 Golden State; a scored best-practice template is deferred to the optional Score-Model pillar (Future considerations).

## Decision

1. **Two capture planes, one record store.**
   - **Manage plane (ARM):** enumerate `Microsoft.Network/dnsZones` across each customer subscription; for each zone read `/recordsets` (captured as `plane = azure`) and probe write access by reading role assignments at zone/RG scope — does the SP hold `DNS Zone Contributor`, `Contributor`, or `Owner`. Output `in_azure`, `manageable` (write proven, not assumed), and the authoritative recordsets.
   - **Ground-truth plane (public resolve):** resolve every customer domain (SPF/DKIM/DMARC/MX/NS/A/CAA) via `Resolve-DnsName` with a DNS-over-HTTPS fallback, captured as `plane = public`. This is the only signal for domains not in Azure DNS, and the cross-check against the Azure zone.

2. **DNS Golden State per domain.** A capture is approved as the domain's baseline by a human-gated `Set-ImperionDnsGoldenState` → `dns_golden.golden_hash` (mirrors ADR-0051 Golden State and local ADR-0008). Each subsequent capture is classified per record by full-outer-join: `compliant` / `drift` / `ungoverned` / `missing`. Classification lives in one shared SQL expression invoked by both the on-prem bulk merge and the cloud on-demand refresh (ADR-0051 §2).

3. **DNS Governance Verdict per domain** — the process check Mark asked for, a three-state ladder:
   - `not-in-azure` — no Azure DNS zone found for the domain (public resolution may still show records).
   - `in-azure-readonly` — zone exists in Azure but the SP holds no write role (visible, not controllable).
   - `managed` — zone in Azure **and** write proven **and** the domain's live NS publicly resolve to that zone's nameservers (authoritative). Only `managed` satisfies "hosted in Azure and manageable".

4. **Bronze owned here, collectors on-prem (ADR-0042/0039).** This repo owns the schema (migration `0080_dns_posture_bronze`); the on-prem pipeline owns the two collectors and the golden/drift merge. Bronze is raw; `dns_domain` is the silver rollup.

5. **Account-scoped reads are optional-enrichment.** All DNS reads route through the `isSchemaLagError` fallback seam (#301/#302): they degrade to empty on schema lag rather than blanking the account page. Migration 0080 is applied to prod **before** any reading PR merges.

**Table specifications (migration `0080_dns_posture_bronze`, verify number on disk):**

```sql
dns_zones (                                   -- one row per Azure DNS zone (manage plane)
  tenant_id        text NOT NULL,
  source           text NOT NULL DEFAULT 'azure',
  external_id      text NOT NULL,             -- ARM zone resource id
  domain           text NOT NULL,
  in_azure         boolean NOT NULL DEFAULT true,
  manageable       boolean NOT NULL DEFAULT false,   -- write role proven
  resource_group   text,
  subscription_id  text,
  ns_records       jsonb,                     -- Azure zone nameservers
  verdict          text NOT NULL CHECK (verdict IN ('not-in-azure','in-azure-readonly','managed')),
  collected_at     timestamptz NOT NULL DEFAULT now(),
  raw_payload      jsonb,
  content_hash     text,
  PRIMARY KEY (tenant_id, source, external_id)
);

dns_records (                                 -- per-recordset snapshot, both planes
  tenant_id     text NOT NULL,
  source        text NOT NULL,
  external_id   text NOT NULL,                -- domain|plane|type|name
  domain        text NOT NULL,
  plane         text NOT NULL CHECK (plane IN ('azure','public')),
  record_type   text NOT NULL,               -- SPF/TXT, DKIM/CNAME, DMARC/TXT, MX, NS, A, CAA, ...
  name          text NOT NULL,
  value         text NOT NULL,
  ttl           integer,
  captured_at   timestamptz NOT NULL DEFAULT now(),
  content_hash  text,
  PRIMARY KEY (tenant_id, source, external_id)
);

dns_golden (                                  -- human-approved baseline per domain
  tenant_id          text NOT NULL,
  domain             text NOT NULL,
  golden_hash        text NOT NULL,
  golden_records     jsonb NOT NULL,
  golden_approved_at timestamptz NOT NULL DEFAULT now(),
  golden_approved_by text,
  PRIMARY KEY (tenant_id, domain)
);

dns_domain (                                  -- silver rollup, one row per domain
  tenant_id        text NOT NULL,
  domain           text NOT NULL,
  verdict          text NOT NULL CHECK (verdict IN ('not-in-azure','in-azure-readonly','managed')),
  records_compliant  integer NOT NULL DEFAULT 0,
  records_drift      integer NOT NULL DEFAULT 0,
  records_ungoverned integer NOT NULL DEFAULT 0,
  records_missing    integer NOT NULL DEFAULT 0,
  score            numeric,                   -- 0–100 DNS posture score (drift + verdict weighted)
  last_captured_at timestamptz,
  refreshed_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, domain)
);
```

Grants mirror migration 0079: on-prem LP role writes all four; pipeline + backend MIs get the on-demand writes; web MI reads all (and writes `dns_golden` via the admin golden-approval surface if that lands in the GUI rather than the cmdlet).

Domain inventory is derived from existing `account_tenant` Customer Tenant verified domains + account website, with an explicit managed-domains override deferred to a later slice.

> **Amendment 2026-06-12 (Mark) — the domain source is an account-scoped GUI registry, superseding the "derived from tenant" sentence above.**
> Building the public-resolve plane (#156) surfaced that the system has **no domain source**: no `account`/`company` domain column exists, and per-client-tenant Graph (which would yield M365 verified domains) is not built (GDAP was scrapped — see local-pipeline ADR-0018 amendment). Mark's model: **each customer has a GUI-managed list of domains (one or several), and DNS posture checks each one.**
> So domains are **account-scoped and operator-curated**, not tenant-derived. New table `account_domain(account_id, domain, …)` (migration 0081, issue #334) is the single source of truth; the GUI edits it per account. DNS ownership shifts from tenant-keyed to **account-keyed** — `account_id` is added (additive, nullable) to `dns_zones/dns_records/dns_golden/dns_domain`, and the per-account reads key on it. `tenant_id` stays on the bronze rows as Azure-plane context (a zone lives in a subscription/tenant) but is no longer the account join key. The Graph-verified-domains source remains a possible future automation once per-client Graph access exists (it would *populate* `account_domain`, not replace it).

## Consequences

- Epic #306; slices: #307 (this ADR), #308 (migration 0080 + reads), #309 (GUI), local-pipeline #155 (ARM zone collector + write probe), #156 (public-resolve collector), #157 (golden/drift merge).
- The on-prem pipeline gains two collectors and a golden/drift merge; the cloud pipeline gains a single-domain on-demand DNS refresh in its existing on-demand path.
- CONTEXT.md gains DNS vocabulary (DNS Zone, DNS Record Snapshot, DNS Golden State, DNS Governance Verdict, DNS Posture Pillar).

### Security impact

DNS posture is itself a security control — drift on SPF/DKIM/DMARC is a phishing/spoofing exposure; a dangling CNAME is a subdomain-takeover vector; an unexpected NS change is a hijack signal. No new Entra/Azure permission is introduced: ARM Reader (already held) covers zone + recordset + role-assignment reads. The write-access probe **reads** role assignments only — it never grants or mutates. No secrets enter the repo; the cert-rooted token is minted, used, and discarded per local ADR-0002. Public resolution sends only customer domain names (already non-secret) to public resolvers.

### Cost impact

Negligible. ARM and resolver calls are free; storage is small (recordset snapshots per domain per day). Daily cadence on both planes. No new infra.

### Operational impact

Two new daily on-prem scheduled tasks (`azure/dns-zones.task.ps1`, `azure/dns-resolve.task.ps1`), self-gating on migration 0080 like every other collector. The golden-approval step is a deliberate human gate (runbook ships with #157). The recurring schema-lag foot-gun applies: **apply 0080 to prod before the reading PRs merge** (#301/#302). The governance verdict gives onboarding/QBR a concrete "is this customer's DNS managed yet?" answer and a remediation worklist (everything not `managed`).

## Future considerations

- **DNS as a Posture Pillar.** A `dns` pillar can enter Score Model v2 (ADR-0051 §4) once the feed is populated — deferred behind an ADR-0051 amendment, blocked-on-data exactly like the MFA pillar (#265), so onboarding it fleet-wide does not read as fleet-wide slippage.
- **Best-practice scoring template.** A standards ruleset (SPF `-all`, DMARC `p=quarantine|reject`, DKIM present, DNSSEC, CAA) layered on top of golden drift, if Mark later wants an absolute posture score independent of per-domain approval.
- **Cross-plane reconciliation alerts.** Flag when the Azure zone config and public resolution diverge (registrar NS override of an Azure zone), and subdomain-takeover detection on dangling CNAMEs.
- **Remediation write-back.** Because `managed` proves write access, a future autonomy-dialed ICM workflow (ADR-0061) could propose/apply DNS fixes through the manage plane — explicitly out of scope here (read-only).
