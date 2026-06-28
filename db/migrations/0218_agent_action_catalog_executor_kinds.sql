-- 0218: agent_action_catalog — add the 7 backend executor kinds (FE↔BE lockstep). Implements
-- #1497 (epic #1038 / master epic #1491), extends 0217. Migration number 0218 is a PLACEHOLDER
-- claimed at MERGE per system CLAUDE.md §10.3 — the rebased branch takes the next free number.
--
-- WHY THIS EXISTS. 0217 seeded the 15 comms/social catalog kinds, but the BACKEND executes a
-- broader set absent from both the FE catalog and this table: the AI Technician Autotask ticket
-- loop (#257) and the Pax8 procure→provision→bill sequence (#360). Because the cockpit / dial
-- legend renders from `agent_action_catalog` (+ the FE catalog) and the backend gauntlet RESOLVES
-- auto_at_level/always_gate by `kind` at dispatch (BE #435/PR #441), those kinds were invisible to
-- the operator surface and the two catalogs diverged. This migration adds the 7 rows so the DB twin
-- matches the FE catalog (src/lib/agent/action-catalog.ts) and the backend ActionDef tags
-- (ImperionCRM_Backend src/shared/agent/action-catalog.ts) — one fact, kept in LOCKSTEP.
--
-- TAGS (verbatim from the backend ActionDef tags, ADR-0128 D2/D3 / ADR-0109):
--   autotask_update_ticket    T2 operational  auto_at_level 2  (internal ticket write)
--   autotask_post_reply       T2 client_pii   auto_at_level 3  (client-visible reply; data-class ceiling gates v1)
--   autotask_log_time         T2 financial    always_gate      (billable time → invoice; money ceiling)
--   pax8_place_order          T3 financial    always_gate      (external money commit)
--   m365_provision_license    T2 operational  auto_at_level 2  (license assignment)
--   agreement_attach_license  T2 operational  auto_at_level 2  (internal record link)
--   bill_attach_license       T3 financial    always_gate      (feeds invoicing / true-up)
-- consent_class 'none' for all (no contact channel — a ticket the client opened / internal
-- procurement IS the consent context). The three `financial` kinds also carry their own data-class
-- ceiling (data_class.always_gate, mig 0175), evaluated SEPARATELY — always_gate here is the
-- explicit ADR-0109 money declaration, not a duplicate.
--
-- Archetype H (governance/control). App-native config; NOT silver, NOT pipeline-merged → no OKF
-- concept file (semantic-layer-not-affected, the 0217/0163 precedent). Frontend-owned schema
-- (ADR-0042). No PII, no secrets (action kinds + labels + non-sensitive tags). Additive (rows only;
-- the table + grants exist from 0217), idempotent (ON CONFLICT upsert), transactional. NOT
-- prod-applied until Mark runs it (each prod apply is Mark-gated, §10.3).

BEGIN;

INSERT INTO agent_action_catalog (kind, label, tier, data_class, consent_class, auto_at_level, always_gate, executor) VALUES
  -- AI Technician Autotask ticket loop (#257).
  ('autotask_update_ticket',   'Update Autotask ticket',        'T2', 'operational', 'none', 2, false, 'autotask_write'),
  ('autotask_post_reply',      'Post Autotask client reply',    'T2', 'client_pii',  'none', 3, false, 'autotask_write'),
  ('autotask_log_time',        'Log Autotask time entry',       'T2', 'financial',   'none', 5, true,  'autotask_write'),
  -- Pax8 procure→provision→bill sequence (#360). Two financial steps under the money ceiling.
  ('pax8_place_order',         'Place Pax8 order',              'T3', 'financial',   'none', 5, true,  'procurement_dispatch'),
  ('m365_provision_license',   'Provision M365 license',        'T2', 'operational', 'none', 2, false, 'procurement_dispatch'),
  ('agreement_attach_license', 'Attach license to agreement',   'T2', 'operational', 'none', 2, false, 'procurement_dispatch'),
  ('bill_attach_license',      'Attach license to bill',        'T3', 'financial',   'none', 5, true,  'procurement_dispatch')
ON CONFLICT (kind) DO UPDATE
  SET label         = EXCLUDED.label,
      tier          = EXCLUDED.tier,
      data_class    = EXCLUDED.data_class,
      consent_class = EXCLUDED.consent_class,
      auto_at_level = EXCLUDED.auto_at_level,
      always_gate   = EXCLUDED.always_gate,
      executor      = EXCLUDED.executor,
      updated_at    = now();

COMMIT;
