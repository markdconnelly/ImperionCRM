-- 0128: typed Autotask SLA-target timestamps on silver `ticket` + COALESCE into
-- the `ticket_sla_breach` projection (ADR-0074 §2, ADR-0044, issue #666 — the
-- follow-up pre-documented in 0118's FOLLOW-UP block, lines 39–42). Take the next
-- free migration number just before squash; if another migration merges during the
-- CI window, rename this file (rename is data-safe) and fix the in-file refs +
-- data-model.md + the ticket OKF concept timestamp.
--
-- ── WHY ──────────────────────────────────────────────────────────────────────────
-- ADR-0074 §2: "SLA targets come from Autotask SLA fields pulled into silver, OR are
-- computed against contract terms (ADR-0044) where absent." Until now only the second
-- branch existed: the typed Autotask SLA-target timestamps (dueDateTime /
-- firstResponseDateTime / resolvedDateTime) lived ONLY in bronze `autotask_tickets`
-- (mig 0038, all-text envelope: due_date_time / first_response_date_time /
-- resolved_date_time) and were never promoted to typed columns on silver `ticket`
-- (mig 0050 added last_activity_at/description/resolution/sub_issue_type/ticket_type,
-- no SLA columns). So `ticket_sla_breach` (mig 0118) derived first-response / resolution
-- DUE instants from `opened_at` + a priority-keyed contract-term policy.
--
-- THIS MIGRATION promotes those three Autotask SLA timestamps to typed `timestamptz`
-- columns on silver `ticket`, and switches the view to PREFER the real targets
-- (COALESCE(real, derived)), falling back to the priority policy only where absent.
--
-- ── INERT UNTIL THE PIPELINE POPULATES THEM ────────────────────────────────────────
-- The new columns are NULL until the cloud pipeline's `mergeTicketSources` is taught to
-- parse the three bronze text fields into them (separate ImperionCRM_Pipeline issue,
-- sequenced AFTER this merges per CLAUDE.md §1 — schema is proposed here, the pull is
-- the pipeline's). Until then every COALESCE falls through to the derived policy, so the
-- view's output is byte-for-byte unchanged — no regression. The pipeline already holds
-- SELECT/INSERT/UPDATE on `ticket` (grants in 0050), so no grant change is needed for it
-- to populate these columns.
--
-- Idempotent, additive, transactional. Frontend-owned schema (ADR-0042). No new table,
-- no SoR, no write-back (ADR-0074 keeps Autotask authoritative), no secrets, no PII.

BEGIN;

-- ── Step 1: typed Autotask SLA-target columns on silver `ticket`. ──────────────────
-- Names read as the Autotask SLA TARGETS (distinct from the view's DERIVED
-- first_response_due_at / resolution_due_at). Populated from the bronze text fields by
-- the pipeline merge (see header). Additive + idempotent.
ALTER TABLE ticket
  ADD COLUMN IF NOT EXISTS sla_due_at                timestamptz,  -- ← bronze due_date_time (resolution target)
  ADD COLUMN IF NOT EXISTS sla_first_response_due_at timestamptz,  -- ← bronze first_response_date_time
  ADD COLUMN IF NOT EXISTS sla_resolved_at           timestamptz;  -- ← bronze resolved_date_time (actual resolution)

COMMENT ON COLUMN ticket.sla_due_at IS
  'Autotask SLA resolution-due target (dueDateTime), pulled to silver from bronze autotask_tickets.due_date_time. NULL until the pipeline merge populates it; COALESCEd ahead of the derived contract-term policy in ticket_sla_breach (ADR-0074 §2 / #666).';
COMMENT ON COLUMN ticket.sla_first_response_due_at IS
  'Autotask SLA first-response-due target (firstResponseDateTime), pulled to silver from bronze autotask_tickets.first_response_date_time. NULL until the pipeline merge populates it; COALESCEd ahead of the derived policy in ticket_sla_breach (#666).';
COMMENT ON COLUMN ticket.sla_resolved_at IS
  'Autotask actual-resolution timestamp (resolvedDateTime), pulled to silver from bronze autotask_tickets.resolved_date_time. NULL until the pipeline merge populates it; sharpens the first-response breach proxy in ticket_sla_breach (#666).';

-- ── Step 2: re-project ticket_sla_breach preferring the real Autotask targets. ─────
-- COALESCE(real, derived) for both DUE instants, feeding the COALESCEd values into the
-- breach booleans, resolution_time_remaining and the sla_state worklist bucket so breach
-- state is computed against Autotask's real targets when present and the priority policy
-- only as fallback. sla_resolved_at sharpens the first-response breach proxy: a resolved
-- ticket's clock stops at the actual resolution instant rather than now()/closed_at.
CREATE OR REPLACE VIEW ticket_sla_breach AS
  WITH policy AS (
    -- Contract-term fallback SLA policy (ADR-0074 §2 / ADR-0044), keyed by the
    -- Autotask-native priority text. Hours → first-response / resolution targets.
    -- Conservative defaults; an unknown/NULL priority falls to the loosest tier.
    -- Used ONLY where the real Autotask SLA target column is NULL (see COALESCE below).
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
  ),
  due AS (
    -- The DUE instants used everywhere below: the REAL Autotask SLA target when the
    -- pipeline has populated it, else the derived opened_at + contract-term policy.
    -- NULL only when there is neither a real target nor an opened_at to compute from.
    SELECT p.*,
           COALESCE(p.sla_first_response_due_at, p.opened_at + p.first_response_target) AS first_response_due,
           COALESCE(p.sla_due_at,                p.opened_at + p.resolution_target)     AS resolution_due,
           -- "As-of" instant the clock is measured to. For first response we can now use
           -- the ACTUAL resolution timestamp (sla_resolved_at) when present — once
           -- resolved, the response clock no longer runs to now(); falls back to
           -- closed_at then now() while still open/unresolved.
           COALESCE(p.sla_resolved_at, p.closed_at, now()) AS first_response_measured_at,
           -- Resolution clock measured to the close (then last_activity_at) for a settled
           -- ticket, else now() while open — using the real resolution instant when known.
           COALESCE(p.sla_resolved_at, p.closed_at, p.last_activity_at, now()) AS resolution_measured_at
      FROM policy p
  )
  SELECT
    d.id                                   AS ticket_id,
    d.account_id,
    d.number,
    d.status,
    d.priority,
    d.opened_at,
    d.closed_at,
    d.last_activity_at,
    -- Does a contractual SLA even apply? (account's contract carries sla_id, mig 0050.)
    (c.sla_id IS NOT NULL)                 AS sla_applies,
    c.sla_id,
    -- An open ticket is one that has not been closed.
    (d.closed_at IS NULL)                  AS is_open,
    -- DUE instants: real Autotask SLA target preferred, derived contract-term policy as
    -- fallback (COALESCE above). NULL only when neither a real target nor opened_at exists.
    d.first_response_due                   AS first_response_due_at,
    d.resolution_due                       AS resolution_due_at,
    -- The "as-of" instant the resolution clock is measured to (real resolution → close →
    -- last_activity_at → now()).
    d.resolution_measured_at               AS measured_at,
    -- ── Breach state. A breach is the as-of instant past the due instant. ──────────
    -- First-response breach: sharpened by the actual resolution timestamp where present
    -- (the clock stops at sla_resolved_at), else the open/close proxy. NULL due → no breach.
    CASE
      WHEN d.first_response_due IS NULL THEN false
      ELSE d.first_response_measured_at > d.first_response_due
    END                                    AS first_response_breached,
    CASE
      WHEN d.resolution_due IS NULL THEN false
      ELSE d.resolution_measured_at > d.resolution_due
    END                                    AS resolution_breached,
    -- Remaining time to the resolution due instant (negative = overrun), against the same
    -- as-of instant. NULL when there is no resolution due instant.
    CASE
      WHEN d.resolution_due IS NULL THEN NULL
      ELSE d.resolution_due - d.resolution_measured_at
    END                                    AS resolution_time_remaining,
    -- A coarse worklist bucket the surface can sort by (ADR-0074 §2 "breach risk
    -- surfaces on a worklist"): breached > at_risk (<25% of budget left, still open) > ok.
    -- Computed against the COALESCEd resolution due instant.
    CASE
      WHEN d.resolution_due IS NULL THEN 'unknown'
      WHEN d.resolution_measured_at > d.resolution_due THEN 'breached'
      WHEN d.closed_at IS NULL
           AND now() > (d.resolution_due - ((d.resolution_due - d.opened_at) * 0.25)) THEN 'at_risk'
      ELSE 'ok'
    END                                    AS sla_state
  FROM due d
  LEFT JOIN contract c
         ON c.account_id = d.account_id
        AND c.sla_id IS NOT NULL;

COMMENT ON VIEW ticket_sla_breach IS
  'Read-only SLA breach PROJECTION over silver ticket (ADR-0074 §2, #404/#666). NOT an authoritative sla_state store — a plain view recomputed on every read, so the pipeline''s normal ticket pull is its refresh. DUE instants prefer the real Autotask SLA targets promoted to silver ticket (sla_due_at / sla_first_response_due_at, mig 0128) and fall back to opened_at + a priority-keyed contract-term policy (ADR-0044) only where those are NULL; sla_resolved_at sharpens the first-response breach proxy. Columns: first/resolution due + breached booleans, resolution_time_remaining, and an sla_state worklist bucket (breached|at_risk|ok|unknown). No new table, no SoR, no PII (ticket text not selected).';

-- ── Grants: the app reads the projection; backend reads it for the worklist / API
--    write-back decisioning; pipeline reads it on refresh (it owns the underlying pull).
--    Defensive (roles may be absent in some envs), mirroring 0050/0118.
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

COMMIT;
