-- 0080: DNS posture — Azure DNS zones + DNS record snapshots (bronze) plus the
-- per-domain golden baseline and the silver drift rollup (#308; ADR-0063;
-- posture model ADR-0051; per-source bronze ADR-0039; local golden/drift ADR-0008).
--
-- Per-customer DNS posture has two capture planes (ADR-0063): the Azure manage
-- plane (ARM dnsZones + recordsets, proves "hosted in Azure + manageable") and
-- public resolution (ground-truth, the only signal for domains not in Azure DNS).
-- Captures are measured against a human-approved per-domain DNS Golden State and
-- rolled up into a governance verdict + drift counts.
--
-- Bronze (dns_zones, dns_records): written by the on-prem collectors (local #155
-- ARM zones + write-probe, #156 public resolve) through the standard bronze
-- envelope (0038/0069/0079 contract) — flat columns are text (the loader
-- stringifies; true types + lossless payload live in raw_payload), PK
-- (tenant_id, source, external_id), content_hash. The collectors self-gate until
-- this is applied to prod. Verdict on dns_zones is collector-computed text
-- (bronze stays permissive — no CHECK).
--
-- Silver (dns_golden, dns_domain): written by the golden-approval cmdlet and the
-- drift merge (local #157), keyed per (tenant_id, domain) — real types, and
-- dns_domain.verdict carries the ADR-0063 CHECK (not-in-azure -> in-azure-readonly
-- -> managed; only 'managed' = hosted in Azure AND write proven AND NS delegated).
--
-- Account-scoped reads join through account_tenant (ADR-0051) and route through
-- the optional-enrichment seam (#301/#302): not-yet-migrated -> empty card, never
-- a blanked account page. **Apply to prod before the GUI read PR (#309) merges.**
--
-- Grants (0079 pattern — writer gets idempotent-upsert rights, never DELETE;
-- consumers get SELECT). Additive, idempotent, transactional. No secrets.

BEGIN;

-- ── Bronze: Azure DNS zones (ARM, the manage plane) ───────────────────────────
CREATE TABLE IF NOT EXISTS dns_zones (
  domain text NOT NULL,
  in_azure text,                          -- 'true' when an Azure dnsZones resource exists
  manageable text,                        -- 'true' when the SP holds a write role on the zone
  resource_group text, subscription_id text,
  ns_records text,                        -- stringified Azure zone nameservers (array)
  verdict text,                           -- collector-computed: not-in-azure|in-azure-readonly|managed
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE dns_zones IS
  'Bronze: Azure DNS zones via the on-prem ARM collector (#308, local #155). external_id = ARM zone resource id. manageable = write role proven (role-assignment read). verdict is collector-computed; bronze stays all-text.';

-- ── Bronze: DNS record snapshots (both planes) ────────────────────────────────
CREATE TABLE IF NOT EXISTS dns_records (
  domain text NOT NULL,
  plane text NOT NULL,                    -- 'azure' (ARM recordset) | 'public' (resolver)
  record_type text NOT NULL,             -- SPF/TXT, DKIM/CNAME, DMARC/TXT, MX, NS, A, CAA, ...
  name text NOT NULL, value text NOT NULL, ttl text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE dns_records IS
  'Bronze: DNS recordset snapshots via the on-prem collectors (#308, local #155 azure plane / #156 public plane). external_id = ''<domain>|<plane>|<type>|<name>''. plane=public is the only signal for domains not in Azure DNS.';

-- Layering keys: a domain's records, and per-plane access for drift reconciliation.
CREATE INDEX IF NOT EXISTS ix_dns_records_domain ON dns_records (tenant_id, domain);
CREATE INDEX IF NOT EXISTS ix_dns_records_plane ON dns_records (tenant_id, domain, plane);

-- ── Silver: human-approved DNS Golden State per domain ────────────────────────
CREATE TABLE IF NOT EXISTS dns_golden (
  tenant_id text NOT NULL,
  domain text NOT NULL,
  golden_hash text NOT NULL,
  golden_records jsonb NOT NULL,
  golden_approved_at timestamptz NOT NULL DEFAULT now(),
  golden_approved_by text,
  PRIMARY KEY (tenant_id, domain)
);
COMMENT ON TABLE dns_golden IS
  'Silver: human-approved DNS baseline per domain (local #157 Set-ImperionDnsGoldenState). Captures classify against golden_hash as compliant/drift/ungoverned/missing (ADR-0063, ADR-0051 §3 semantics).';

-- ── Silver: per-domain drift rollup + governance verdict ──────────────────────
CREATE TABLE IF NOT EXISTS dns_domain (
  tenant_id text NOT NULL,
  domain text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('not-in-azure','in-azure-readonly','managed')),
  records_compliant  integer NOT NULL DEFAULT 0,
  records_drift      integer NOT NULL DEFAULT 0,
  records_ungoverned integer NOT NULL DEFAULT 0,
  records_missing    integer NOT NULL DEFAULT 0,
  score            numeric,                -- 0–100 DNS posture score (drift + verdict weighted)
  last_captured_at timestamptz,
  refreshed_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, domain)
);
COMMENT ON TABLE dns_domain IS
  'Silver: per-domain DNS drift rollup + governance verdict (local #157 Get-ImperionDnsDrift merge). verdict ''managed'' = in Azure AND write proven AND live NS delegate to the zone (ADR-0063). Read per account via account_tenant (ADR-0051).';

-- ── Grants ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON dns_zones, dns_records, dns_golden, dns_domain
      TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline write grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON dns_zones, dns_records, dns_golden, dns_domain TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON dns_zones, dns_records, dns_golden, dns_domain TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON dns_zones, dns_records, dns_golden, dns_domain TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;
END $$;

COMMIT;
