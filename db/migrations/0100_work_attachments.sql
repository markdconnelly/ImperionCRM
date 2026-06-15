-- 0100 file attachments on work objects (ADR-0064 A4, issue #333)
--
-- PM collaboration A4 (ADR-0064): upload/list/remove file attachments on a work
-- object (task/project/milestone). This is the LAST of the four ADR-0064 slices —
-- comments (0094 / A1), mentions (0097 / A2), attachments (this / A4); notification
-- fan-out (A3) is a backend responsibility.
--
-- ADR-0064 chose the POLYMORPHIC model: ONE work_attachment table reused across
-- every work object instead of per-entity attachment tables — the same shape as
-- work_comment (0094), work_tag (0096) and work_assignment (0099). Parent
-- integrity is enforced by a CHECK on parent_type + application validation + a
-- covering index on (parent_type, parent_id); the reuse outweighs losing a parent
-- FK for an internal tool.
--
-- Storage contract (ADR-0064 security impact): the file BYTES live in Azure Blob,
-- NOT in Postgres. This table holds only METADATA + an opaque `storage_ref` (the
-- blob path/key the backend mints short-lived per-request SAS URLs against — never
-- a public URL, never a SAS token at rest). The front end is GUI-only (ADR-0042):
-- the actual upload-to-blob, the type-allowlist/size-cap enforcement and the
-- AV-scan hook are BACKEND processes; this migration + the GUI degrade gracefully
-- and stay dormant until that backend path + the blob container are wired.
--
-- Soft-delete (deleted_at) retains the audit trail (NFR-2): a removal hides the
-- row from listings but keeps it for the activity feed, and the calling action
-- writes an `attachment.removed` audit_log event (acceptance: removal is audited +
-- emits an activity event). The activity feed view (work_activity_feed, 0094)
-- already surfaces audit_log events for the same object, so a removal shows up
-- there with no view change here.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII, no blob bytes here.
--
-- `task`/`project` are app-native operational state (not ingested silver entities
-- with a source-of-record contract — same as work_comment / work_tag /
-- work_assignment), so the OKF semantic-layer gate does not apply: there is no
-- concept file for `work_attachment`.

BEGIN;

-- ── work_attachment: polymorphic file-attachment metadata on a work object ────
-- parent_type discriminates which work object the file hangs off; parent_id is the
-- uuid of that object. No DB-level FK on parent_id (polymorphic, ADR-0064 tradeoff)
-- — the CHECK bounds the type set and the app validates the parent exists before
-- insert. storage_ref is the opaque Azure Blob key (no public URL, no SAS at rest).
CREATE TABLE IF NOT EXISTS work_attachment (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type   text NOT NULL
                  CHECK (parent_type IN ('task', 'project', 'milestone')),
  parent_id     uuid NOT NULL,
  storage_ref   text NOT NULL,                        -- opaque Azure Blob key; SAS minted per-request by the backend
  filename      text NOT NULL,                        -- original display name (shown in the list)
  content_type  text NOT NULL,                        -- MIME type (drives inline image preview + allowlist)
  size_bytes    bigint NOT NULL CHECK (size_bytes >= 0),
  uploaded_by   uuid REFERENCES app_user(id) ON DELETE SET NULL,
  deleted_at    timestamptz,                          -- soft-delete; retains audit (NFR-2)
  created_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE work_attachment IS
  'Polymorphic file-attachment METADATA on a work object (task|project|milestone), ADR-0064 A4 / #333. File bytes live in Azure Blob; storage_ref is the opaque blob key the backend mints short-lived per-request SAS against (no public URL, no SAS at rest). parent_type+parent_id identify the object (no FK — polymorphic). Soft-deleted via deleted_at so the activity trail is retained; removal also writes an attachment.removed audit_log event.';

-- Covering index for the per-object attachment list (newest-first), live rows only.
CREATE INDEX IF NOT EXISTS idx_work_attachment_parent
  ON work_attachment (parent_type, parent_id, created_at DESC);

COMMIT;
