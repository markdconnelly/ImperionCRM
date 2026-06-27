# Web role write allowlist (ADR-0127 / #1390)

The web DB identity `mgid-imperioncrm-web-prd` is **SELECT-by-default**
(migration 0216). It holds `INSERT/UPDATE/DELETE` **only** on the 107 tables below — the
tables the Next.js front end writes **directly** (server actions / route handlers / the typed
data layer `src/lib/data/postgres/postgres-repositories.ts`), as audited from every
`INSERT/UPDATE/DELETE` literal in `src/`. Everything else is written by the backend, the
cloud Pipeline, or the Local Pipeline under their own roles (ADR-0042 §1).

**Adding a GUI-written table** = add a deliberate `GRANT INSERT, UPDATE, DELETE ON <table> TO
"mgid-imperioncrm-web-prd"` in that table's migration **and** add it here. Never a blanket
`ON ALL TABLES` grant — the CI guard (`src/lib/security/web-grant-guard.test.ts`) fails that.

## Pre-apply verification (run before applying 0216 in prod — read-only)

The data-layer audit is authoritative for what the GUI writes, but confirm against live write
usage first (a few admin-config tables in the revoke set — e.g. `metric_definition`,
`pay_rate`, `expense_policy`, `data_class`/`data_class_role_grant` — were not seen in the
audit; verify the GUI doesn't write them, else add them to 0216 + this list before apply):

```sql
-- Tables where web currently has writes but that are NOT in the allowlist (will be revoked) —
-- eyeball for anything the GUI actually writes:
SELECT table_name, string_agg(DISTINCT privilege_type, ',') AS privs
FROM information_schema.role_table_grants
WHERE grantee = 'mgid-imperioncrm-web-prd' AND table_schema = 'public'
  AND privilege_type IN ('INSERT','UPDATE','DELETE')
GROUP BY table_name
ORDER BY table_name;
```

## The allowlist (107 tables — web keeps INSERT/UPDATE/DELETE)

- `account`
- `account_domain`
- `account_tenant`
- `ad`
- `agent_action_autonomy`
- `app_user`
- `assessment`
- `audience`
- `audience_member`
- `audit_log`
- `autotask_expense_report`
- `campaign`
- `campaign_send`
- `change_affected_ci`
- `change_request`
- `ci_relationship`
- `cmdb_ci_overlay`
- `collections_activity`
- `comment_mention`
- `company_scoped_record`
- `connection`
- `connector_instance`
- `consent_event`
- `contact`
- `contact_enrichment`
- `curation_event`
- `curation_promotion`
- `custom_field_def`
- `custom_field_value`
- `dashboard`
- `dashboard_item`
- `delivery_template`
- `delivery_template_phase`
- `delivery_template_task`
- `discovery_call`
- `domain_owner`
- `employee_profile`
- `engagement_answer`
- `event`
- `event_registration`
- `expense_category`
- `expense_report`
- `goal`
- `goal_link`
- `grounding_conflict`
- `grounding_conflict_event`
- `intake_form`
- `intake_submission`
- `interaction`
- `lead_capture_event`
- `lead_hook`
- `meeting`
- `meeting_action_item`
- `memory_drawer`
- `message_template`
- `mileage_rate`
- `notification`
- `notification_pref`
- `onboarding_step`
- `opportunity`
- `personal_contradiction`
- `personal_fact`
- `personal_note`
- `project`
- `project_baseline`
- `project_milestone`
- `project_provisioning`
- `project_template`
- `project_type`
- `proposal`
- `question`
- `question_template`
- `question_template_question`
- `receipt_attachment`
- `report_definition`
- `saved_view`
- `sbr_dimension_score`
- `sbr_ticket`
- `segment`
- `segment_member`
- `sprint`
- `status_def`
- `strategic_business_review`
- `tag`
- `task`
- `task_dependency`
- `task_recurrence`
- `task_ticket_fire`
- `template_item`
- `ticket`
- `time_entry`
- `time_ticket`
- `timesheet`
- `user_capacity`
- `website_companies`
- `website_contacts`
- `website_expense_item`
- `website_mileage`
- `website_opportunities`
- `website_time_entry`
- `work_assignment`
- `work_attachment`
- `work_comment`
- `work_tag`
- `workflow`
- `workflow_enrollment`
- `workflow_step`
