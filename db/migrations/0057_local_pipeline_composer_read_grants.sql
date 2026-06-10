-- 0057: Read grants for the local pipeline's new knowledge composers (2026-06-10).
--
-- Local-pipeline PR #69 added gold composers for device / credential-exposure /
-- assessment / proposal / posture (ImperionPipeline v0.5.0). They read silver
-- tables that 0048's read-grant list predates (it covered the original four
-- composers: account/contact/opportunity + autotask_companies). SELECT only —
-- composers never write silver; their writes go to knowledge_object, granted
-- in 0048.
--
-- Already covered elsewhere (no re-grant needed): itglue_devices +
-- itglue_export_* + darkwebid_exposures + televy_reports + the posture set
-- (0044/0055 write grants include SELECT).
--
-- Idempotent; no-ops if the role is absent.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    RAISE NOTICE 'role imperion-localpipeline absent — skipping.';
    RETURN;
  END IF;
  GRANT SELECT ON
    device,                -- Get-ImperionKnowledgeDevice (silver arm)
    credential_exposure,   -- Get-ImperionKnowledgeCredentialExposure
    assessment_artifact,   -- Get-ImperionKnowledgeAssessmentArtifact
    assessment,            -- …joined for engagement context
    proposal,              -- Get-ImperionKnowledgeProposal
    account_bronze_all     -- device composer's itglue org -> account citation chain
  TO "imperion-localpipeline";
END $$;

COMMIT;
