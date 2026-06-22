-- 0175: data_class — the THIRD RLS axis + the action-plane sensitivity ceiling (#1034,
-- ADR-01XX, agentic-OS contract 2026-06-21 decision 1+2). Migration number 0175 claimed at
-- MERGE per system CLAUDE.md §10.3 — authored against a placeholder; the rebased branch takes
-- the next free number just before squash. The ADR number is likewise a placeholder.
--
-- WHY THIS EXISTS. The MSP's isolation axis is DATA SENSITIVITY, not client tenant: employees
-- (and the agents acting for them) roam ALL clients freely; `account`/`client` is lineage, not a
-- wall (agentic-OS contract decision 1). The hard gate is a new, coarse `data_class` axis that
-- enforces at TWO layers from ONE source of truth:
--
--   READ layer  — the THIRD RLS predicate, alongside the owner axis (app.user_id, 0153) and the
--                 company/role axis (app.groups, ADR-0105): a row of class C is visible only when
--                 the caller's roles are granted class C.
--   ACTION layer — a ceiling on the governed action / tool-grant plane (ADR-0107 / #990): an
--                 action's data_class must be within the caller/agent's permitted classes, else
--                 it is refused (sub-agent dispatch) or routed to the approval cockpit
--                 (autonomous/actuation path). Same predicate, evaluated on the action's class.
--
-- The 5-class taxonomy was already STAMPED on agent_conversation / agent_pending_action /
-- agent_action_autonomy (migration 0163); this migration makes it ENFORCEABLE by adding the
-- role→class grant table + the shared predicate function + the first read policy that reads it.
--
-- THE TAXONOMY (5 coarse, role-mapped classes — fixed in the ADR):
--   operational           — CMDB / tickets / assets / ops telemetry (the broad-read default).
--   financial             — money: invoices, pay, expense, AR, QBO mirrors.
--   people_hr             — employee HR: comp, reviews, PII-of-staff.
--   security_credentials  — secrets metadata, posture findings, credential registry.
--   client_pii            — customer-facing content + client personal data.
--
-- ALWAYS-GATE (the hard ceiling #1036 will enforce on the autonomy plane — modeled here so the
-- column can EXPRESS it now; this migration does not change autonomy behavior): financial,
-- security_credentials, client_pii are always-gate classes earned autonomy can never auto-cross
-- (money / customer-facing / credentials — the standing-authorization gates). The column lands
-- now so #1036 is a DATA/runtime change, never a schema change.
--
-- POSTURE — ADDITIVE + FAIL-CLOSED, ZERO behavior change on apply:
--   * The grant table is SEEDED so every role keeps exactly the reach ADR-0100 (broad employee
--     read) gives it today: every signed-in role is granted `operational`; finance/admin add
--     `financial`; admin/hr add `people_hr`; admin/security add `security_credentials`;
--     every role gets `client_pii` for reads (ADR-0100 keeps client data broad-read in v1 — the
--     ACTION ceiling, not the READ axis, is where client_pii bites in v1; the read axis is wired
--     and provable but seeded broad so no live read breaks). Tightening a class to fewer roles
--     is then a one-row DATA change, never a schema change.
--   * The first READ policy lands on `agent_conversation` ONLY — a NEW table (0163), not yet
--     prod-applied, whose reads all route through `withIdentity`. This mirrors the slice-2
--     precedent (enable the new axis on a greenfield classed table, never retrofit a live read
--     path — ADR-0105). No existing read path gains a policy here.
--
-- Archetype H (governance/control), horizontal Audit/governance domain — twin of
-- agent_tool_grant / agent_action_autonomy / agent_settings. App-native config; NOT silver, NOT
-- pipeline-merged → no OKF concept file for the grant table itself (semantic-layer-not-affected,
-- the 0158/0163 precedent). The data_class ATTRIBUTE is, however, first-class on the OKF concepts
-- + the coverage matrix (this PR updates the doctrine + a representative set; full per-concept
-- backfill is the follow-up issue). Frontend-owned schema (ADR-0042). No PII, no secrets (class
-- names + role slugs are non-sensitive). Additive, idempotent, transactional. NOT prod-applied
-- until the orchestrator/Mark runs it (each prod apply is Mark-gated, §10.3).

BEGIN;

-- ── 1. data_class registry: the 5 classes + the always-gate flag (#1036 ceiling expression) ──
CREATE TABLE IF NOT EXISTS data_class (
  class       text PRIMARY KEY
                CHECK (class IN
                  ('operational','financial','people_hr','security_credentials','client_pii')),
  label       text NOT NULL,
  -- The HARD ceiling: earned autonomy (#1036 / ADR-0109) can NEVER auto-cross an always-gate
  -- class — money / customer-facing / credentials always surface to a human. Modeled now so
  -- #1036 reads it as data; this migration does not itself gate autonomy.
  always_gate boolean NOT NULL DEFAULT false,
  description text,
  sort_order  smallint NOT NULL DEFAULT 0
);
COMMENT ON TABLE data_class IS
  'The 5 coarse data-sensitivity classes (the #1034 third RLS axis, agentic-OS contract). '
  'always_gate marks the hard ceiling earned autonomy can never auto-cross (#1036). '
  'Reference/config (archetype H); no PII, no secrets.';

INSERT INTO data_class (class, label, always_gate, description, sort_order) VALUES
  ('operational',          'Operational / CMDB',    false,
   'CMDB, tickets, assets, ops telemetry — the broad-read default.', 1),
  ('financial',            'Financial',             true,
   'Money: invoices, pay, expense, AR, QBO mirrors. Always-gate.', 2),
  ('people_hr',            'People / HR',           false,
   'Employee HR: comp, reviews, staff PII.', 3),
  ('security_credentials', 'Security / credentials', true,
   'Secret metadata, posture findings, credential registry. Always-gate.', 4),
  ('client_pii',           'Client PII',            true,
   'Customer-facing content + client personal data. Always-gate.', 5)
ON CONFLICT (class) DO UPDATE
  SET label = EXCLUDED.label,
      always_gate = EXCLUDED.always_gate,
      description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order;

-- ── 2. data_class_role_grant: which app-role slug may reach which class (the SOURCE OF TRUTH) ─
-- Read by BOTH layers: the RLS predicate (reads) and the action ceiling (actions). app.groups
-- carries normalized app-role slugs (ADR-0105 slice-3 vocabulary: admin/finance/project_manager/
-- sales/support + hr/security here).
CREATE TABLE IF NOT EXISTS data_class_role_grant (
  role_slug  text NOT NULL,
  class      text NOT NULL REFERENCES data_class(class) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_slug, class)
);
COMMENT ON TABLE data_class_role_grant IS
  'Maps an app-role slug (app.groups element, ADR-0105) → a data_class it may reach. The single '
  'source of truth read by BOTH the third RLS read-predicate (app_data_class_allowed) and the '
  'action-plane ceiling (#1034/#990). Tightening a class to fewer roles is a DATA change, never '
  'schema. Reference/config (H); no PII, no secrets.';

CREATE INDEX IF NOT EXISTS idx_data_class_role_grant_class ON data_class_role_grant (class);

-- Seed = exactly today's reach (ADR-0100 broad employee read) so apply is behavior-preserving.
-- operational + client_pii: EVERY signed-in role (v1 broad read; client_pii bites on the ACTION
-- ceiling, not the read axis, in v1). financial: finance + admin. people_hr: hr + admin.
-- security_credentials: security + admin.
INSERT INTO data_class_role_grant (role_slug, class)
SELECT g.role_slug, g.class
FROM (VALUES
  -- operational — broad
  ('admin','operational'),('finance','operational'),('project_manager','operational'),
  ('sales','operational'),('support','operational'),('hr','operational'),('security','operational'),
  -- client_pii — broad read in v1 (ADR-0100); the action ceiling is the v1 control
  ('admin','client_pii'),('finance','client_pii'),('project_manager','client_pii'),
  ('sales','client_pii'),('support','client_pii'),('hr','client_pii'),('security','client_pii'),
  -- financial — finance + admin
  ('admin','financial'),('finance','financial'),
  -- people_hr — hr + admin
  ('admin','people_hr'),('hr','people_hr'),
  -- security_credentials — security + admin
  ('admin','security_credentials'),('security','security_credentials')
) AS g(role_slug, class)
ON CONFLICT (role_slug, class) DO NOTHING;

-- ── 3. app_data_class_allowed(text): the shared predicate read by BOTH layers ─────────────────
-- TRUE when the caller's roles (app.groups) are granted the given class. STABLE + SECURITY
-- DEFINER so the policy can read data_class_role_grant even though the predicate runs under the
-- non-owner app role (the grant table is config, not row-scoped). Fail-closed: an unset/empty
-- app.groups → no role → no grant → FALSE (no rows / refused action), never an error.
CREATE OR REPLACE FUNCTION app_data_class_allowed(target_class text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM data_class_role_grant g
    WHERE g.class = target_class
      AND g.role_slug = ANY (
        COALESCE(current_setting('app.groups', true), '{}')::text[]
      )
  );
$$;
COMMENT ON FUNCTION app_data_class_allowed(text) IS
  'The #1034 third-axis predicate: TRUE when the caller''s roles (app.groups) are granted '
  'target_class via data_class_role_grant. Read by the RLS read-policies AND the action-plane '
  'ceiling so reads and actions share ONE rule. Fail-closed (unset app.groups → FALSE).';

-- ── 4. First READ policy that reads the new axis — agent_conversation (greenfield, 0163) ──────
-- agent_conversation is NEW (0163), not yet prod-applied, and its reads route through
-- withIdentity. Enabling the data_class axis here proves the third predicate end-to-end with
-- ZERO risk to a live read path (the slice-2 greenfield precedent, ADR-0105). The owner/company
-- axes are NOT added here (broad-read per ADR-0100); this is the data_class axis in isolation.
ALTER TABLE agent_conversation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_conversation_data_class ON agent_conversation;
CREATE POLICY agent_conversation_data_class ON agent_conversation
  USING (app_data_class_allowed(data_class))
  WITH CHECK (app_data_class_allowed(data_class));

-- ── 5. Grants (defensive; roles may be absent in some envs) ───────────────────────────────────
-- Both reference tables: web SELECT (render the matrix / class badges), backend SELECT (resolve
-- the ceiling at dispatch). Admin manages the grants from the cockpit → web UPDATE/INSERT/DELETE
-- on data_class_role_grant (the 0158 dial precedent). EXECUTE on the predicate to both app roles.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON data_class TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON data_class_role_grant TO "mgid-imperioncrm-web-prd";
    GRANT EXECUTE ON FUNCTION app_data_class_allowed(text) TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON data_class TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON data_class_role_grant TO "mgid-imperioncrmbackendfunction";
    GRANT EXECUTE ON FUNCTION app_data_class_allowed(text) TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
END $$;

COMMIT;
