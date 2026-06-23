-- 0191: privileged curation service identity — the personal→company boundary-crosser
-- (#981, parent #976 / #967, ADR-0105 §3c). Migration number 0191 is a PLACEHOLDER claimed
-- at MERGE per system CLAUDE.md §10.3 — the rebased branch takes the next free number just
-- before squash, and every reference is renumbered then. Do NOT prod-apply (each apply is
-- Mark-gated, and this is a Mark-gated design throughout — the highest-privilege component).
--
-- WHY THIS EXISTS. The access spine's two axes (owner 0153, company/role 0186, data_class
-- 0175) keep employees and the agents acting AS them inside their own reach. But the design
-- (#966 decision 5/6, #967) also requires ONE privileged actor that legitimately moves
-- knowledge ACROSS the personal→company wall: the autonomous curation/promotion agent. It has
-- NO user in the loop, so it cannot borrow a user token. It gets its OWN identity, a NARROW
-- audited write-scope, and its OWN append-only ledger — the highest-privilege, highest-risk
-- component, built last with the most scrutiny.
--
-- DISTINCT FROM the Personal Curator (0169, ADR-0114 amendment). That actor
-- (`imperion-personal-curator`) is INTRA-OWNER: it reads+writes broadly within the personal
-- tier and only ever writes back to the SAME owner_user_id it read; it never crosses the wall.
-- THIS actor (`imperion-curation-promoter`, ADR-0105 §3c) is the CROSS-WALL promoter: it reads
-- personal facts ONLY to PROPOSE a company-side promotion, and a human approves before the
-- company write is applied. Two different roles, two different ledgers, two different policy
-- shapes — they coexist (ADR-0105 amendment 2026-06-22 records the coexistence).
--
-- THE FOUR §3c INVARIANTS (resolved 2026-06-20, ADR-0105 §3c), made enforceable here:
--   1. NO BYPASSRLS. The promoter is a non-BYPASSRLS managed-identity → Postgres login with
--      explicit, narrow GRANTs + dedicated curation RLS policies scoped to the promotion path
--      only — never a blanket superuser. (INFRA provisions the login Phase-2; FE owns the
--      POLICIES + ledger + promotion-target schema; the BACKEND owns the runtime, a BE issue.)
--   2. APPEND-ONLY LEDGER. Every cross-wall action is written to `curation_event` — no
--      exceptions. The promoter may INSERT (never UPDATE/DELETE) its ledger.
--   3. HUMAN-APPROVED PROMOTION, never silent. The promoter may read-personal-to-propose and
--      WRITE A PROPOSAL (`status='draft'`) into `curation_promotion`; it CANNOT apply it. A
--      human (the app role, an approver) flips draft→approved and applies the company write.
--      This mirrors the engagement_answer agent-draft pattern (source='agent', ADR-0027):
--      "explicit, never silent" IS the approval gate.
--   4. NON-IMPERSONATION (hard invariant). The promoter acts AS ITSELF. Its policies key on
--      `current_user` (the connection's DB login role) — NOT a settable GUC — so it can never
--      be satisfied by the web/backend app role spoofing `app.user_id`/`app.oid`. The promoter
--      never calls withIdentity with a borrowed user context; it has no owner-axis reach. This
--      is the STRUCTURAL guarantee it cannot read a drawer AS its owner. (Same role-keyed
--      mechanic the Personal Curator god-view, 0169, chose over a spoofable GUC.)
--
-- ROLE-BASED, NOT GUC. `current_user = 'imperion-curation-promoter'` is valid SQL even before
-- the role exists (it simply never matches), so this is forward-compatible with the Phase-2
-- role provisioning. **CONTRACT: Phase-2 must provision the promoter's managed-identity login
-- role as `imperion-curation-promoter` (non-BYPASSRLS); if infra names it differently, update
-- the policies + grants below.**
--
-- THE PROMOTION SOURCE is the personal tier (personal_fact, 0168 — the synthesized
-- owner-private knowledge facts). The promoter reads it ONLY to propose; its read policy admits
-- it as a permissive god-view (like 0169's curator) but it has NO write path on personal_fact
-- here — it cannot mutate a personal drawer, only cite one in a proposal.
--
-- POSTURE — ADDITIVE + FAIL-CLOSED, ZERO behavior change on apply: both new tables are
-- greenfield (no live read path retrofitted); the new permissive read policy on personal_fact
-- only widens reach for a role that does not yet exist (Phase-2), so applying this changes
-- nothing for the web/backend app role. An unset context / a non-promoter caller matches no
-- promoter branch (fail-closed).
--
-- Archetype H (governance/control), horizontal Audit/governance domain — twin of the access
-- spine's other control tables (data_class_role_grant 0175, personal_curation_event 0169).
-- App-native config/control; NOT silver, NOT pipeline-merged → no OKF concept file (the
-- 0153/0169/0175/0186/0187 greenfield-control precedent; semantic-layer-not-affected).
-- Frontend-owned schema (ADR-0042). No PII, no secrets (subject refs are object pointers, not
-- content; role slugs are non-sensitive). Additive, idempotent, transactional. DORMANT — NOT
-- prod-applied until the orchestrator/Mark runs it. After apply, verify with the curation-
-- identity matrix in docs/testing/rls-access-spine.md.

BEGIN;

-- ── 1. curation_promotion — the company-side promotion TARGET (draft→approve) ───────────────
-- The proposal the cross-wall promoter writes: a candidate company-tier fact synthesized from a
-- personal-tier source, held as a DRAFT until a human approves+applies it. Mirrors the
-- engagement_answer agent-draft pattern (ADR-0027): source='agent' rows START as draft and
-- require a human stamp. The promoter INSERTs `status='draft'`; a human (app role) flips it to
-- 'approved' and, on apply, 'applied'. 'rejected' closes it. The company-side write the apply
-- performs is the consumer's concern (a BE issue); this table is the governed envelope + audit
-- anchor for it.
CREATE TABLE IF NOT EXISTS curation_promotion (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Provenance: the personal-tier source being promoted. Polymorphic by origin (the 0168
  -- personal_fact precedent) — a (source_kind, source_id) pair, no FK (the target is one of
  -- several personal tables and the row may later be purged by retention). source_owner_user_id
  -- records WHOSE drawer it came from (audit; never used to grant the promoter owner-axis reach).
  source_kind         text NOT NULL
                        CHECK (source_kind IN ('personal_fact', 'memory_drawer')),
  source_id           uuid NOT NULL,
  source_owner_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  -- The proposed company-tier knowledge, as a string triple (subject/predicate/object — the
  -- 0168 shape). The APPLY step turns this into a real company row; here it is the proposal.
  proposed_subject    text NOT NULL,
  proposed_predicate  text NOT NULL,
  proposed_object     text NOT NULL,
  rationale           text,                          -- why the promoter proposed it (no PII bodies)
  confidence          real,                          -- optional synthesis confidence
  -- Lifecycle: draft (promoter wrote it) → approved (human OK'd) → applied (company write done)
  -- | rejected (human declined). Promoter writes only 'draft'; everything else is the human path.
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'approved', 'applied', 'rejected')),
  proposed_by         text NOT NULL DEFAULT 'imperion-curation-promoter',  -- the service identity
  proposed_at         timestamptz NOT NULL DEFAULT now(),
  reviewed_by_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,     -- the human approver
  reviewed_at         timestamptz,
  applied_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE curation_promotion IS
  'Cross-wall promotion proposals (#981, ADR-0105 §3c): a candidate company-tier fact the '
  'curation promoter synthesized FROM a personal-tier source, held as DRAFT until a human '
  'approves+applies it (engagement_answer agent-draft pattern, ADR-0027 — "explicit, never '
  'silent" = the approval gate). The promoter INSERTs draft only; the human path flips '
  'approved/applied/rejected. Governance/control (archetype H); subject refs are object '
  'pointers, NOT personal content — no PII, no secrets.';

CREATE INDEX IF NOT EXISTS ix_curation_promotion_status ON curation_promotion (status, proposed_at DESC);
CREATE INDEX IF NOT EXISTS ix_curation_promotion_source ON curation_promotion (source_kind, source_id);

DROP TRIGGER IF EXISTS trg_curation_promotion_updated ON curation_promotion;
CREATE TRIGGER trg_curation_promotion_updated BEFORE UPDATE ON curation_promotion
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. curation_event — the append-only cross-wall audit ledger (§3c invariant 2) ───────────
-- One row per cross-wall action the promoter takes: 'proposed' (it wrote a draft) and 'applied'
-- (a human apply happened, ledgered for completeness). Append-only — the promoter may INSERT,
-- never UPDATE/DELETE (no UPDATE/DELETE grant + no updated_at trigger). This is the audit
-- control that keeps the highest-privilege actor accountable: every cross-wall action is
-- ledgered, no exceptions. Distinct from personal_curation_event (0169) which ledgers the
-- INTRA-owner curator; this ledgers the CROSS-wall promoter.
CREATE TABLE IF NOT EXISTS curation_event (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor           text NOT NULL,                     -- the service identity ('imperion-curation-promoter')
  action          text NOT NULL
                    CHECK (action IN ('proposed', 'applied', 'rejected')),
  promotion_id    uuid REFERENCES curation_promotion(id) ON DELETE SET NULL,  -- the proposal this concerns
  source_kind     text,                              -- echoed source pointer (audit, survives promotion purge)
  source_id       uuid,
  source_owner_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,       -- whose wall was crossed
  detail          jsonb NOT NULL DEFAULT '{}'::jsonb, -- action context (provenance only; NO personal content)
  at              timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE curation_event IS
  'Append-only ledger of every cross-wall curation action (#981, ADR-0105 §3c invariant 2): '
  'one row per proposed/applied/rejected. Never updated or deleted — the promoter may INSERT '
  'only. The audit control that makes the personal→company boundary-crosser accountable. '
  'Distinct from personal_curation_event (0169, the intra-owner curator). Governance/control '
  '(H); detail carries provenance pointers, never personal content — no PII, no secrets.';

CREATE INDEX IF NOT EXISTS ix_curation_event_promotion ON curation_event (promotion_id, at DESC);
CREATE INDEX IF NOT EXISTS ix_curation_event_owner     ON curation_event (source_owner_user_id, at DESC);

-- ══ Row-level security ══════════════════════════════════════════════════════════════════════
-- All policies key on `current_user` (the DB login role), NOT a settable GUC — the §3c
-- non-impersonation guarantee: only a connection actually authenticated AS the promoter role
-- satisfies the promoter branch; the web/backend app role spoofing app.user_id cannot. The
-- human-review path is the app role (the existing identity plumbing); the company-axis / owner
-- policies on the TARGET company table are out of scope here.

ALTER TABLE curation_promotion ENABLE ROW LEVEL SECURITY;
ALTER TABLE curation_event     ENABLE ROW LEVEL SECURITY;

-- ── 2a. curation_promotion — promoter PROPOSES (draft only); human REVIEWS/APPLIES ──────────
-- Promoter: may SELECT (see what it already proposed, avoid dupes) + INSERT a DRAFT. The
-- WITH CHECK pins status='draft' AND proposed_by = the role — the promoter CANNOT write an
-- already-approved/applied proposal, the structural half of "human-approved, never silent".
DROP POLICY IF EXISTS curation_promotion_promoter ON curation_promotion;
CREATE POLICY curation_promotion_promoter ON curation_promotion
  FOR ALL
  TO PUBLIC
  USING (current_user = 'imperion-curation-promoter')
  WITH CHECK (
    current_user = 'imperion-curation-promoter'
    AND status = 'draft'
    AND proposed_by = 'imperion-curation-promoter'
  );

-- Human reviewer (the app role): admin/finance/exec roles review the promotion queue. Whole-
-- table role gate on app.groups (the 0186 company-axis mechanic) — only privileged human roles
-- see + act on proposals; an ordinary technician cannot. The promoter cannot satisfy THIS
-- branch (it has no app.groups). The two branches are OR'd (permissive), so the promoter sees
-- its drafts via its own branch and humans review via theirs.
DROP POLICY IF EXISTS curation_promotion_reviewer ON curation_promotion;
CREATE POLICY curation_promotion_reviewer ON curation_promotion
  FOR ALL
  TO PUBLIC
  USING ('admin' = ANY(COALESCE(current_setting('app.groups', true), '{}')::text[])
         OR 'finance' = ANY(COALESCE(current_setting('app.groups', true), '{}')::text[]))
  WITH CHECK ('admin' = ANY(COALESCE(current_setting('app.groups', true), '{}')::text[])
              OR 'finance' = ANY(COALESCE(current_setting('app.groups', true), '{}')::text[]));

-- ── 2b. curation_event — promoter APPENDS; humans + owner READ ──────────────────────────────
-- Promoter: INSERT only (append-only ledger; no UPDATE/DELETE grant enforces this at the
-- privilege layer too). Reviewer (admin/finance): SELECT the ledger (oversight). The crossed
-- owner: SELECT events touching THEIR drawer (transparency — they can see when their personal
-- knowledge was promoted), via the owner axis on app.user_id.
DROP POLICY IF EXISTS curation_event_promoter ON curation_event;
CREATE POLICY curation_event_promoter ON curation_event
  FOR INSERT
  TO PUBLIC
  WITH CHECK (current_user = 'imperion-curation-promoter' AND actor = current_user);

DROP POLICY IF EXISTS curation_event_reviewer ON curation_event;
CREATE POLICY curation_event_reviewer ON curation_event
  FOR SELECT
  TO PUBLIC
  USING ('admin' = ANY(COALESCE(current_setting('app.groups', true), '{}')::text[])
         OR 'finance' = ANY(COALESCE(current_setting('app.groups', true), '{}')::text[]));

DROP POLICY IF EXISTS curation_event_owner ON curation_event;
CREATE POLICY curation_event_owner ON curation_event
  FOR SELECT
  TO PUBLIC
  USING (source_owner_user_id = current_setting('app.user_id', true)::uuid);

-- ── 3. personal_fact — promoter READ-TO-PROPOSE god-view (NO write path) ────────────────────
-- The promoter reads personal_fact ONLY to propose a promotion (§3c: "cannot read a personal
-- drawer except to propose"). A permissive SELECT-only policy keyed on the promoter role — the
-- same role-keyed god-view shape 0169's curator uses, but SELECT-only (FOR SELECT, and the
-- grant below is SELECT-only) so the promoter can NEVER mutate a personal drawer; it may only
-- cite one in a curation_promotion. This is OR'd with the existing owner policy (0168) and the
-- intra-owner curator policy (0169), so it only ADDS the promoter's read reach.
DROP POLICY IF EXISTS personal_fact_promoter_read ON personal_fact;
CREATE POLICY personal_fact_promoter_read ON personal_fact
  FOR SELECT
  TO PUBLIC
  USING (current_user = 'imperion-curation-promoter');

-- ── 4. Grants (defensive; roles may be absent in some envs) ─────────────────────────────────
DO $$
BEGIN
  -- Web: the human review surface — list/approve/reject/apply proposals, read the ledger.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, UPDATE ON curation_promotion TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT ON curation_event     TO "mgid-imperioncrm-web-prd";  -- ledger the human apply/reject
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  -- Backend: the orchestrator may surface the queue; the promoter runtime acts as its OWN role.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON curation_promotion, curation_event TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  -- Curation promoter (Phase-2 — INFRA-provisioned, non-BYPASSRLS). NARROW write-scope (§3c
  -- invariant 1): SELECT+INSERT proposals (drafts), INSERT the ledger, SELECT personal_fact to
  -- propose. NO UPDATE/DELETE anywhere (cannot apply a promotion, cannot rewrite the ledger,
  -- cannot mutate a personal drawer) — the privilege layer reinforces the RLS policies.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-curation-promoter') THEN
    GRANT SELECT, INSERT ON curation_promotion TO "imperion-curation-promoter";
    GRANT INSERT          ON curation_event     TO "imperion-curation-promoter";
    GRANT SELECT          ON personal_fact       TO "imperion-curation-promoter";  -- read-to-propose only
  ELSE
    RAISE NOTICE 'role imperion-curation-promoter absent (Phase-2) — skipping promoter grants.';
  END IF;
END $$;

COMMIT;
