-- 0142: Grant the local-pipeline role DML for the merges it now owns (cloud_asset, contact_enrichment).
--
-- ADR-0026 (local-pipeline, merge-co-locates-with-ingestion) moved two bronze→silver merges
-- on-prem: cloud_asset (LocalPipeline #241) and the M365 directory-group enrichment of
-- contact_enrichment (LocalPipeline #239). Migration 0139 granted cloud_asset DML to the CLOUD
-- pipeline role (mgid-imperioncrmpipeline) ONLY — "cloud pipeline OWNS the merge" — so the
-- local-pipeline role (imperion-localpipeline) hit "42501: permission denied for table
-- cloud_asset" on its first scheduled run. contact_enrichment is likewise cloud-pipeline-granted,
-- so the directory merge (DELETE+INSERT) would fail the same way.
--
-- Grant the local-pipeline role exactly what each merge needs (least privilege, local-pipeline
-- CLAUDE.md §2). The cloud pipeline retains its own grants (0139 / prior) during the cede window
-- (pipeline #134/#135) — both writers are idempotent, so concurrent access is safe.
--   cloud_asset         — SELECT, INSERT, UPDATE  (Invoke-ImperionCloudAssetMerge: INSERT … ON CONFLICT DO UPDATE; never deletes)
--   contact_enrichment  — SELECT, INSERT, DELETE  (Invoke-ImperionM365DirectoryMerge: replace-from-source — DELETE source='m365_directory' + INSERT)
--
-- Defensive role-exists pattern (0130/0139/0141); GRANT is idempotent, so a re-run is a no-op.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON cloud_asset        TO "imperion-localpipeline";
    GRANT SELECT, INSERT, DELETE ON contact_enrichment TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline merge grants.';
  END IF;
END $$;

COMMIT;
