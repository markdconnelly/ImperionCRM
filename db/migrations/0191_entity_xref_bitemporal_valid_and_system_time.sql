-- 0191: bitemporal silver — valid-time close + system-time on the entity-resolution spine
-- (#1112, epic #1049). Migration number 0191 is a PLACEHOLDER claimed at MERGE per system
-- CLAUDE.md §10.3 — authored against the next free number; the rebased branch takes whatever is
-- free just before squash (parallel sessions #981/#1115 this wave grab 0191+ concurrently).
--
-- WHY THIS EXISTS. Epic #1049 makes the data plane trustworthy enough for an autonomous
-- Technician. Slice 1 (#1111, migration 0190) shipped the resolver `entity_resolve()` and seeded
-- the spine. But the spine still only knows ONE time: `valid_from`. An autonomous agent must
-- answer TWO temporal questions before it acts:
--
--   1. VALID-TIME — "what was true WHEN?" A source identity can stop being authoritative (a
--      contact leaves a tenant, a device is decommissioned, a merge corrects a wrong link). With
--      only `valid_from`, a superseded mapping looks exactly as live as the current one and the
--      resolver would still return it. Closing a mapping needs a valid-time END: `valid_to`.
--
--   2. SYSTEM-TIME — "what did we BELIEVE when we acted?" When an agent acts on a resolution and
--      we later correct it, an audit must reconstruct the mapping AS WE KNEW IT at decision time,
--      not as we know it now. `created_at`/`updated_at` are mutable audit columns — UPDATE
--      overwrites the prior belief. System-time needs an immutable open/close pair recording when
--      a ROW (a specific belief) entered and left the store: `system_from` / `system_to`.
--
-- Together `valid_from`/`valid_to` (valid-time) + `system_from`/`system_to` (system-time) make
-- `entity_xref` BITEMPORAL: every mapping carries both "when it was true in the world" and "when
-- we believed it". This is the tracer slice — bitemporality lands on the resolution/xref SPINE
-- (#1111's seam) ONLY, not every silver table. The full temporal KG over all silver is the later
-- #968 / #1152 substrate work.
--
-- THE SEAM (designed by #1111, no signature change). 0190's `entity_resolve()` filters
-- `valid_from <= now()` and its header states #1112 "extends the predicate to
-- `now() < COALESCE(valid_to, 'infinity')` WITHOUT changing the signature or any caller". This
-- migration does exactly that — the function body gains the `valid_to` clause; every existing
-- caller (merges, backend resolver, Technician, the FE arg-encoder) is untouched. A NULL
-- `valid_to` means "still valid" (open-ended), so every row 0190 wrote stays live with no data
-- change.
--
-- ONE LIVE MAPPING. 0160's unconditional UNIQUE (entity_type, source_system, source_key) cannot
-- coexist with bitemporal history — keeping a closed prior version AND a new live one needs two
-- rows for the same source identity. We replace it with a PARTIAL unique index that enforces
-- "at most one OPEN (valid_to IS NULL AND system_to IS NULL) mapping per source identity", so the
-- resolver's scalar return stays well-defined while history is allowed to accumulate. A plain
-- (non-unique) index continues to serve point-in-time history lookups.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). data_class
-- 'operational' (identity mapping, not business data). No PII, no secrets — source_key is a
-- source-system identifier. The spine is EMPTY/deploy-dormant in prod (external_identity is
-- empty), so this backfills `system_from = created_at` on 0 rows now and lights up with the rest
-- of the spine. DORMANT — NOT prod-applied until Mark runs it (Mark-gated, standing turn-word).

BEGIN;

-- ── 1. Valid-time close + system-time open/close ───────────────────────────────────────────────
-- valid_to: when the mapping STOPPED being authoritative in the world. NULL = still valid
-- (open-ended) — the common case and what every 0190-written row keeps. The CHECK forbids an
-- inverted interval (a close before its open) while allowing the open NULL.
ALTER TABLE entity_xref
  ADD COLUMN IF NOT EXISTS valid_to    timestamptz,
  ADD COLUMN IF NOT EXISTS system_from timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS system_to   timestamptz;

-- valid_to, if set, must not precede valid_from (no negative-length valid interval).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entity_xref_valid_interval_ck'
  ) THEN
    ALTER TABLE entity_xref
      ADD CONSTRAINT entity_xref_valid_interval_ck
      CHECK (valid_to IS NULL OR valid_to >= valid_from);
  END IF;
END $$;

-- system_to, if set, must not precede system_from (no negative-length system interval).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entity_xref_system_interval_ck'
  ) THEN
    ALTER TABLE entity_xref
      ADD CONSTRAINT entity_xref_system_interval_ck
      CHECK (system_to IS NULL OR system_to >= system_from);
  END IF;
END $$;

-- Existing rows (from 0190's backfill) belong to a belief that began when the row was created;
-- align system_from with created_at so the system-time axis is consistent end to end. No-op when
-- the spine is empty (the prod case today). The DEFAULT now() handles all future inserts.
UPDATE entity_xref SET system_from = created_at WHERE system_from <> created_at;

COMMENT ON COLUMN entity_xref.valid_to IS
  'Valid-time END: when this mapping stopped being authoritative in the world. NULL = still '
  'valid (open-ended). With valid_from this is the valid-time axis — "what was true when". The '
  'resolver filters now() < COALESCE(valid_to, ''infinity'') so a closed mapping is invisible.';
COMMENT ON COLUMN entity_xref.system_from IS
  'System-time START: when this row (this belief about the mapping) entered the store. With '
  'system_to this is the system-time axis — "what we believed when we acted". Defaults to now() '
  'and is aligned to created_at for rows that predate this column.';
COMMENT ON COLUMN entity_xref.system_to IS
  'System-time END: when this belief was superseded/corrected. NULL = current belief. A '
  'correction closes the old row (sets system_to = now()) and inserts the new one, so an audit '
  'can reconstruct the mapping AS WE KNEW IT at any past instant.';

-- ── 2. One LIVE mapping per source identity (replaces 0160's unconditional unique) ─────────────
-- 0160 enforced UNIQUE (entity_type, source_system, source_key) unconditionally, which cannot
-- coexist with bitemporal history (a closed prior version + a new live one are two rows for the
-- same source identity). Replace it with a PARTIAL unique index over only the OPEN rows so the
-- resolver's scalar return stays well-defined while history accumulates. "Open" = currently true
-- AND currently believed (valid_to IS NULL AND system_to IS NULL).
DROP INDEX IF EXISTS uq_entity_xref_source;
CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_xref_source_live
  ON entity_xref (entity_type, source_system, source_key)
  WHERE valid_to IS NULL AND system_to IS NULL;

-- Point-in-time history lookups (all versions of a source identity, including closed ones) — a
-- plain non-unique index, since the partial unique above no longer covers closed rows.
CREATE INDEX IF NOT EXISTS entity_xref_source_history_idx
  ON entity_xref (entity_type, source_system, source_key);

-- ── 3. Extend the resolver to the valid_to seam (no signature change — #1111's contract) ────────
-- 0190 returned the row with valid_from <= now(); add the valid_to bound + the system-time
-- current-belief bound so the resolver returns the ONE live mapping. Signature, return type,
-- grants, and every caller are unchanged — this is the seam #1111 designed for. STABLE +
-- SECURITY INVOKER as before. COALESCE(valid_to,'infinity') keeps open-ended (NULL) rows live.
CREATE OR REPLACE FUNCTION entity_resolve(
  p_entity_type   text,
  p_source_system text,
  p_source_key    text
)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT x.internal_entity_id
  FROM entity_xref AS x
  WHERE x.entity_type   = p_entity_type
    AND x.source_system = p_source_system
    AND x.source_key    = p_source_key
    AND x.valid_from   <= now()
    AND now() < COALESCE(x.valid_to, 'infinity'::timestamptz)  -- valid-time bound (#1112)
    AND x.system_to IS NULL                                    -- current belief only (#1112)
  ORDER BY x.valid_from DESC           -- defensive: newest live mapping wins if ever >1
  LIMIT 1;
$$;

COMMENT ON FUNCTION entity_resolve(text, text, text) IS
  'Entity-resolution forward lookup (#1111/#1112, epic #1049): (entity_type, source_system, '
  'source_key) -> internal_entity_id, or NULL when unresolved. The ONE callable every merge / '
  'resolver / Technician uses to resolve a source identity before acting. STABLE, reads only '
  'entity_xref. Bitemporal: returns the row valid NOW (valid_from <= now() < COALESCE(valid_to, '
  '''infinity'')) under the CURRENT belief (system_to IS NULL). No PII, no secrets.';

COMMIT;
