-- 0074: `ticket.queue` — Autotask queue on silver ticket (#219, ADR-0046
-- "Future considerations": the queue filter deferred from #92).
--
-- Bronze `autotask_tickets` has carried `queue_id` since migration 0038 (both the
-- webhook and bulk paths populate it via the shared flattener, hash-parity pinned),
-- but silver `ticket` (0014/0050) had no queue column, so the ADR-0046 ticket-board
-- filter block shipped without the originally-requested QUEUE select. This adds the
-- column; the cloud pipeline's `mergeTicketSources` maps bronze queue_id -> queue
-- (ImperionCRM_Pipeline follow-up PR — sequenced AFTER this migration so the merge
-- never references a missing column).
--
-- LABEL-LOOKUP DECISION (documented per the pipeline analysis on #219): `queue` is
-- plain nullable text holding the RAW Autotask queue id — the numeric picklist
-- VALUE, not a human label. Autotask exposes labels only via the
-- `/Tickets/entityInformation/fields` picklist endpoint; resolving them is a
-- separate pipeline/on-prem concern (filed as polish). Filtering and saved views
-- work correctly on raw ids today; when a label lookup lands, it can either decorate
-- at read time or backfill this column — no schema change needed either way.
--
-- No grant changes: 0050's table-level grants on `ticket` (web SELECT; cloud
-- pipeline SELECT/INSERT/UPDATE; backend + local-pipeline SELECT) cover new columns.
--
-- Additive, idempotent, transactional. No secrets.

BEGIN;

ALTER TABLE ticket ADD COLUMN IF NOT EXISTS queue text;

COMMENT ON COLUMN ticket.queue IS
  'Autotask queue (raw queue_id picklist value as text — label lookup is deferred polish, see #219). Populated by the cloud pipeline merge.';

-- The board filters and the filter-options DISTINCT both hit this.
CREATE INDEX IF NOT EXISTS ix_ticket_queue ON ticket (queue);

COMMIT;
