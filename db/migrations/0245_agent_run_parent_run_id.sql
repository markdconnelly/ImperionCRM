-- 0245: agent_run.parent_run_id — the tier-delegation child→parent run link for the
-- synchronous orchestration chain (backend ADR-0106, tiered orchestration bridge; #1746).
--
-- When the orchestrator delegates Nova → C-suite → domain (the ICM tiered org mapped onto
-- the runtime), each tier opens its OWN agent_run. `parent_run_id` links a child run to the
-- run that delegated to it, so a request's tier hops form a parent/child run TREE under one
-- conversation_id. This extends the ADR-0080 three-level correlation
-- (conversation → run → step) with a tier axis (conversation → run-tree → step).
--
-- NULL = a ROOT run: Nova's own run, or any legacy single-tier run — so the change is purely
-- additive and backward-compatible (every existing run reads as a root).
--
-- Migration number 0245 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 —
-- authored against a placeholder; the rebased branch takes the next free number just before
-- squash. If another migration merges during the CI window, renumber this file + every
-- reference (the data-model ERD edit, the PR body).
--
-- ARCHETYPE: operational agent-runtime telemetry — NOT a curated silver business entity, so
-- it has no OKF concept file by design (the semantic-layer docs-gate is not affected). Like
-- conversation_id (migration 0163), this is a nullable correlation FK with no ON DELETE
-- cascade: agent_run is an append-only ledger (ADR-0080), runs are not deleted. The backend
-- writes the link on each tier hop; the web app SELECTs it for the run-tree view. The column
-- carries an id only — no PII, no secrets.

ALTER TABLE agent_run
  ADD COLUMN IF NOT EXISTS parent_run_id uuid REFERENCES agent_run(id);

COMMENT ON COLUMN agent_run.parent_run_id IS
  'The agent_run that delegated to this run — the tier-delegation child→parent link (backend ADR-0106). NULL for a root run. Forms the per-request tier run-tree under conversation_id (ADR-0080 correlation).';

-- "Children of a run" lookups (the run-tree walk) hit this column; index it like the other
-- agent_run correlation FKs (idx_agent_run_conversation, migration 0163).
CREATE INDEX IF NOT EXISTS idx_agent_run_parent ON agent_run (parent_run_id);
