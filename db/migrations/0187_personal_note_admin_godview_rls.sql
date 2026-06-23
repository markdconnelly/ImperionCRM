-- 0187: audited admin god-view — explicit, ledgered RLS bypass over the personal tier
-- (#980, parent #976 / #967, ADR-0105 §3b). Migration number 0187 is a PLACEHOLDER claimed
-- at MERGE per system CLAUDE.md §10.3 — the rebased branch takes the next free number just
-- before squash, and every reference is renumbered then. Do NOT prod-apply (each apply is
-- Mark-gated).
--
-- WHY THIS EXISTS. Slice 2 (#975, migration 0153) made personal_note OWNER-ONLY: the app
-- connects as the non-owner, non-BYPASSRLS app role, so even an admin using the web app sees
-- only their own drawer — the personal-tier privacy contract. But the access-spine design
-- (#967) requires an admin / Mark to be able to "see all data flowing to course-correct."
-- That reach must be EXPLICIT and AUDITED — never a silent always-on superuser, and never the
-- table-owner ownership bypass (which only applies to direct admin DB connections via
-- migrate.mjs / pg-MCP, NOT the app role the web app uses).
--
-- THE SHAPE — a per-table PERMISSIVE admin policy, NOT a BYPASSRLS role (ADR-0105 §3b, the
-- settled slice-3 design). Postgres OR's PERMISSIVE policies, so this policy is ADDITIVE to
-- the existing owner policy: a row is visible when the caller OWNS it (personal_note_owner)
-- OR the caller carries the 'admin' role in app.groups (this policy). Reasons the design
-- chose this over a BYPASSRLS admin DB role:
--   1. Granular — the bypass is scoped to exactly the tables that carry a god-view policy
--      (personal_note today), not every table in the database.
--   2. Same plumbing — it reads app.groups, the very GUC withIdentity already injects; no new
--      role, no new connection, no new secret.
--   3. Visible — an admin's reach shows up in pg_policies, so the bypass is auditable in the
--      catalog itself, not hidden in a role attribute.
--
-- SCOPE — personal-tier ONLY. God-view is meaningful only over RLS-gated personal-tier tables
-- (personal_note today). Over company-tier, broad employee read already gives an admin
-- everything (ADR-0100), so NO god-view policy is needed — or wanted — there. This migration
-- touches exactly one table: personal_note.
--
-- AUDIT — the bypass is the policy; the AUDIT is enforced at the DATA LAYER, not here. An RLS
-- policy cannot cleanly write an audit row, and per-row read logging is too heavy. So the
-- contract (ADR-0105 §3b) is: when the data layer reads personal_note AS AN ADMIN and the read
-- returns rows the admin does NOT own, it writes ONE audit_log entry per access event
-- (action='personal_note.godview', actor = the admin's app_user.id). The owner's own reads and
-- ordinary company reads are NOT audited. This migration's only audit responsibility is to make
-- sure the app role can WRITE that ledger entry (the defensive GRANT below).
--
-- POSTURE — ADDITIVE + FAIL-CLOSED, ZERO behavior change for non-admins on apply: the owner
-- policy is untouched; a caller with no 'admin' role in app.groups is unaffected (the new
-- permissive branch is FALSE for them, so the owner policy alone decides their rows). An
-- unset/empty app.groups → no 'admin' → FALSE → no extra rows (never an error), exactly like
-- the owner and company axes.
--
-- Archetype H (governance/control). App-native; NOT silver, NOT pipeline-merged → no OKF
-- concept file (the 0153/0186 greenfield-control precedent; semantic-layer-not-affected).
-- Frontend-owned schema (ADR-0042). No PII, no secrets (role slugs are non-sensitive; the
-- audited content stays out of this migration). Additive, idempotent, transactional. DORMANT
-- — NOT prod-applied until the orchestrator/Mark runs it. After apply, verify with the
-- god-view matrix in docs/testing/rls-access-spine.md.

BEGIN;

-- ── The audited admin god-view policy — permissive, additive to the owner policy ──────────
-- USING admits a row to an admin caller; WITH CHECK lets an admin write/correct a personal-tier
-- row during a course-correction (the same gate, kept symmetric with the owner policy). The
-- predicate is the §3b shape: 'admin' present in the caller's role set (app.groups). Re-runnable:
-- DROP then CREATE (CREATE POLICY has no IF NOT EXISTS). PERMISSIVE is the default; stated
-- explicitly so the OR-with-owner semantics are unmistakable.
DROP POLICY IF EXISTS personal_note_admin_godview ON personal_note;
CREATE POLICY personal_note_admin_godview ON personal_note
  AS PERMISSIVE
  FOR ALL
  USING ('admin' = ANY(COALESCE(current_setting('app.groups', true), '{}')::text[]))
  WITH CHECK ('admin' = ANY(COALESCE(current_setting('app.groups', true), '{}')::text[]));

COMMENT ON POLICY personal_note_admin_godview ON personal_note IS
  'Audited admin god-view (#980, ADR-0105 §3b): permissive bypass admitting personal_note rows '
  'to a caller carrying the ''admin'' role in app.groups — OR''d with personal_note_owner, so '
  'non-admins are unaffected (fail-closed on unset app.groups). NOT a BYPASSRLS role: granular, '
  'reuses withIdentity plumbing, visible in pg_policies. Every admin read of a row it does not '
  'own is ledgered to audit_log (action=personal_note.godview) at the DATA LAYER — the bypass is '
  'explicit + audited, never a silent superuser.';

-- ── Grants — the app role must be able to WRITE the god-view audit ledger entry ────────────
-- The web app role already SELECTs/writes personal_note (0153) and INSERTs audit_log on other
-- audited paths (e.g. timesheet.corrected). This re-asserts the audit-write grant defensively
-- and idempotently so the §3b data-layer audit cannot silently fail for lack of a privilege.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT ON audit_log TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web audit grant.';
  END IF;
END $$;

COMMIT;
