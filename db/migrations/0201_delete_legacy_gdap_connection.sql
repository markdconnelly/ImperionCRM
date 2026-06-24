-- 0201: Remove the legacy `gdap` connection row (ADR-0122, epic #1256).
--
-- Migration number 0201 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 —
-- authored against the next free slot above origin/main's 0200; the branch that merges last
-- renumbers. Nothing depends on this number (it is a one-shot data cleanup, no schema change).
--
-- WHY THIS EXISTS. GDAP (Granular Delegated Admin Privileges) admin-consent belongs to the
-- Microsoft 365 onboarding flow, NOT to a standalone Connection. The `gdap` company
-- `connection` row was a hand-seeded artifact carrying a non-conforming
-- `kv://imperion/conn/gdap` reference that points at no real Key Vault secret, and it renders
-- in no connector card (it is not in COMPANY_PROVIDERS). It was pure confusion on the
-- connections surface — the grilled decision (ADR-0122) is to delete it.
--
-- The `connection_provider` enum VALUE `gdap` is intentionally left in place: Postgres cannot
-- drop an enum value without rebuilding the type, and no code path should reference it once the
-- row is gone. This migration is forward-only and idempotent (re-running deletes nothing once
-- the row is removed).

DELETE FROM connection WHERE provider = 'gdap';
