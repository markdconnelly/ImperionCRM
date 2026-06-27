-- 0216: web role least-privilege re-baseline — SELECT-by-default + explicit write allowlist
-- (issue #1390, ADR-NNNN amending ADR-0042 §1). Supersedes/corrects #1360 (0215).
--
-- Migration number 0216 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHY. Migration 0002 grants the web identity "mgid-imperioncrm-web-prd" blanket
-- SELECT, INSERT, UPDATE, DELETE ON ALL TABLES (+ an ALTER DEFAULT PRIVILEGES that re-applies
-- the same to EVERY future table). That violates ADR-0042 §1 (the GUI reads for rendering;
-- every write is a process — most go through the backend/pipeline boundary) and means every
-- new bronze/silver/agent table silently becomes web-writable. #1360 (0215) chipped at this
-- table-by-table for the social plane; this migration fixes it systemically.
--
-- WHAT. Flip the model to least-privilege:
--   1. REVOKE INSERT/UPDATE/DELETE from web on ALL existing tables (SELECT is left intact —
--      the GUI still renders everything; sequence USAGE from 0002 is left intact so inserts
--      on the allowlist keep working).
--   2. Flip the DEFAULT PRIVILEGE so FUTURE tables are web-SELECT-only (counters 0002's write
--      default; new tables no longer auto-grant web writes — the CI guard enforces this too).
--   3. GRANT INSERT/UPDATE/DELETE back on the EXPLICIT ALLOWLIST below — the 107 tables the
--      front end actually writes directly (CRM/projects/tasks/time+expense/templates/intake/
--      CMDB overlays/personal-spine/website_* bronze/audit, etc.), derived from the data-layer
--      write audit (docs/security/web-role-write-allowlist.md). Direct FE writes to silver that
--      route through the backend are NOT here.
--
-- CORRECTS #1360 (0215). 0215 revoked web writes on social_post, social_post_channel,
-- social_engagement, social_metric, campaign_metric (CORRECT — backend/pipeline write those,
-- no FE writes) but ALSO on campaign, ad, campaign_send, interaction (WRONG — the FE data
-- layer writes all four directly: createCampaignAction/createAd/createSend/createInteraction).
-- This baseline restores write on those four (they are in the allowlist) and keeps the five
-- truly-backend tables write-revoked. Net: 0215 + 0216 = the correct end state. **Do NOT apply
-- 0215 without 0216** (between them, campaign/ad creation + interaction logging would break).
--
-- !! PRE-APPLY GATE (the apply is Mark-gated, §10.3) !! Before applying in prod, diff the
-- allowlist against ACTUAL web write usage via the read-only DB (a few admin-config tables in
-- the revoke set — metric_definition, pay_rate, expense_policy, data_class* — were not seen in
-- the data-layer audit; confirm the GUI doesn't write them, else add them here). Query in the
-- PR. Omitting a genuinely-written table breaks that feature; this list errs toward inclusion.
--
-- Idempotent (REVOKE/GRANT are repeatable; ALTER DEFAULT PRIVILEGES REVOKE is a no-op if
-- already flipped); role-guarded (DO $$ … pg_roles … $$, per 0064/0210/0215). Additive to
-- SELECT (never touched). Transactional. NOT prod-applied until merge + the gate above.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    -- 1. Strip ALL write privileges the 0002 blanket grant handed out (SELECT kept).
    REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM "mgid-imperioncrm-web-prd";

    -- 2. Flip the future-table default to SELECT-only (counters 0002's ALTER DEFAULT write grant).
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE INSERT, UPDATE, DELETE ON TABLES FROM "mgid-imperioncrm-web-prd";

    -- 3. Grant writes back on the explicit allowlist — the 107 tables the GUI writes directly.
    GRANT INSERT, UPDATE, DELETE ON
    account, account_domain, account_tenant, ad, agent_action_autonomy, app_user, assessment, 
    audience, audience_member, audit_log, autotask_expense_report, campaign, campaign_send, 
    change_affected_ci, change_request, ci_relationship, cmdb_ci_overlay, collections_activity, 
    comment_mention, company_scoped_record, connection, connector_instance, consent_event, 
    contact, contact_enrichment, curation_event, curation_promotion, custom_field_def, 
    custom_field_value, dashboard, dashboard_item, delivery_template, delivery_template_phase, 
    delivery_template_task, discovery_call, domain_owner, employee_profile, engagement_answer, 
    event, event_registration, expense_category, expense_report, goal, goal_link, 
    grounding_conflict, grounding_conflict_event, intake_form, intake_submission, interaction, 
    lead_capture_event, lead_hook, meeting, meeting_action_item, memory_drawer, 
    message_template, mileage_rate, notification, notification_pref, onboarding_step, 
    opportunity, personal_contradiction, personal_fact, personal_note, project, 
    project_baseline, project_milestone, project_provisioning, project_template, project_type, 
    proposal, question, question_template, question_template_question, receipt_attachment, 
    report_definition, saved_view, sbr_dimension_score, sbr_ticket, segment, segment_member, 
    sprint, status_def, strategic_business_review, tag, task, task_dependency, task_recurrence, 
    task_ticket_fire, template_item, ticket, time_entry, time_ticket, timesheet, user_capacity, 
    website_companies, website_contacts, website_expense_item, website_mileage, 
    website_opportunities, website_time_entry, work_assignment, work_attachment, work_comment, 
    work_tag, workflow, workflow_enrollment, workflow_step
      TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web least-privilege re-baseline.';
  END IF;
END $$;

COMMIT;
