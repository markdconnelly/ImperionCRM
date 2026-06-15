-- 0113 e-signature — DocuSign envelope schema (ADR-0071, issue #391)
-- Migration number 0113 claimed at merge (concurrency contract §10.3): a rebased
-- branch takes the next free number just before squash; if another migration merges
-- during the CI window, renumber the file (rename is data-safe).
--
-- The schema heavy lane of the e-signature vertical (epic #318, ADR-0071). A proposal
-- (ADR-0019) is the signable artifact; today there is no path from a proposal to a
-- signature, so sales sign elsewhere and hand-update status. This makes the signature
-- event first-class. DocuSign is the chosen provider (ADR-0071 option C): the backend
-- mints a JWT token from Key Vault and sends the envelope (it holds the credentials —
-- ADR-0034/0042, front end NEVER holds a provider key); the pipeline receives DocuSign
-- Connect webhooks and upserts status by (provider, external_ref) (ADR-0012). This
-- front end only READS the envelope for display. Send + webhook are DORMANT until
-- DocuSign JWT consent lands (#318/#392) — the schema ships now so the status surface
-- (#395) and the backend send (#392/#393) / pipeline webhook (#394) build against it.
--
-- Two changes:
--
--   1. esign_envelope (NEW, silver) — one DocuSign envelope per send attempt against a
--      proposal. proposal_id NOT NULL → proposal CASCADE (an envelope is meaningless
--      without its proposal, and proposal already CASCADEs from opportunity).
--      contract_id → contract SET NULL (the contract created from the signed proposal,
--      ADR-0044 — set on completion, optional). provider defaults 'docusign' but the
--      column keeps the abstraction open (a new provider needs an ADR, ADR-0071 future).
--      external_ref = the DocuSign envelope_id (ADR-0012 upsert key; (provider,
--      external_ref) partial-UNIQUE = idempotent webhook upsert; partial so a locally
--      created envelope with no id yet does not collide). status ladder
--      created→sent→delivered→completed|declined|voided (ADR-0071 decision 3). On
--      completed the backend stores the signed PDF + certificate of completion as
--      referenced blobs (signed_pdf_uri / certificate_uri — Postgres holds the pointer,
--      not the PDF; ADR-0071 decision 5). recipients jsonb carries signer order/role/
--      status without a child table (ADR-0071 sketch — jsonb on the envelope), grows
--      without a migration.
--
--   2. proposal + contract gain an esign_status mirror column (ADR-0071 sketch:
--      "proposal gains an esign status mirror for fast read"). The envelope is the
--      source of record for signature state; this denormalized mirror lets a proposal /
--      contract list render the signing state without joining the envelope. ADR-0019
--      still owns the proposal lifecycle enum (proposal_status) — this is a SEPARATE,
--      nullable e-sign mirror, not that enum. The completed→signed lifecycle coupling
--      (advance proposal, create contract) is a backend process (ADR-0019/0071
--      decision 4), not in this migration.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets. DocuSign holds signer PII + signed
-- documents (a security-review item at build, ADR-0071) — this migration creates
-- structure only, no data, and stores only blob pointers, never the documents.

BEGIN;

-- ── esign_envelope: one DocuSign envelope against a proposal (ADR-0071) ──────────
CREATE TABLE IF NOT EXISTS esign_envelope (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id     uuid NOT NULL REFERENCES proposal(id) ON DELETE CASCADE,
  contract_id     uuid REFERENCES contract(id) ON DELETE SET NULL,  -- created from the signed proposal (ADR-0044)
  provider        text NOT NULL DEFAULT 'docusign',
  external_ref    text,                  -- DocuSign envelope_id (ADR-0012 upsert key)
  status          text NOT NULL DEFAULT 'created'
                    CHECK (status IN ('created', 'sent', 'delivered', 'completed', 'declined', 'voided')),
  recipients      jsonb NOT NULL DEFAULT '[]'::jsonb,   -- signer order/role/status (ADR-0071 sketch)
  signed_pdf_uri  text,                  -- pointer to the signed, certified PDF blob (set on completed)
  certificate_uri text,                  -- pointer to the DocuSign certificate-of-completion blob
  sent_at         timestamptz,
  delivered_at    timestamptz,
  completed_at    timestamptz,
  declined_at     timestamptz,
  voided_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE esign_envelope IS
  'One DocuSign e-signature envelope against a proposal (ADR-0071, #391). The backend mints a JWT token from Key Vault and sends it (ADR-0034/0042 — front end never holds the provider key); the pipeline upserts status from DocuSign Connect webhooks by (provider, external_ref) (ADR-0012). This front end only reads. Signed PDF + certificate of completion are referenced blobs (signed_pdf_uri / certificate_uri), not stored inline. recipients (signer PII) + signed documents are sensitive — keep specifics out of docs/issues.';
COMMENT ON COLUMN esign_envelope.external_ref IS
  'DocuSign envelope_id (ADR-0012). (provider, external_ref) is the idempotent upsert key for the Connect webhook; partial-UNIQUE so a locally created envelope without an id yet does not collide.';
COMMENT ON COLUMN esign_envelope.status IS
  'Envelope lifecycle (ADR-0071 decision 3): created → sent → delivered → completed | declined | voided. The source of record for signature state; mirrored onto proposal.esign_status / contract.esign_status for fast read.';
COMMENT ON COLUMN esign_envelope.recipients IS
  'Signer recipients (order / role / status) as jsonb (ADR-0071 sketch) — grows without a migration. Carries signer PII; consent + retention follow the consent ledger (ADR-0014).';

-- 360 / proposal reads: an envelope by its proposal (the status surface, #395).
CREATE INDEX IF NOT EXISTS idx_esign_envelope_proposal ON esign_envelope (proposal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_esign_envelope_contract ON esign_envelope (contract_id);
-- Idempotent webhook upsert by DocuSign id; partial so many no-ref locals don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS uq_esign_envelope_provider_ref
  ON esign_envelope (provider, external_ref) WHERE external_ref IS NOT NULL;

-- updated_at trigger (mirrors conversation / project_template / sprint).
-- set_updated_at() defined by an earlier migration; DROP-then-CREATE keeps re-run idempotent.
DROP TRIGGER IF EXISTS trg_esign_envelope_updated ON esign_envelope;
CREATE TRIGGER trg_esign_envelope_updated BEFORE UPDATE ON esign_envelope
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── proposal + contract: e-sign status mirror for fast read (ADR-0071) ───────────
-- A nullable mirror of the latest envelope status; the envelope is the SoR (ADR-0019
-- still owns proposal_status, the lifecycle enum — this is a separate e-sign field).
ALTER TABLE proposal
  ADD COLUMN IF NOT EXISTS esign_status text
    CHECK (esign_status IS NULL OR esign_status IN
      ('created', 'sent', 'delivered', 'completed', 'declined', 'voided'));
COMMENT ON COLUMN proposal.esign_status IS
  'Denormalized mirror of the proposal''s active esign_envelope.status (ADR-0071) for fast list render. NULL = no envelope sent. The envelope is the source of record; ADR-0019 owns the proposal lifecycle enum (proposal.status), separately.';

ALTER TABLE contract
  ADD COLUMN IF NOT EXISTS esign_status text
    CHECK (esign_status IS NULL OR esign_status IN
      ('created', 'sent', 'delivered', 'completed', 'declined', 'voided'));
COMMENT ON COLUMN contract.esign_status IS
  'Denormalized mirror of the originating esign_envelope.status (ADR-0071) for fast read on a contract created from a signed proposal (ADR-0044). NULL = not e-sign-originated. Autotask still owns the operational contract status (contract.status).';

-- Grants: app reads; backend sends (create + token custody); pipeline upserts status.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON esign_envelope TO "mgid-imperioncrm-web-prd";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON esign_envelope TO "mgid-imperioncrmpipeline";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON esign_envelope TO "mgid-imperioncrmbackendfunction";
  END IF;
END $$;

COMMIT;
