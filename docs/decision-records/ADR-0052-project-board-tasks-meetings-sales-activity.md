# ADR-0052: Project board model — project types, unified tasks, meetings linkage, sales activity

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted (2026-06-10, decisions locked with Mark in design session for issue #87) |
| **Date** | 2026-06-10 |
| **Cross-references** | — |

## Context

**Context and decision**

The delivery model was half-built: a `project` table existed with a hard two-value `project_type` enum (`onboarding | implementation`), the onboarding playbook (milestones + `onboarding_step`) hung off it, and one unified `task` table carried a category enum but no project link. Meetings existed as silver objects (1:1 with `interaction` kind=`meeting`) but attached only to account/contact/opportunity. There was no general projects surface, no sales work queue, and no path from onboarding automation to project status.

We decided: project types become a **table** (user-creatable from the project board; Onboarding seeded and protected as the foundational type with its own dedicated page); there is exactly **one task model** (`task` gains `project_id`); **easy mode** is real automation (a deploy button fires a configuration function; a verification check — reading the posture silver ADR-0051 already maintains — closes the linked project task); meetings attach to projects via `interaction.project_id`; and the sales activity page is a pure read model (per-owner queue of sales tasks + sales meetings). Vocabulary is defined in `CONTEXT.md` (Project Type, Project Task, Project Board, Easy Mode, Easy-Mode Deploy, Sales Task, Sales Queue).

## Decision

1. **Project types are data, not code.** A `project_type` table replaces the enum; new types ("Office move", "M365 migration") are created from the project board without a migration. Rows carry a stable `key`, a display `name`, and `is_protected`. `Onboarding` (key `onboarding`) is seeded protected — never deletable; the dedicated Onboarding page keys off it. `Implementation` is seeded to preserve existing rows. Deleting a type in use is RESTRICTed. (Rejected: extending the enum per type — contradicts "the board creates different project types"; per-type task templates — deferred, the onboarding playbook stays the only template for now.)

2. **One task model.** `task` gains a nullable `project_id` (SET NULL on project delete, matching the `opportunity_id` convention). The project board reads a project's tasks by `project_id`; the sales activity page reads `category='sales'`; the Tasks page stays the cross-category view. Tasks created from a project get `category='project'`; no DB constraint ties category to `project_id`. (Rejected: a separate `project_task` table — two task models to maintain; generalizing `onboarding_step` into the task — the playbook checklist and tracked work are different grains.)

3. **Easy mode = deploy button + verify-to-close.** An onboarding step flagged with a `deploy_key` renders the easy-mode button; clicking it calls the backend function that performs the real configuration via the authorized API (placeholder until integration work — the key names the function). **Only steps that can actually be automated get a key**; which steps those are comes out of the project-plan solidification exercise, so v1 ships sparse — `deploy_key` is data in the playbook template, not schema churn. When the template is applied to a project, each deploy-flagged step auto-creates one linked project task (`onboarding_step.task_id`); ordinary checklist steps create nothing, so the board shows deployment-shaped work without a 100-task flood.

4. **Verification closes the task, not the click.** The "job confirming that policy is in place" is a backend check over the **posture silver ADR-0051 already maintains** (`posture_policy` / `tenant_posture` for the account's mapped tenants): the step's `verify_key` names the expected observed state; when it shows up, the check marks the step done and closes the linked task. Idempotent; no-op with an audit note when no linked task exists (issue #101). (Rejected: a dedicated per-deploy collection job calling source APIs directly — duplicates the collection ADR-0051 deliberately centralized; close-on-click — a deploy isn't done until the environment says so.)

5. **Meetings attach to projects via their interaction.** `interaction` gains a nullable `project_id`, the same pattern as `opportunity_id`. Meetings remain communication objects (timeline-rendered, 1:1 `meeting` silver row); the project page lists meetings by `interaction.project_id`, sales surfaces by `opportunity_id`/account. Manually created meetings write `interaction` (source `meeting`, kind `meeting`) + `meeting` (platform `other`). (Rejected: a polymorphic `meeting_link` table — unenforceable FKs; `task_id` on interaction — a meeting is about the engagement, not one checkbox.)

6. **The sales activity page is a read model.** Per-owner **Sales Queue**: open `category='sales'` tasks grouped by due date and deal, plus sales meetings (kind=`meeting`, no `project_id`). No new tables. Sales tasks stay CRM-only — they never push to Autotask.

7. **Project tasks push to Autotask on demand.** A "create Autotask ticket" action on project tasks calls the backend ticket-creation API (ImperionCRM_Backend#19) with idempotency key `imperioncrm-task-{task.id}`; the returned ref is stored in `task.autotask_ticket_ref`. Nothing fires automatically. (Rejected: auto-create on task creation — floods Autotask with playbook-generated tasks.)

8. **Surfaces and RBAC.** Onboarding projects appear on the project board like any other type (the board is the general surface; the Onboarding page is the easy-mode surface). `project` gains `owner_user_id`. New role predicates per ADR-0030: `canManageProjects` (admin | project_manager) gates project-board writes; `canManageSales` (admin | sales) gates sales-activity writes; reads are open to all roles.

**Table specifications (migration 0058+, verify next number on disk)**

The existing enum is also named `project_type`; Postgres won't allow the new table while it exists, so the migration must rename the enum first, in this order:

```sql
ALTER TYPE project_type RENAME TO project_type_enum_legacy;

CREATE TABLE project_type (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text NOT NULL UNIQUE,            -- stable machine key, e.g. 'onboarding'
  name         text NOT NULL UNIQUE,
  description  text,
  is_protected boolean NOT NULL DEFAULT false,  -- protected types are never deletable
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO project_type (key, name, is_protected) VALUES
  ('onboarding',     'Onboarding',     true),
  ('implementation', 'Implementation', false);

ALTER TABLE project
  ADD COLUMN project_type_id uuid REFERENCES project_type(id) ON DELETE RESTRICT,
  ADD COLUMN owner_user_id   uuid REFERENCES app_user(id) ON DELETE SET NULL;
UPDATE project p SET project_type_id = pt.id
  FROM project_type pt WHERE pt.key = p.type::text;
ALTER TABLE project ALTER COLUMN project_type_id SET NOT NULL;
ALTER TABLE project DROP COLUMN type;
DROP TYPE project_type_enum_legacy;

ALTER TABLE task
  ADD COLUMN project_id          uuid REFERENCES project(id) ON DELETE SET NULL,
  ADD COLUMN autotask_ticket_ref text;            -- set by the on-demand push (backend #19)
CREATE INDEX task_project_idx ON task (project_id) WHERE project_id IS NOT NULL;
CREATE UNIQUE INDEX task_autotask_ref_uniq ON task (autotask_ticket_ref)
  WHERE autotask_ticket_ref IS NOT NULL;

ALTER TABLE onboarding_step
  ADD COLUMN deploy_key          text,             -- names the backend configuration function; NULL = ordinary checklist step
  ADD COLUMN verify_key          text,             -- names the expected posture-silver state that verifies the deploy
  ADD COLUMN task_id             uuid REFERENCES task(id) ON DELETE SET NULL,  -- the linked project task closed on verification
  ADD COLUMN deploy_requested_at timestamptz;      -- set when the easy-mode button fires

ALTER TABLE interaction
  ADD COLUMN project_id uuid REFERENCES project(id) ON DELETE SET NULL;
CREATE INDEX interaction_project_idx ON interaction (project_id) WHERE project_id IS NOT NULL;
```

Template (code, `src/lib/onboarding-template.ts`): items gain optional `deployKey`/`verifyKey`; `applyTemplateAction` creates one linked `task` (`category='project'`, `project_id`, the project's `account_id`, title = step title) per deploy-flagged item and sets `onboarding_step.task_id`. Verification (backend): when the `verify_key` state is observed in posture silver, set step `status='done'` + `completed_at` and the linked task `status='done'` — idempotent, audit-logged, no-op with a note when `task_id` is NULL.

Grants: these are app-owned tables — web MI keeps its existing read/write path. The backend role additionally needs SELECT on `posture_policy` / `tenant_posture` / `account_tenant` and UPDATE on `task` / `onboarding_step` for the verification check.

## Consequences

- #95 (project board page), #96 (sales activity page), #97 (meetings on sales/projects) unblock against this schema; #101 (deploy closes its task) unblocks once #95 lands, and its verification path additionally depends on the ADR-0051 posture silver being populated and the easy-mode backend functions existing (integration phase).
- The Autotask push on project tasks depends on ImperionCRM_Backend#19.
- The project-plan solidification exercise decides which playbook steps get `deploy_key`/`verify_key` values — until then the easy-mode button simply doesn't render anywhere.
- Adding a project type is now a row insert from the board, never a migration.
