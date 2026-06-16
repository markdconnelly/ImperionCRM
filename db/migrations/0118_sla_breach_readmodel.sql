-- 0118: SLA breach
-- read-model PROJECTION over silver `ticket` (ADR-0074 §2, issue #404, epic #320 ·
-- parent #314). Take the next free migration number just before squash; if another
-- migration merges during the CI window, rename this file (rename is data-safe) and
-- fix the in-file refs + data-model.md + the ticket OKF concept timestamp.
--
-- THE SCOPE BOUNDARY (ADR-0074, RATIFIED — see 0117_chat_session.sql for the full
-- statement): Autotask is the ticket system of record; Imperion does NOT keep an
-- authoritative `sla_state` store. SLA breach is a READ-MODEL PROJECTION over silver
-- `ticket` (which mirrors Autotask via bronze `autotask_tickets`, mig 0038 →
-- `mergeTicketSources`), refreshed for free because it is a plain VIEW — every read
-- recomputes against the latest pulled ticket state, so "refreshed by the pipeline"
-- needs no separate job (the pipeline's normal ticket pull IS the refresh).
--
-- WHAT THIS IS NOT:
--   * NOT a table. No new SoR, no stored breach state, no write-back. A breach
--     annotation worth persisting is written to the Autotask ticket via the API
--     (ADR-0074 §2) and round-trips back through the pull — not stored here.
--   * NOT a second ticket shape. It is a thin projection that adds derived SLA
--     columns onto each silver `ticket` row.
--
-- ── SLA TARGET DERIVATION (the honest part — read this) ─────────────────────────
-- ADR-0074 §2: "SLA targets come from Autotask SLA fields pulled into silver, OR are
-- computed against contract terms (ADR-0044) where absent." TODAY the typed Autotask
-- SLA-target timestamps (dueDateTime / firstResponseDateTime / resolvedDateTime) live
-- ONLY in bronze `autotask_tickets` (mig 0038, all-text envelope) and were NOT promoted
-- to typed columns on silver `ticket` (mig 0050 added last_activity_at/description/
-- resolution/sub_issue_type/ticket_type — no SLA columns). So this projection takes the
-- "computed against contract terms where absent" branch: it derives first-response and
-- resolution DUE timestamps from `ticket.opened_at` + a priority-keyed default SLA
-- policy (the contract-term fallback), and an `sla_id` flag from the account's contract
-- so the surface can show whether a contractual SLA even applies. The breach booleans
-- are then computed against now() (open tickets) or closed_at / last_activity_at
-- (settled tickets). When the pipeline later promotes the real Autotask SLA timestamps
-- to silver `ticket`, this view should switch to COALESCE(<real column>, <derived>) —
-- tracked as the follow-up below. The view is correct and useful now; it just gets
-- sharper when the real targets land.
--
-- FOLLOW-UP (file as a sibling-repo issue per CLAUDE.md §1 — the pipeline owns the
-- pull): promote autotask_tickets.due_date_time / first_response_date_time /
-- resolved_date_time to typed columns on silver `ticket`, then COALESCE them ahead of
-- the priority-default derivation here. Until then the derivation is the source.
--
-- Read-only VIEW. Frontend-owned schema (ADR-0042). Idempotent (CREATE OR REPLACE).
-- No new table, no SoR, no secrets, no PII inlined (ticket text is not selected).

CREATE OR REPLACE VIEW ticket_sla_breach AS
  WITH policy AS (
    -- Contract-term fallback SLA policy (ADR-0074 §2 / ADR-0044), keyed by the
    -- Autotask-native priority text. Hours → first-response / resolution targets.
    -- Conservative defaults; an unknown/NULL priority falls to the loosest tier.
    SELECT t.*,
           CASE lower(coalesce(t.priority, ''))
             WHEN 'critical' THEN interval '1 hour'
             WHEN 'high'     THEN interval '2 hours'
             WHEN 'medium'   THEN interval '4 hours'
             WHEN 'low'      THEN interval '8 hours'
             ELSE                 interval '8 hours'
           END AS first_response_target,
           CASE lower(coalesce(t.priority, ''))
             WHEN 'critical' THEN interval '4 hours'
             WHEN 'high'     THEN interval '8 hours'
             WHEN 'medium'   THEN interval '24 hours'
             WHEN 'low'      THEN interval '72 hours'
             ELSE                 interval '72 hours'
           END AS resolution_target
      FROM ticket t
  )
  SELECT
    p.id                                   AS ticket_id,
    p.account_id,
    p.number,
    p.status,
    p.priority,
    p.opened_at,
    p.closed_at,
    p.last_activity_at,
    -- Does a contractual SLA even apply? (account's contract carries sla_id, mig 0050.)
    (c.sla_id IS NOT NULL)                 AS sla_applies,
    c.sla_id,
    -- An open ticket is one that has not been closed.
    (p.closed_at IS NULL)                  AS is_open,
    -- Derived SLA DUE timestamps from opened_at + the contract-term policy. NULL when
    -- the ticket has no opened_at (cannot compute a target without a clock start).
    (p.opened_at + p.first_response_target) AS first_response_due_at,
    (p.opened_at + p.resolution_target)     AS resolution_due_at,
    -- The "as-of" instant the clock is measured to: now() while open, else the close
    -- (fallback to last_activity_at, then opened_at) for a settled ticket.
    COALESCE(p.closed_at, p.last_activity_at, now()) AS measured_at,
    -- ── Breach state. A breach is the as-of instant past the due instant. ──────────
    -- First-response breach: we cannot see the first-response actual on silver, so this
    -- is a proxy — past the first-response due and still unresolved-as-of measured_at.
    CASE
      WHEN p.opened_at IS NULL THEN false
      ELSE COALESCE(p.closed_at, now()) > (p.opened_at + p.first_response_target)
    END                                    AS first_response_breached,
    CASE
      WHEN p.opened_at IS NULL THEN false
      ELSE COALESCE(p.closed_at, now()) > (p.opened_at + p.resolution_target)
    END                                    AS resolution_breached,
    -- Remaining time to the resolution target (negative = overrun), against the same
    -- as-of instant. NULL when there is no opened_at.
    CASE
      WHEN p.opened_at IS NULL THEN NULL
      ELSE (p.opened_at + p.resolution_target) - COALESCE(p.closed_at, now())
    END                                    AS resolution_time_remaining,
    -- A coarse worklist bucket the surface can sort by (ADR-0074 §2 "breach risk
    -- surfaces on a worklist"): breached > at_risk (<25% of budget left, still open) > ok.
    CASE
      WHEN p.opened_at IS NULL THEN 'unknown'
      WHEN COALESCE(p.closed_at, now()) > (p.opened_at + p.resolution_target) THEN 'breached'
      WHEN p.closed_at IS NULL
           AND (now() - p.opened_at) > (p.resolution_target * 0.75)            THEN 'at_risk'
      ELSE 'ok'
    END                                    AS sla_state
  FROM policy p
  LEFT JOIN contract c
         ON c.account_id = p.account_id
        AND c.sla_id IS NOT NULL;

COMMENT ON VIEW ticket_sla_breach IS
  'Read-only SLA breach PROJECTION over silver ticket (ADR-0074 §2, #404). NOT an authoritative sla_state store — a plain view recomputed on every read, so the pipeline''s normal ticket pull is its refresh. SLA targets are derived from opened_at + a priority-keyed contract-term policy (ADR-0044 fallback) because the real Autotask SLA timestamps are not yet promoted to silver ticket (bronze-only, mig 0038); switch to COALESCE(real, derived) when they land. Columns: first/resolution due + breached booleans, resolution_time_remaining, and an sla_state worklist bucket (breached|at_risk|ok|unknown). No new table, no SoR, no PII (ticket text not selected).';

-- ── Grants: the app reads the projection; backend reads it for the worklist / API
--    write-back decisioning; pipeline reads it on refresh (it owns the underlying pull).
--    Defensive (roles may be absent in some envs), mirroring 0090.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON ticket_sla_breach TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON ticket_sla_breach TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON ticket_sla_breach TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grant.';
  END IF;
END $$;
