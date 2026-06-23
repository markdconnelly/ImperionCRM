-- 0194: data-quality SLA + autonomy gate — DQ becomes a safety control on the action plane
-- (#1113, epic #1049 — the THIRD/FINAL child, completing the data-plane integrity spine).
-- Migration number 0194 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against the next free number; the rebased branch takes whatever is free just before squash
-- (parallel sessions #1116 / #981 / #1243 this wave grab 0194+ concurrently). Locate by content
-- in the FE mirror's tests, never by hardcoded number.
--
-- WHY THIS EXISTS. Epic #1049 makes the data plane trustworthy enough for an AUTONOMOUS
-- Technician (#1038) via three pillars. #1111 (mig 0190) shipped pillar 1 — the resolver
-- `entity_resolve()` so an agent acts on the RIGHT entity. #1112 (mig 0191) shipped pillar 2 —
-- bitemporal `entity_xref` so an agent knows what was TRUE WHEN and what we BELIEVED WHEN.
-- This is pillar 3: an agent may act only on FRESH and COMPLETE data — a stale or partial record
-- must NEVER be auto-acted on; it routes to the human cockpit instead. DQ is now a SAFETY
-- CONTROL, wired to the same hard ceilings the data_class axis (0175) and earned autonomy
-- (#1036) already enforce: "freshness = correctness" (grounding-cortex) made a dispatch GATE.
--
-- WHERE IT SITS IN THE DISPATCH CHAIN. The actuation dial (0158) + earned autonomy (#1036)
-- already resolve a proposed action to execute | execute_notify | cockpit (mig 0176 records it
-- on agent_run). This adds ONE MORE gate AFTER that resolution: even when the dial+earned verdict
-- is "execute inline", a DQ-SLA breach on the resolved record DOWNGRADES the verdict to "cockpit"
-- (fail-closed). The gate can only ever ROUTE-TO-HUMAN; it never raises autonomy. This is the
-- exact shape of the always-gate hard ceiling — a one-way clamp toward human review.
--
-- THE SLA POLICY (data, not schema — tune without a migration). `dq_sla` defines, per
-- data_class (the 0175 sensitivity axis — the gate is keyed on WHAT KIND of data the action
-- touches, the same axis the action ceiling already uses), two thresholds:
--   * max_age_seconds  — the freshness SLA: a record older than this is STALE.
--   * min_completeness — the completeness SLA: a record whose completeness score (0..1, the
--                        fraction of SLA-required fields populated) is below this is INCOMPLETE.
-- always_gate classes (financial / security_credentials / client_pii) get the TIGHTEST default
-- SLAs (they already always route to the cockpit, so the SLA is belt-and-suspenders + drives the
-- "why" badge). operational gets a looser SLA (broad-read ops data tolerates more staleness).
--
-- THE GATE PREDICATE. `entity_dq_gate(p_data_class, p_age_seconds, p_completeness) -> boolean`
-- returns TRUE when the record MEETS its class SLA (fresh enough AND complete enough) — i.e. the
-- action MAY proceed on DQ grounds — and FALSE on any breach. FAIL-CLOSED: an unknown class, a
-- NULL age, or a NULL completeness all return FALSE (we don't know the data is good → treat it as
-- bad → route to human). The backend dispatcher (BE, ADR-0042) computes the record's age +
-- completeness at dispatch and calls this; the FE mirror is src/lib/agent/data-quality-gate.ts
-- (pure, the action-dispatch.ts precedent — two copies of one rule, kept in lockstep).
--
-- Archetype H (governance/control), horizontal Audit/governance domain — twin of data_class /
-- agent_action_autonomy / agent_tool_grant. App-native config; NOT silver, NOT pipeline-merged →
-- no OKF concept file for the policy table itself (the 0158/0163/0175 precedent: the data_class
-- ATTRIBUTE is first-class on the OKF concepts, the policy TABLE is not). Frontend-owned schema
-- (ADR-0042). No PII, no secrets (class names + integer thresholds only). Additive, idempotent,
-- transactional. The spine is deploy-dormant (entity_xref empty in prod), so the gate evaluates
-- 0 live actions today and lights up with the rest of #1049. NOT prod-applied until Mark runs it
-- (each prod apply is Mark-gated, §10.3).

BEGIN;

-- ── 1. The DQ-SLA policy table: per-data_class freshness + completeness thresholds ─────────────
-- One row per data_class (the 0175 sensitivity axis). FK to data_class so the gate is keyed on
-- the SAME taxonomy the action ceiling uses — a new class can't have a silent NULL SLA. Tune
-- thresholds as data (UPDATE a row), never a migration.
CREATE TABLE IF NOT EXISTS dq_sla (
  data_class       text PRIMARY KEY
                     REFERENCES data_class(class) ON UPDATE CASCADE ON DELETE CASCADE,
  -- Freshness SLA: a record whose age exceeds this many seconds is STALE → gate routes to human.
  max_age_seconds  integer NOT NULL CHECK (max_age_seconds > 0),
  -- Completeness SLA: a record whose completeness score (0..1, fraction of SLA-required fields
  -- populated) is below this is INCOMPLETE → gate routes to human. 1.000 demands a full record.
  min_completeness numeric(4,3) NOT NULL DEFAULT 1.000
                     CHECK (min_completeness >= 0 AND min_completeness <= 1),
  description      text,
  updated_at       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE dq_sla IS
  'Data-quality SLA per data_class (#1113, epic #1049 pillar 3): the freshness (max_age_seconds) '
  'and completeness (min_completeness) thresholds an agent''s acted-on record must meet, else the '
  'dispatch gate routes the action to the human cockpit. DQ as a safety control wired to the '
  'always-gate hard ceiling. Reference/config (archetype H); tune as data, not schema. No PII, no '
  'secrets.';

-- Seed every class so the gate has a defined SLA for each (no NULL-SLA silent pass). always_gate
-- classes (financial / security_credentials / client_pii) get the tightest SLAs — they already
-- always route to the cockpit, so a tight SLA is belt-and-suspenders and drives the "stale/
-- incomplete" badge; operational (broad-read ops data) tolerates more staleness. Idempotent.
INSERT INTO dq_sla (data_class, max_age_seconds, min_completeness, description) VALUES
  ('operational',          86400, 0.800,
   'Ops/CMDB: tolerate up to 24h staleness and 80% completeness for auto-action.'),
  ('people_hr',            43200, 0.900,
   'Employee HR: 12h freshness, 90% completeness before auto-action.'),
  ('financial',             3600, 1.000,
   'Money (always-gate): 1h freshness, full completeness — tightest SLA.'),
  ('security_credentials',  3600, 1.000,
   'Credentials/posture (always-gate): 1h freshness, full completeness — tightest SLA.'),
  ('client_pii',            7200, 1.000,
   'Customer-facing/PII (always-gate): 2h freshness, full completeness.')
ON CONFLICT (data_class) DO UPDATE
  SET max_age_seconds  = EXCLUDED.max_age_seconds,
      min_completeness = EXCLUDED.min_completeness,
      description      = EXCLUDED.description,
      updated_at       = now();

-- ── 2. The gate predicate: does a record MEET its class SLA? (fail-closed) ──────────────────────
-- TRUE  = fresh enough AND complete enough → the action may proceed on DQ grounds.
-- FALSE = stale OR incomplete OR unknown-class OR NULL input → route to the human cockpit.
-- STABLE (reads only dq_sla) + SECURITY INVOKER (every dispatch role can SELECT dq_sla). The
-- backend computes p_age_seconds (now() - the record's silver freshness stamp) and p_completeness
-- (fraction of SLA-required fields populated) and passes them in; this function owns ONLY the
-- threshold comparison so the SLA rule has a single home. FAIL-CLOSED on every unknown.
CREATE OR REPLACE FUNCTION entity_dq_gate(
  p_data_class   text,
  p_age_seconds  integer,
  p_completeness numeric
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p_age_seconds IS NOT NULL
         AND p_completeness IS NOT NULL
         AND p_age_seconds  <= s.max_age_seconds
         AND p_completeness >= s.min_completeness
      FROM dq_sla AS s
      WHERE s.data_class = p_data_class
    ),
    false  -- unknown class (no dq_sla row) → fail-closed: data is not provably good.
  );
$$;

COMMENT ON FUNCTION entity_dq_gate(text, integer, numeric) IS
  'Data-quality dispatch gate (#1113, epic #1049): TRUE iff a record of data_class p_data_class, '
  'aged p_age_seconds and p_completeness complete, MEETS its dq_sla freshness+completeness '
  'thresholds (the action may proceed on DQ grounds). FALSE on any breach OR unknown class OR '
  'NULL input — fail-closed: a breach can only ever route the action to the human cockpit, never '
  'raise autonomy. Mirrors src/lib/agent/data-quality-gate.ts. STABLE, reads only dq_sla.';

-- ── 3. Least-privilege grants (the 0190 defensive pattern; roles may be absent) ────────────────
-- Every dispatch plane that resolves actions may read the SLA table + call the gate. Web gets
-- SELECT/EXECUTE too: the operator surfaces PREVIEW the DQ verdict (why an action would park).
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'mgid-imperioncrmbackendfunction',
    'mgid-imperioncrmpipeline',
    'imperion-localpipeline',
    'mgid-imperioncrm-web-prd'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT SELECT ON dq_sla TO %I', r);
      EXECUTE format('GRANT EXECUTE ON FUNCTION entity_dq_gate(text, integer, numeric) TO %I', r);
    ELSE
      RAISE NOTICE 'role % absent — skipping dq_sla/entity_dq_gate grant.', r;
    END IF;
  END LOOP;
END $$;

COMMIT;
