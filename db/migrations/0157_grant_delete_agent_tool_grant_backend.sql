-- 0157: Let the backend MI REVOKE tool grants (#1005 / 2D, ADR-0107 D3).
--
-- The grant-admin endpoint (backend `agent/grants` DELETE, #248) revokes a grant by
-- deleting its `agent_tool_grant` row. Migration 0056 granted the backend MI only
-- SELECT/INSERT/UPDATE on that table (no DELETE — the table was append-only then), so a
-- revoke would fail with permission-denied. This adds the missing DELETE grant.
--
-- Scope: a single GRANT to the backend Function App's managed identity. The web role keeps
-- SELECT only (it never writes grants — ADR-0042). No schema/data change; idempotent.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT DELETE ON agent_tool_grant TO "mgid-imperioncrmbackendfunction";
  END IF;
END $$;

COMMIT;
