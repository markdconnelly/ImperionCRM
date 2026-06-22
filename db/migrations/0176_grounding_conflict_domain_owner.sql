-- 0176: Grounding-conflict resolution workflow + domain-owner registry (#1035, parent #1033,
-- ADR-01XX, agentic-OS contract 2026-06-21 decision 4 — grounding-conflict → owner resolution).
-- Migration number 0176 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash. The ADR number
-- is likewise a placeholder.
--
-- WHY THIS EXISTS. At grounding time the orchestrator draws on three knowledge tiers (ADR-0114 /
-- #966): canon/OKF (the curated meaning layer, ADR-0086), company silver (the merged tier), and
-- the caller's personal tier (ADR-0114 temporal-KG facts). When two or more DISAGREE about the
-- same concept, the agentic-OS contract (decision 4) is deliberate: do NOT pick a winner by hard
-- precedence and do NOT let the model arbitrate. Instead BUBBLE the conflict to the DOMAIN
-- BUSINESS OWNER to resolve via a workflow — exactly the #968 / ADR-0114 contradiction state
-- machine (personal_contradiction), generalized one tier up to the COMPANY scope.
--
-- This is the company-tier twin of personal_contradiction (0169): same open→approved/dismissed
-- shape, same "never auto-resolved, owner decides, every action ledgered" posture. Two tables:
--   • domain_owner       — per concept/domain → the business owner who resolves its conflicts
--                          (+ a fallback role so an unassigned domain still routes somewhere).
--   • grounding_conflict — a detected tri-tier disagreement awaiting the domain owner's
--                          resolution, carrying the labelled most-authoritative answer the agent
--                          served in the interim (the contract's anti-stall behavior).
--
-- INTERIM ANSWER BEHAVIOR (modeled, not enforced here). The contract rejects hedge/refuse-until-
-- resolved as the default: the agent ANSWERS with the most-authoritative tier, LABELLED
-- (canon/OKF > company_silver > personal, gated by temporal validity), and raises the conflict.
-- This table records WHICH tier was served (`served_tier`) and the labelled summary
-- (`served_label`) so the resolution workflow shows the owner what the agent already told users
-- while the conflict was open. The SELECTION of that tier is a code helper (src/lib/grounding/
-- authority.ts); this schema stores the outcome for the audit + workflow trail.
--
-- RESOLUTION WRITE-BACK (deferred — follow-up issue). When the owner resolves, the authoritative
-- correction must flow back to canon (OKF concept file edit, via an okf-sync issue) or company
-- silver (a merge/source correction in the owning plane). That EXECUTION path is a backend +
-- cross-plane concern and is the deferred follow-up (#TBD); this migration ships the registry,
-- the workflow item, the state machine, and the ledger so the owner-facing surface and the
-- grounding hook land now. The resolution row records the owner's DECISION + a free-text
-- direction; acting on it is the follow-up.
--
-- RLS POSTURE. domain_owner is company-tier reference/config (archetype H) — broad employee read
-- (ADR-0100), admin-managed writes (the 0158/0175 dial precedent). grounding_conflict is a
-- company-scoped workflow row: broad employee READ (any employee may see an open conflict and the
-- interim answer — transparency), but RESOLUTION is restricted to the assigned domain owner OR an
-- admin, enforced by app_grounding_conflict_resolver() read in the data layer's UPDATE filter and
-- expressible as the resolver predicate (no per-client wall — the MSP isolation axis is data_class
-- (0175), not tenant; agentic-OS decision 1). Every resolution is ledgered to
-- grounding_conflict_event (append-only), the personal_curation_event precedent for accountability.
--
-- POSTURE — ADDITIVE + IDEMPOTENT + TRANSACTIONAL, fail-closed. Frontend-owned schema (ADR-0042).
-- No PII (domain slugs + role/owner ids are non-sensitive; conflict `detail`/`served_label` are
-- written by the orchestrator and MUST be PII-free summaries, never row content — the same
-- contract personal_contradiction.detail carries). No secrets. NOT prod-applied until Mark runs
-- it (each prod apply is Mark-gated, §10.3). Archetype H governance/control — NOT silver, NOT
-- pipeline-merged → no per-table OKF concept file (the data_class 0175 precedent;
-- semantic-layer-not-affected). The doctrine + coverage-matrix note the grounding-conflict loop.

BEGIN;

-- ── 1. domain_owner — per concept/domain → the business owner who resolves its conflicts ──────
-- A "domain" is a coarse business area (a concept-file domain or an OKF archetype domain, e.g.
-- 'sales', 'finance', 'cmdb', or a specific concept like 'account'). owner_user_id is the
-- resolving business owner; fallback_role_slug routes conflicts for domains with no named owner
-- (or while an owner is out) to a role (app.groups slug, ADR-0105) so nothing stalls unrouted.
CREATE TABLE IF NOT EXISTS domain_owner (
  domain             text PRIMARY KEY,                 -- concept/domain slug (matches OKF domain or concept name)
  label              text NOT NULL,                     -- human-readable domain name
  owner_user_id      uuid REFERENCES app_user(id) ON DELETE SET NULL,  -- the resolving business owner (nullable)
  fallback_role_slug text NOT NULL DEFAULT 'admin',     -- routes here when owner_user_id is NULL (app.groups slug)
  description        text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE domain_owner IS
  'Domain-owner registry (#1035, agentic-OS contract decision 4): per concept/domain → the '
  'business owner who resolves grounding conflicts in that domain (fallback_role_slug routes '
  'unassigned domains to a role so nothing stalls). Company-tier reference/config (archetype H); '
  'broad employee read, admin-managed writes. No PII, no secrets.';

CREATE INDEX IF NOT EXISTS idx_domain_owner_owner ON domain_owner (owner_user_id);

DROP TRIGGER IF EXISTS trg_domain_owner_updated ON domain_owner;
CREATE TRIGGER trg_domain_owner_updated BEFORE UPDATE ON domain_owner
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed = one row per coarse business domain, owner UNASSIGNED (Mark assigns owners post-apply
-- from the cockpit — a DATA change, never schema). fallback_role_slug points each domain at the
-- role that most naturally owns it so conflicts route sanely even before named owners land.
INSERT INTO domain_owner (domain, label, fallback_role_slug, description) VALUES
  ('sales',     'Sales & CRM',        'sales',           'Leads, contacts, accounts, opportunities, proposals.'),
  ('finance',   'Finance',            'finance',         'Invoices, expense, time, AR, QBO/Autotask financial mirrors.'),
  ('delivery',  'Delivery & Projects','project_manager', 'Projects, tasks, sale→delivery orchestration.'),
  ('service',   'Service Desk',       'support',         'Tickets, SLAs, service requests, problems/changes.'),
  ('cmdb',      'CMDB & Assets',      'support',         'Configuration items, assets, cloud assets, devices.'),
  ('security',  'Security & Posture', 'security',        'Security posture, findings, credential registry metadata.'),
  ('marketing', 'Marketing',          'sales',           'Campaigns, journeys, events, social.'),
  ('platform',  'Platform & Governance','admin',         'Agent governance, OKF canon, schema, cross-cutting concepts.')
ON CONFLICT (domain) DO UPDATE
  SET label = EXCLUDED.label,
      fallback_role_slug = EXCLUDED.fallback_role_slug,
      description = EXCLUDED.description;

-- ── 2. grounding_conflict — a tri-tier disagreement awaiting the domain owner's resolution ────
-- served_tier/served_label record the labelled most-authoritative answer the agent gave in the
-- interim (the anti-stall contract). status is the #968 / personal_contradiction state machine,
-- one tier up. resolution_tier records which tier the owner affirmed as correct; resolution_note
-- carries the owner's free-text direction for the (deferred) write-back path.
CREATE TABLE IF NOT EXISTS grounding_conflict (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain          text NOT NULL REFERENCES domain_owner(domain) ON DELETE RESTRICT, -- routes to the owner
  concept         text,                                  -- the specific concept/entity in conflict (e.g. 'account')
  -- which tiers disagreed (at least two true); the booleans keep this queryable without parsing detail.
  canon_claim     text,                                  -- canon/OKF's value/claim (PII-free summary) — NULL if tier silent
  company_claim   text,                                  -- company silver's value/claim (PII-free summary)
  personal_claim  text,                                  -- personal tier's value/claim (PII-free summary)
  detail          text NOT NULL,                         -- human-readable description of the disagreement (PII-free)
  -- the interim answer the agent served (anti-stall): which tier won + the labelled summary shown.
  served_tier     text NOT NULL
                    CHECK (served_tier IN ('canon','company_silver','personal')),
  served_label    text NOT NULL,                         -- the labelled most-authoritative answer text served
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','resolved','dismissed')),
  resolution_tier text CHECK (resolution_tier IN ('canon','company_silver','personal')), -- which tier the owner affirmed
  resolution_note text,                                  -- owner's direction for the write-back (deferred path)
  resolved_by     uuid REFERENCES app_user(id),
  resolved_at     timestamptz,
  raised_by       text,                                  -- the agent/run that raised it (e.g. agent slug or run id ref)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE grounding_conflict IS
  'A grounding-time disagreement between canon/OKF, company silver, and/or the personal tier '
  '(#1035, agentic-OS contract decision 4) — the company-tier twin of personal_contradiction. '
  'Routes to its domain_owner; never auto-resolved. served_tier/served_label record the labelled '
  'most-authoritative interim answer the agent served (anti-stall). PII-free summaries only.';

CREATE INDEX IF NOT EXISTS idx_grounding_conflict_domain_status ON grounding_conflict (domain, status);
CREATE INDEX IF NOT EXISTS idx_grounding_conflict_status ON grounding_conflict (status);

DROP TRIGGER IF EXISTS trg_grounding_conflict_updated ON grounding_conflict;
CREATE TRIGGER trg_grounding_conflict_updated BEFORE UPDATE ON grounding_conflict
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. grounding_conflict_event — append-only ledger of raise + resolution (accountability) ───
-- Every conflict raise and every resolution/dismissal is one row; never updated or deleted. The
-- personal_curation_event precedent — this is the audit trail proving who resolved what, when.
CREATE TABLE IF NOT EXISTS grounding_conflict_event (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id uuid NOT NULL REFERENCES grounding_conflict(id) ON DELETE CASCADE,
  actor       text NOT NULL,                             -- 'orchestrator' (raise) | app_user.id (resolve)
  action      text NOT NULL
                CHECK (action IN ('raise','resolve','dismiss','reassign')),
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,        -- action context (PII-free; tiers, served_tier, decision)
  at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE grounding_conflict_event IS
  'Append-only ledger of every grounding_conflict raise/resolve/dismiss/reassign (#1035). One '
  'row per action; never mutated. The accountability control over the conflict workflow (the '
  'personal_curation_event precedent). PII-free context only, no secrets.';

CREATE INDEX IF NOT EXISTS idx_grounding_conflict_event_conflict ON grounding_conflict_event (conflict_id, at DESC);

-- ── 4. app_grounding_conflict_resolver(text): may the caller resolve conflicts in this domain? ─
-- TRUE when the caller is the domain's named owner_user_id (app.user_id) OR holds the domain's
-- fallback_role_slug (app.groups) OR is admin. STABLE + SECURITY DEFINER so the predicate reads
-- domain_owner under the non-owner app role (config, not row-scoped). Fail-closed: unknown domain
-- / unset context → FALSE. Read by the data layer's resolve UPDATE filter (and reusable by the
-- backend at the write-back path).
CREATE OR REPLACE FUNCTION app_grounding_conflict_resolver(target_domain text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- admin always
    'admin' = ANY (COALESCE(current_setting('app.groups', true), '{}')::text[])
    OR EXISTS (
      SELECT 1 FROM domain_owner d
      WHERE d.domain = target_domain
        AND (
          -- the named business owner
          d.owner_user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
          -- or the routed fallback role
          OR d.fallback_role_slug = ANY (
            COALESCE(current_setting('app.groups', true), '{}')::text[]
          )
        )
    );
$$;
COMMENT ON FUNCTION app_grounding_conflict_resolver(text) IS
  'TRUE when the caller may resolve grounding conflicts in target_domain: the domain''s named '
  'owner (app.user_id), the domain''s fallback role (app.groups), or admin (#1035). Fail-closed. '
  'Read by the resolve path so reads and the (deferred) write-back share one rule.';

-- ── 5. Row-level security ─────────────────────────────────────────────────────────────────────
-- domain_owner: broad employee read (reference/config, ADR-0100); admin-managed writes are
-- granted at the role level (web role), not gated by a row policy (the 0175 data_class_role_grant
-- precedent — config tables are role-granted, not row-scoped). No RLS on the reference table.
--
-- grounding_conflict: broad employee READ (transparency — any employee sees open conflicts + the
-- interim answer). RESOLVE is restricted by the resolver predicate at the data-layer UPDATE
-- filter; we ALSO express it as an RLS WITH CHECK so an UPDATE that sets a resolution is only
-- permitted by a resolver. SELECT stays open to signed-in employees.
ALTER TABLE grounding_conflict ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS grounding_conflict_read ON grounding_conflict;
CREATE POLICY grounding_conflict_read ON grounding_conflict
  FOR SELECT
  USING (current_setting('app.user_id', true) IS NOT NULL);  -- any signed-in employee (context set)

DROP POLICY IF EXISTS grounding_conflict_resolve ON grounding_conflict;
CREATE POLICY grounding_conflict_resolve ON grounding_conflict
  FOR UPDATE
  USING (app_grounding_conflict_resolver(domain))
  WITH CHECK (app_grounding_conflict_resolver(domain));

-- The orchestrator raises conflicts via its backend role; allow INSERT by the backend role (and
-- web, which may surface a raise from an operator). No INSERT policy restriction beyond the role
-- grant — a raise is not a privileged act, it is the anti-stall signal.
DROP POLICY IF EXISTS grounding_conflict_insert ON grounding_conflict;
CREATE POLICY grounding_conflict_insert ON grounding_conflict
  FOR INSERT
  WITH CHECK (true);

-- grounding_conflict_event: append-only ledger; broad employee read, INSERT by any writer role.
ALTER TABLE grounding_conflict_event ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grounding_conflict_event_read ON grounding_conflict_event;
CREATE POLICY grounding_conflict_event_read ON grounding_conflict_event
  FOR SELECT
  USING (current_setting('app.user_id', true) IS NOT NULL);
DROP POLICY IF EXISTS grounding_conflict_event_insert ON grounding_conflict_event;
CREATE POLICY grounding_conflict_event_insert ON grounding_conflict_event
  FOR INSERT
  WITH CHECK (true);

-- ── 6. Grants (defensive; roles may be absent in some envs) ───────────────────────────────────
DO $$
BEGIN
  -- Web: render the registry + the conflict queue; admins manage the registry; resolvers resolve.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON domain_owner TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE ON grounding_conflict TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT ON grounding_conflict_event TO "mgid-imperioncrm-web-prd";
    GRANT EXECUTE ON FUNCTION app_grounding_conflict_resolver(text) TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  -- Backend: the orchestrator raises conflicts + (follow-up) executes the write-back on resolve.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON grounding_conflict TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT ON grounding_conflict_event TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON domain_owner TO "mgid-imperioncrmbackendfunction";
    GRANT EXECUTE ON FUNCTION app_grounding_conflict_resolver(text) TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
END $$;

COMMIT;
