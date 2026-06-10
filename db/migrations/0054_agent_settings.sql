-- 0054: Agent-layer settings singleton (backend ADR-0037).
--
-- One row holding the orchestrator's model-tier preset (economy | balanced |
-- premium — each pins the cheap+premium Claude pair in the backend's catalog)
-- and the HARD monthly USD budget ceiling (NULL = no cap). The backend reads
-- it on every turn (cached) and falls back to balanced defaults while this
-- migration is unapplied, so deploy order doesn't matter. The web app's
-- Settings → AI controls read/write through the backend's
-- GET/PUT /api/agent/settings — but get direct grants too for rendering.

CREATE TABLE IF NOT EXISTS agent_settings (
  id                  boolean PRIMARY KEY DEFAULT true CHECK (id), -- singleton row
  preset              text NOT NULL DEFAULT 'balanced'
                        CHECK (preset IN ('economy', 'balanced', 'premium')),
  budget_usd_monthly  numeric(10, 2),               -- NULL = no cap
  updated_by          text,                          -- acting admin (app_user.id or label)
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agent_settings IS
  'Singleton: orchestrator model-tier preset + monthly budget ceiling (backend ADR-0037).';

INSERT INTO agent_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Least-privilege grants (0050/0052 defensive pattern).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON agent_settings TO "mgid-imperioncrm-web-prd";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON agent_settings TO "mgid-imperioncrmbackendfunction";
  END IF;
  -- Pipeline + local identities get no access — agent settings are not their concern.
END $$;
