-- 0079: Entra groups + group membership bronze — feeds the user object
-- (#257; posture/tenant model ADR-0051; per-client app pipeline ADR-0018).
--
-- Mark per-source review 2026-06-12: directory users/groups are bronze to the
-- USER object. Users already flow (Get-ImperionM365User → m365_contacts →
-- silver contact); groups and membership are entirely absent today — this adds
-- the landing tables so membership can enrich the contact.
--
-- The on-prem collector (local-pipeline #139; Group.Read.All /
-- GroupMember.Read.All) flattens Graph /groups plus per-group member expansion
-- to the standard local-pipeline bronze envelope (0038/0069 contract): flat
-- columns are text (loader stringifies; true types live in raw_payload), PK
-- (tenant_id, source, external_id), lossless raw payload + content_hash. The
-- collector self-gates until this is applied to prod.
--
-- Keys: m365_groups.external_id = the Entra group object id. Membership has no
-- single natural id, so m365_group_members.external_id is the collector-built
-- '<group id>/<member id>' composite (0078 composite-site-id precedent — the
-- generic envelope upsert stays intact) and the flat parts
-- (group_external_id, member_external_id) carry the (tenant, group, member)
-- key for joins: member_external_id = m365_contacts.external_ref = the Entra
-- user object id, which is how membership reaches the contact.
--
-- Grants (0069/0076/0077/0078 pattern — writer gets idempotent-upsert rights,
-- never DELETE; consumers get SELECT).
--
-- Additive, idempotent, transactional. No secrets.

BEGIN;

-- ── Bronze: Graph /groups ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS m365_groups (
  display_name text, mail_nickname text, mail text, description text,
  group_types text,                       -- stringified Graph array, e.g. ["Unified"]
  security_enabled text, mail_enabled text,
  visibility text, classification text, is_assignable_to_role text,
  membership_rule text, membership_rule_processing_state text,  -- dynamic groups
  on_premises_sync_enabled text,
  created_date_time text, renewed_date_time text, expiration_date_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE m365_groups IS
  'Bronze: Entra/M365 groups (Graph /groups) via the on-prem collector (#257, local #139). external_id = Entra group object id. Kind from group_types ["Unified"] = M365, security_enabled = security (case-folded — bronze is all-text).';

-- ── Bronze: per-group member expansion (Graph /groups/{id}/members) ───────────
CREATE TABLE IF NOT EXISTS m365_group_members (
  group_external_id text NOT NULL,        -- parent Entra group object id
  member_external_id text NOT NULL,       -- member directory object id (user join key)
  member_type text,                       -- @odata.type, e.g. #microsoft.graph.user
  member_display_name text, member_user_principal_name text, member_mail text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE m365_group_members IS
  'Bronze: group membership edges (Graph /groups/{id}/members) via the on-prem collector (#257, local #139). external_id = ''<group id>/<member id>'' composite; member_external_id joins m365_contacts.external_ref to reach the silver contact.';

-- Layering keys: group → its members; member → their groups (the contact join).
CREATE INDEX IF NOT EXISTS ix_m365_group_members_group
  ON m365_group_members (tenant_id, group_external_id);
CREATE INDEX IF NOT EXISTS ix_m365_group_members_member
  ON m365_group_members (member_external_id);

-- ── Grants ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON m365_groups, m365_group_members
      TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline write grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON m365_groups, m365_group_members TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON m365_groups, m365_group_members TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON m365_groups, m365_group_members TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;
END $$;

COMMIT;
