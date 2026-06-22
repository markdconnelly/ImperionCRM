-- 0176: Re-grant the `reporting` sub-agent its narrow named tools (#264 — ADR-0107 D1).
--
-- RENUMBER AT MERGE (system CLAUDE.md §10.3): authored against the next free number
-- observed on origin/main (0175 was highest → 0176). Multiple sessions run concurrently;
-- if another migration merges first, take the next free number, rename this file, and
-- fix the cross-references before squash-merge.
--
-- LOCKSTEP with backend #264 (PR in ImperionCRM_Backend): the backend refactors the
-- `reporting` sub-agent from the generic `agent_reporting` delegate to TWO narrow named
-- tools — `reporting_snapshot` (the model-grounded narrative it always had) and
-- `metric_lookup` (resolve ONE governed metric by key via the single metric read path BI
-- uses, #259/ADR-0078). Publishing any narrow tool DROPS the generic delegate
-- (`exposedToolNames()` is all-or-nothing), so the seeded grant matrix must follow:
--   - ADD grants for `reporting_snapshot` + `metric_lookup`;
--   - REMOVE the now-stale `agent_reporting` delegate grant.
-- The backend mirror `SEEDED_TOOL_GRANTS.reporting = ['reporting_snapshot','metric_lookup']`
-- + the drift guard (#243) keep the two copies in lockstep.
--
-- Deny-by-default (ADR-0107): without these grant rows, `isToolGranted` refuses the new
-- tools at runtime (the loop returns an is_error result + audits it). The `reporting`
-- `agent` row already exists (seeded by 0156); this migration only touches grants.
--
-- Mirrors 0156's seed pattern (join (agent_name, tool) → module='crm' agent row by name).
-- Idempotent throughout (ON CONFLICT guard on insert; idempotent delete); safe to re-run.
-- Zero behavior change until the backend half deploys (the grants are inert config anchors
-- read only by the backend tool-dispatch gate).

BEGIN;

-- ── 1. Add the two narrow reporting tool grants ──────────────────────────────
INSERT INTO agent_tool_grant (agent_id, tool)
SELECT a.id, g.tool
FROM (
  VALUES
    ('reporting', 'reporting_snapshot'),
    ('reporting', 'metric_lookup')
) AS g(agent_name, tool)
JOIN agent a ON a.module = 'crm' AND a.name = g.agent_name
ON CONFLICT (agent_id, tool) DO NOTHING;

-- ── 2. Remove the now-stale generic delegate grant ───────────────────────────
-- `reporting` no longer publishes the `agent_reporting` delegate; leaving the grant would
-- let the drift guard's stale-grant intent diverge from the live registry. Safe even if
-- absent (no-op).
DELETE FROM agent_tool_grant g
USING agent a
WHERE g.agent_id = a.id
  AND a.module = 'crm'
  AND a.name = 'reporting'
  AND g.tool = 'agent_reporting';

COMMIT;
