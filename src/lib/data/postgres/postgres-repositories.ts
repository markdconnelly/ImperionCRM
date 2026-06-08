/**
 * PostgreSQL-backed repositories (ADR-0007). Reads the real schema and maps rows to
 * the UI shapes. Every method falls back to mock data on any error, so a transient
 * DB issue degrades to the prior behavior instead of breaking the app.
 *
 * Server-only. Selected by lib/data/index.ts when a database is configured.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import { mockRepositories } from "@/lib/data/mock/mock-repositories";
import { ASSESSMENT_DIMENSIONS } from "@/lib/assessment";
import type {
  AccountEditable,
  AccountInput,
  AnswerInput,
  AdInput,
  AssessmentEditable,
  AssessmentInput,
  AudienceCriterion,
  AudienceInput,
  CampaignInput,
  CompanyCredentialInput,
  ConnectionInput,
  ConsentEventInput,
  ContactEditable,
  ContactInput,
  DiscoveryCallInput,
  EnrichmentInput,
  InteractionFilter,
  InteractionInput,
  LeadHookInput,
  Option,
  ProjectEditable,
  ProjectInput,
  ProposalEditable,
  ProposalInput,
  QuestionEditable,
  QuestionInput,
  Repositories,
  SbrInput,
  SbrScoreInput,
  SpawnOpportunityInput,
  SpawnProjectInput,
  SpawnTicketInput,
  TaskEditable,
  TaskInput,
  WorkflowInput,
  WorkflowStepInput,
} from "@/lib/data/repositories";
import type {
  Account,
  ActionItemRow,
  AnswerReviewRow,
  ArtifactRow,
  AssessmentConversion,
  AssessmentRow,
  AudienceMemberRow,
  AudienceRow,
  CampaignDetail,
  CampaignRow,
  CommunicationDetail,
  ConnectionRow,
  ConsentEventRow,
  ContactCrmStage,
  ContactPipelineRow,
  ContactProfile,
  ContactRow,
  CountDatum,
  CurrentConsentRow,
  DiscoveryCallDetail,
  DiscoveryCallRow,
  EnrichmentFactRow,
  EnrollmentRow,
  ExternalIdentityRow,
  Health,
  InteractionRow,
  KnowledgeHit,
  Kpi,
  LeadCaptureEventRow,
  LeadHookRow,
  OnboardingProject,
  OnboardingMilestone,
  SecurityPosture,
  OpportunityRow,
  PipelineColumn,
  PipelineStage,
  ProjectRow,
  ProposalRow,
  QuestionRow,
  QuestionTemplateRow,
  ReportSummary,
  RevenueSplit,
  SbrDetail,
  SbrRow,
  SocialIdentityRow,
  StageValueDatum,
  TaskCategory,
  TaskRow,
  TicketRow,
  WorkflowDetail,
  WorkflowRow,
} from "@/types";

/** Empty string → null, for optional form fields. */
function nullIfEmpty(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
}

function fmtDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** "yyyy-mm-dd hh:mm" for timeline entries. */
function fmtDateTime(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 16).replace("T", " ") : null;
}

const ONBOARDING_LIFECYCLE = ["onboarding", "implementation", "operational_readiness"];

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
function fmtUsd(n: number): string {
  return usd.format(Number.isFinite(n) ? n : 0);
}

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
function fmtUsdCompact(n: number): string {
  return usdCompact.format(Number.isFinite(n) ? n : 0);
}

/** Fixed display order for opportunity sales stages. */
const SALES_STAGE_ORDER = ["lead", "qualified", "proposal", "won", "lost"];

/** Map the account lifecycle stage to the dashboard's five-stage strip. */
function toPipelineStage(lifecycle: string): PipelineStage {
  switch (lifecycle) {
    case "prospect":
      return "Lead";
    case "onboarding":
    case "implementation":
    case "operational_readiness":
      return "Onboarding";
    case "managed_active":
    case "dormant":
    default:
      return "Active";
  }
}

function toHealth(row: {
  is_active: boolean;
  relationship: string | null;
  health_score: number | null;
}): Health {
  if (row.health_score != null) {
    return row.health_score >= 70 ? "green" : row.health_score >= 40 ? "amber" : "red";
  }
  if (!row.is_active) return "red";
  return row.relationship === "customer" ? "green" : "amber";
}

const PIPELINE_ORDER: PipelineStage[] = [
  "Lead",
  "Qualified",
  "Proposal",
  "Onboarding",
  "Active",
];

export const postgresRepositories: Repositories = {
  dashboard: {
    async getKpis(): Promise<Kpi[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.dashboard.getKpis();
      try {
        const { rows } = await pool.query<{
          open_pipeline: string;
          active_mrr: string;
          open_deals: string;
          managed: string;
        }>(
          `SELECT
             coalesce(sum(o.amount_mrr) FILTER (WHERE o.sales_stage IN ('lead','qualified','proposal')), 0) AS open_pipeline,
             coalesce(sum(o.amount_mrr) FILTER (WHERE o.sales_stage = 'won'), 0)                            AS active_mrr,
             count(*) FILTER (WHERE o.sales_stage IN ('lead','qualified','proposal'))                       AS open_deals,
             (SELECT count(*) FROM account WHERE lifecycle_stage = 'managed_active')                        AS managed
           FROM opportunity o`,
        );
        const r = rows[0];
        return [
          { label: "Open Pipeline", value: fmtUsd(Number(r.open_pipeline)) },
          { label: "Active MRR", value: `${fmtUsd(Number(r.active_mrr))}/mo` },
          { label: "Managed", value: r.managed },
          { label: "Open Deals", value: r.open_deals },
        ];
      } catch {
        return mockRepositories.dashboard.getKpis();
      }
    },

    async getPipeline(): Promise<PipelineColumn[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.dashboard.getPipeline();
      try {
        const [opps, accts] = await Promise.all([
          pool.query<{ sales_stage: string; c: string; mrr: string }>(
            `SELECT sales_stage, count(*) AS c, coalesce(sum(amount_mrr),0) AS mrr
             FROM opportunity GROUP BY sales_stage`,
          ),
          pool.query<{ lifecycle_stage: string; c: string }>(
            `SELECT lifecycle_stage, count(*) AS c FROM account GROUP BY lifecycle_stage`,
          ),
        ]);
        const opp = new Map(opps.rows.map((r) => [r.sales_stage, r]));
        const stageCount = (s: string) => Number(opp.get(s)?.c ?? 0);
        const stageMrr = (s: string) => Number(opp.get(s)?.mrr ?? 0);
        const onboardingCount = accts.rows
          .filter((r) => ONBOARDING_LIFECYCLE.includes(r.lifecycle_stage))
          .reduce((sum, r) => sum + Number(r.c), 0);
        const managedCount = Number(
          accts.rows.find((r) => r.lifecycle_stage === "managed_active")?.c ?? 0,
        );

        const byStage: Record<PipelineStage, { count: number; value: string }> = {
          Lead: { count: stageCount("lead"), value: fmtUsd(stageMrr("lead")) },
          Qualified: { count: stageCount("qualified"), value: fmtUsd(stageMrr("qualified")) },
          Proposal: { count: stageCount("proposal"), value: fmtUsd(stageMrr("proposal")) },
          Onboarding: { count: onboardingCount, value: "—" },
          Active: { count: managedCount, value: `${fmtUsd(stageMrr("won"))}/mo` },
        };
        return PIPELINE_ORDER.map((stage) => ({ stage, ...byStage[stage] }));
      } catch {
        return mockRepositories.dashboard.getPipeline();
      }
    },

    async getAccountsNeedingAttention(): Promise<Account[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.dashboard.getAccountsNeedingAttention();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          lifecycle_stage: string;
          relationship: string | null;
          is_active: boolean;
          health_score: number | null;
          owner: string | null;
          mrr: string;
        }>(
          `SELECT a.id, a.name, a.lifecycle_stage, a.relationship, a.is_active,
                  a.health_score, u.display_name AS owner,
                  coalesce((SELECT sum(o.amount_mrr) FROM opportunity o
                            WHERE o.account_id = a.id AND o.sales_stage = 'won'), 0) AS mrr
           FROM account a
           LEFT JOIN app_user u ON u.id = a.owner_user_id
           WHERE NOT a.is_active OR a.lifecycle_stage IN ('prospect','dormant')
           ORDER BY a.is_active ASC, a.name
           LIMIT 8`,
        );
        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          stage: toPipelineStage(row.lifecycle_stage),
          owner: row.owner ?? "—",
          mrr: Number(row.mrr) > 0 ? `${fmtUsd(Number(row.mrr))}/mo` : "—",
          health: toHealth(row),
          note: row.is_active
            ? `${row.relationship ?? "unknown"} · ${row.lifecycle_stage.replace(/_/g, " ")}`
            : "Inactive — review relationship",
        }));
      } catch {
        return mockRepositories.dashboard.getAccountsNeedingAttention();
      }
    },
  },

  crm: {
    async listAccounts(): Promise<Account[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listAccounts();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          lifecycle_stage: string;
          relationship: string | null;
          is_active: boolean;
          health_score: number | null;
          owner: string | null;
          mrr: string;
        }>(
          `SELECT a.id, a.name, a.lifecycle_stage, a.relationship, a.is_active,
                  a.health_score, u.display_name AS owner,
                  coalesce((SELECT sum(o.amount_mrr) FROM opportunity o
                            WHERE o.account_id = a.id AND o.sales_stage = 'won'), 0) AS mrr
           FROM account a
           LEFT JOIN app_user u ON u.id = a.owner_user_id
           ORDER BY a.name`,
        );
        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          stage: toPipelineStage(row.lifecycle_stage),
          owner: row.owner ?? "—",
          mrr: Number(row.mrr) > 0 ? `${fmtUsd(Number(row.mrr))}/mo` : "—",
          health: toHealth(row),
          note: row.is_active
            ? `${row.relationship ?? "unknown"} · ${row.lifecycle_stage.replace(/_/g, " ")}`
            : "Inactive",
        }));
      } catch {
        return mockRepositories.crm.listAccounts();
      }
    },

    async getAccount(id: string): Promise<AccountEditable | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          relationship: string | null;
          lifecycle_stage: string;
          is_active: boolean;
        }>(
          `SELECT id, name, relationship, lifecycle_stage, is_active
           FROM account WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          name: r.name,
          relationship: r.relationship,
          lifecycleStage: r.lifecycle_stage,
          isActive: r.is_active,
        };
      } catch {
        return null;
      }
    },

    async createAccount(input: AccountInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createAccount(input);
      await pool.query(
        `INSERT INTO account (name, relationship, lifecycle_stage, is_active)
         VALUES ($1, $2::account_relationship, $3::account_lifecycle_stage, $4)`,
        [input.name, input.relationship, input.lifecycleStage, input.isActive],
      );
    },

    async updateAccount(id: string, input: AccountInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateAccount(id, input);
      await pool.query(
        `UPDATE account
         SET name = $1, relationship = $2::account_relationship,
             lifecycle_stage = $3::account_lifecycle_stage, is_active = $4
         WHERE id = $5`,
        [input.name, input.relationship, input.lifecycleStage, input.isActive, id],
      );
    },

    async deleteAccount(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteAccount(id);
      await pool.query(`DELETE FROM account WHERE id = $1`, [id]);
    },

    async listContacts(opts?: { client?: boolean }): Promise<ContactRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listContacts(opts);
      try {
        const filterClient = opts?.client !== undefined;
        const { rows } = await pool.query<{
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          account: string | null;
        }>(
          `SELECT c.id, c.full_name, c.email, c.phone, a.name AS account
           FROM contact c
           LEFT JOIN account a ON a.id = c.account_id
           ${filterClient ? "WHERE c.is_client = $1" : ""}
           ORDER BY c.full_name`,
          filterClient ? [opts!.client] : [],
        );
        return rows.map((row) => ({
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          account: row.account,
        }));
      } catch {
        return mockRepositories.crm.listContacts(opts);
      }
    },

    async listContactsByStage(opts?: { client?: boolean }): Promise<ContactPipelineRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listContactsByStage(opts);
      try {
        const filterClient = opts?.client !== undefined;
        const { rows } = await pool.query<{
          id: string;
          full_name: string;
          email: string | null;
          account: string | null;
          crm_stage: ContactCrmStage;
        }>(
          `SELECT c.id, c.full_name, c.email, c.crm_stage, a.name AS account
           FROM contact c
           LEFT JOIN account a ON a.id = c.account_id
           ${filterClient ? "WHERE c.is_client = $1" : ""}
           ORDER BY c.full_name`,
          filterClient ? [opts!.client] : [],
        );
        return rows.map((row) => ({
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          account: row.account,
          crmStage: row.crm_stage,
        }));
      } catch {
        return mockRepositories.crm.listContactsByStage(opts);
      }
    },

    async setContactStage(id: string, stage: ContactCrmStage): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setContactStage(id, stage);
      await pool.query(
        `UPDATE contact SET crm_stage = $2::contact_crm_stage WHERE id = $1`,
        [id, stage],
      );
    },

    async listOpportunities(): Promise<OpportunityRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listOpportunities();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          account: string;
          stage: string;
          mrr: string;
        }>(
          `SELECT o.id, o.name, a.name AS account, o.sales_stage AS stage,
                  coalesce(o.amount_mrr, 0) AS mrr
           FROM opportunity o
           JOIN account a ON a.id = o.account_id
           ORDER BY a.name, o.name`,
        );
        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          account: row.account,
          stage: row.stage,
          mrr: Number(row.mrr) > 0 ? `${fmtUsd(Number(row.mrr))}/mo` : "—",
        }));
      } catch {
        return mockRepositories.crm.listOpportunities();
      }
    },

    async setOpportunityStage(id: string, stage: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setOpportunityStage(id, stage);
      await pool.query(
        `UPDATE opportunity SET sales_stage = $2::opportunity_sales_stage WHERE id = $1`,
        [id, stage],
      );
    },

    async listTasks(): Promise<TaskRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listTasks();
      try {
        const { rows } = await pool.query<{
          id: string;
          title: string;
          status: string;
          category: TaskCategory;
          due_at: Date | null;
          account: string | null;
        }>(
          `SELECT t.id, t.title, t.status, t.category, t.due_at, a.name AS account
           FROM task t
           LEFT JOIN account a ON a.id = t.account_id
           ORDER BY t.due_at NULLS LAST, t.title`,
        );
        return rows.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          category: row.category,
          due: fmtDate(row.due_at),
          account: row.account,
        }));
      } catch {
        return mockRepositories.crm.listTasks();
      }
    },

    async getTask(id: string): Promise<TaskEditable | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          account_id: string | null;
          title: string;
          detail: string | null;
          status: string;
          category: string;
          due_at: Date | null;
        }>(
          `SELECT id, account_id, title, detail, status, category, due_at
           FROM task WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          accountId: r.account_id,
          title: r.title,
          detail: r.detail,
          status: r.status,
          category: r.category,
          dueAt: fmtDate(r.due_at),
        };
      } catch {
        return null;
      }
    },

    async createTask(input: TaskInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createTask(input);
      await pool.query(
        `INSERT INTO task (account_id, title, detail, status, category, due_at)
         VALUES ($1, $2, $3, $4, $5::task_category, $6::timestamptz)`,
        [
          nullIfEmpty(input.accountId),
          input.title,
          nullIfEmpty(input.detail),
          input.status,
          input.category,
          nullIfEmpty(input.dueAt),
        ],
      );
    },

    async updateTask(id: string, input: TaskInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateTask(id, input);
      await pool.query(
        `UPDATE task
         SET account_id = $1, title = $2, detail = $3, status = $4,
             category = $5::task_category, due_at = $6::timestamptz
         WHERE id = $7`,
        [
          nullIfEmpty(input.accountId),
          input.title,
          nullIfEmpty(input.detail),
          input.status,
          input.category,
          nullIfEmpty(input.dueAt),
          id,
        ],
      );
    },

    async deleteTask(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteTask(id);
      await pool.query(`DELETE FROM task WHERE id = $1`, [id]);
    },

    async listProposals(): Promise<ProposalRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listProposals();
      try {
        const { rows } = await pool.query<{
          id: string;
          title: string;
          opportunity: string;
          account: string;
          status: string;
          amount_mrr: string | null;
          sent_at: Date | null;
        }>(
          `SELECT p.id, p.title, o.name AS opportunity, a.name AS account,
                  p.status, p.amount_mrr, p.sent_at
           FROM proposal p
           JOIN opportunity o ON o.id = p.opportunity_id
           JOIN account a ON a.id = o.account_id
           ORDER BY p.created_at DESC`,
        );
        return rows.map((row) => ({
          id: row.id,
          title: row.title,
          opportunity: row.opportunity,
          account: row.account,
          status: row.status,
          amount:
            row.amount_mrr != null && Number(row.amount_mrr) > 0
              ? `${fmtUsd(Number(row.amount_mrr))}/mo`
              : "—",
          sent: fmtDate(row.sent_at),
        }));
      } catch {
        return mockRepositories.crm.listProposals();
      }
    },

    async getProposal(id: string): Promise<ProposalEditable | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          opportunity_id: string;
          title: string;
          status: string;
          amount_mrr: string | null;
          document_url: string | null;
          notes: string | null;
        }>(
          `SELECT id, opportunity_id, title, status, amount_mrr, document_url, notes
           FROM proposal WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          opportunityId: r.opportunity_id,
          title: r.title,
          status: r.status,
          amountMrr: r.amount_mrr,
          documentUrl: r.document_url,
          notes: r.notes,
        };
      } catch {
        return null;
      }
    },

    async createProposal(input: ProposalInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createProposal(input);
      // Stamp lifecycle timestamps from the chosen status (ADR-0019).
      await pool.query(
        `INSERT INTO proposal
           (opportunity_id, title, status, amount_mrr, document_url, notes, sent_at, decided_at)
         VALUES (
           $1, $2, $3::proposal_status, $4::numeric, $5, $6,
           CASE WHEN $3 = 'draft' THEN NULL ELSE now() END,
           CASE WHEN $3 IN ('accepted','declined') THEN now() ELSE NULL END
         )`,
        [
          input.opportunityId,
          input.title,
          input.status,
          nullIfEmpty(input.amountMrr),
          nullIfEmpty(input.documentUrl),
          nullIfEmpty(input.notes),
        ],
      );
    },

    async updateProposal(id: string, input: ProposalInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateProposal(id, input);
      // Preserve an existing sent/decided timestamp; stamp on first transition.
      await pool.query(
        `UPDATE proposal
         SET opportunity_id = $1, title = $2, status = $3::proposal_status,
             amount_mrr = $4::numeric, document_url = $5, notes = $6,
             sent_at = CASE WHEN $3 = 'draft' THEN NULL ELSE coalesce(sent_at, now()) END,
             decided_at = CASE WHEN $3 IN ('accepted','declined')
                               THEN coalesce(decided_at, now()) ELSE NULL END
         WHERE id = $7`,
        [
          input.opportunityId,
          input.title,
          input.status,
          nullIfEmpty(input.amountMrr),
          nullIfEmpty(input.documentUrl),
          nullIfEmpty(input.notes),
          id,
        ],
      );
    },

    async deleteProposal(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteProposal(id);
      await pool.query(`DELETE FROM proposal WHERE id = $1`, [id]);
    },

    async listProjects(): Promise<ProjectRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listProjects();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          account: string;
          opportunity: string | null;
          type: string;
          status: string;
          target_live_date: Date | null;
        }>(
          `SELECT pr.id, pr.name, a.name AS account, o.name AS opportunity,
                  pr.type, pr.status, pr.target_live_date
           FROM project pr
           JOIN account a ON a.id = pr.account_id
           LEFT JOIN opportunity o ON o.id = pr.opportunity_id
           ORDER BY pr.target_live_date NULLS LAST, a.name`,
        );
        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          account: row.account,
          opportunity: row.opportunity,
          type: row.type,
          status: row.status,
          targetLive: fmtDate(row.target_live_date),
        }));
      } catch {
        return mockRepositories.crm.listProjects();
      }
    },

    async getProject(id: string): Promise<ProjectEditable | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          account_id: string;
          opportunity_id: string | null;
          name: string;
          type: string;
          status: string;
          target_live_date: Date | null;
          notes: string | null;
        }>(
          `SELECT id, account_id, opportunity_id, name, type, status,
                  target_live_date, notes
           FROM project WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          accountId: r.account_id,
          opportunityId: r.opportunity_id,
          name: r.name,
          type: r.type,
          status: r.status,
          targetLiveDate: fmtDate(r.target_live_date),
          notes: r.notes,
        };
      } catch {
        return null;
      }
    },

    async createProject(input: ProjectInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createProject(input);
      // Stamp lifecycle timestamps from the chosen status (ADR-0020).
      await pool.query(
        `INSERT INTO project
           (account_id, opportunity_id, name, type, status, target_live_date, notes,
            started_at, completed_at)
         VALUES (
           $1, $2, $3, $4::project_type, $5::project_status, $6::date, $7,
           CASE WHEN $5 = 'not_started' THEN NULL ELSE now() END,
           CASE WHEN $5 = 'complete' THEN now() ELSE NULL END
         )`,
        [
          input.accountId,
          nullIfEmpty(input.opportunityId),
          input.name,
          input.type,
          input.status,
          nullIfEmpty(input.targetLiveDate),
          nullIfEmpty(input.notes),
        ],
      );
    },

    async updateProject(id: string, input: ProjectInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateProject(id, input);
      // Preserve existing started/completed timestamps; stamp on first transition.
      await pool.query(
        `UPDATE project
         SET account_id = $1, opportunity_id = $2, name = $3, type = $4::project_type,
             status = $5::project_status, target_live_date = $6::date, notes = $7,
             started_at = CASE WHEN $5 = 'not_started' THEN NULL
                               ELSE coalesce(started_at, now()) END,
             completed_at = CASE WHEN $5 = 'complete'
                                 THEN coalesce(completed_at, now()) ELSE NULL END
         WHERE id = $8`,
        [
          input.accountId,
          nullIfEmpty(input.opportunityId),
          input.name,
          input.type,
          input.status,
          nullIfEmpty(input.targetLiveDate),
          nullIfEmpty(input.notes),
          id,
        ],
      );
    },

    async deleteProject(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteProject(id);
      await pool.query(`DELETE FROM project WHERE id = $1`, [id]);
    },

    async listOnboarding(): Promise<OnboardingProject[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listOnboarding();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          account: string | null;
          type: string;
          status: string;
          target_live_date: Date | null;
        }>(
          `SELECT p.id, p.name, a.name AS account, p.type::text AS type,
                  p.status::text AS status, p.target_live_date
           FROM project p
           LEFT JOIN account a ON a.id = p.account_id
           ORDER BY p.target_live_date NULLS LAST, p.name`,
        );
        const { rows: ms } = await pool.query<{
          id: string;
          project_id: string;
          name: string;
          status: string;
          health: Health;
        }>(
          `SELECT id, project_id, name, status::text AS status, health::text AS health
           FROM project_milestone
           ORDER BY ordinal, name`,
        );
        const byProject = new Map<string, OnboardingMilestone[]>();
        for (const m of ms) {
          const list = byProject.get(m.project_id) ?? [];
          list.push({ id: m.id, name: m.name, status: m.status, health: m.health });
          byProject.set(m.project_id, list);
        }
        return rows.map((p) => ({
          id: p.id,
          name: p.name,
          account: p.account,
          type: p.type,
          status: p.status,
          targetLive: fmtDate(p.target_live_date),
          milestones: byProject.get(p.id) ?? [],
        }));
      } catch {
        return mockRepositories.crm.listOnboarding();
      }
    },

    async setMilestoneHealth(id: string, health: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setMilestoneHealth(id, health);
      await pool.query(
        `UPDATE project_milestone SET health = $2::milestone_health WHERE id = $1`,
        [id, health],
      );
    },

    async listAssessments(): Promise<AssessmentRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listAssessments();
      try {
        const { rows } = await pool.query<Record<string, unknown>>(
          `SELECT a.id, a.name, acc.name AS account, a.status, a.fee_amount, a.kickoff_at,
                  a.identity_rating, a.endpoint_rating, a.network_rating,
                  a.email_rating, a.backup_rating, a.incident_rating
           FROM assessment a
           JOIN account acc ON acc.id = a.account_id
           ORDER BY a.created_at DESC`,
        );
        return rows.map((row) => ({
          id: row.id as string,
          name: row.name as string,
          account: row.account as string,
          status: row.status as string,
          fee:
            row.fee_amount != null && Number(row.fee_amount) > 0
              ? fmtUsd(Number(row.fee_amount))
              : "—",
          kickoff: fmtDate((row.kickoff_at as Date | null) ?? null),
          scores: ASSESSMENT_DIMENSIONS.map((d) => ({
            key: d.key,
            label: d.label,
            rating: (row[`${d.key}_rating`] as string | null) ?? null,
          })),
        }));
      } catch {
        return mockRepositories.crm.listAssessments();
      }
    },

    async getAssessment(id: string): Promise<AssessmentEditable | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<Record<string, unknown>>(
          `SELECT id, account_id, opportunity_id, name, status, fee_amount,
                  credit_to_onboarding, identity_rating, endpoint_rating, network_rating,
                  email_rating, backup_rating, incident_rating, top_priorities,
                  recommendation, report_url, notes, kickoff_at
           FROM assessment WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        const ratings: Record<string, string | null> = {};
        for (const d of ASSESSMENT_DIMENSIONS) {
          ratings[d.key] = (r[`${d.key}_rating`] as string | null) ?? null;
        }
        return {
          id: r.id as string,
          accountId: r.account_id as string,
          opportunityId: (r.opportunity_id as string | null) ?? null,
          name: r.name as string,
          status: r.status as string,
          feeAmount: r.fee_amount != null ? String(r.fee_amount) : null,
          creditToOnboarding: Boolean(r.credit_to_onboarding),
          ratings,
          topPriorities: (r.top_priorities as string | null) ?? null,
          recommendation: (r.recommendation as string | null) ?? null,
          reportUrl: (r.report_url as string | null) ?? null,
          notes: (r.notes as string | null) ?? null,
          kickoffAt: fmtDate((r.kickoff_at as Date | null) ?? null),
        };
      } catch {
        return null;
      }
    },

    async createAssessment(input: AssessmentInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createAssessment(input);
      const ratings = ASSESSMENT_DIMENSIONS.map((d) => nullIfEmpty(input.ratings[d.key]));
      await pool.query(
        `INSERT INTO assessment
           (account_id, opportunity_id, name, status, fee_amount, credit_to_onboarding,
            identity_rating, endpoint_rating, network_rating, email_rating,
            backup_rating, incident_rating, top_priorities, recommendation, report_url,
            notes, kickoff_at, delivered_at)
         VALUES (
           $1, $2, $3, $4::assessment_status, $5::numeric, $6,
           $7::assessment_rating, $8::assessment_rating, $9::assessment_rating,
           $10::assessment_rating, $11::assessment_rating, $12::assessment_rating,
           $13, $14, $15, $16, $17::date,
           CASE WHEN $4 IN ('delivered','closed') THEN now() ELSE NULL END
         )`,
        [
          input.accountId,
          nullIfEmpty(input.opportunityId),
          input.name,
          input.status,
          nullIfEmpty(input.feeAmount),
          input.creditToOnboarding,
          ...ratings,
          nullIfEmpty(input.topPriorities),
          nullIfEmpty(input.recommendation),
          nullIfEmpty(input.reportUrl),
          nullIfEmpty(input.notes),
          nullIfEmpty(input.kickoffAt),
        ],
      );
    },

    async updateAssessment(id: string, input: AssessmentInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateAssessment(id, input);
      const ratings = ASSESSMENT_DIMENSIONS.map((d) => nullIfEmpty(input.ratings[d.key]));
      await pool.query(
        `UPDATE assessment
         SET account_id = $1, opportunity_id = $2, name = $3, status = $4::assessment_status,
             fee_amount = $5::numeric, credit_to_onboarding = $6,
             identity_rating = $7::assessment_rating, endpoint_rating = $8::assessment_rating,
             network_rating = $9::assessment_rating, email_rating = $10::assessment_rating,
             backup_rating = $11::assessment_rating, incident_rating = $12::assessment_rating,
             top_priorities = $13, recommendation = $14, report_url = $15, notes = $16,
             kickoff_at = $17::date,
             delivered_at = CASE WHEN $4 IN ('delivered','closed')
                                 THEN coalesce(delivered_at, now()) ELSE NULL END
         WHERE id = $18`,
        [
          input.accountId,
          nullIfEmpty(input.opportunityId),
          input.name,
          input.status,
          nullIfEmpty(input.feeAmount),
          input.creditToOnboarding,
          ...ratings,
          nullIfEmpty(input.topPriorities),
          nullIfEmpty(input.recommendation),
          nullIfEmpty(input.reportUrl),
          nullIfEmpty(input.notes),
          nullIfEmpty(input.kickoffAt),
          id,
        ],
      );
    },

    async deleteAssessment(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteAssessment(id);
      await pool.query(`DELETE FROM assessment WHERE id = $1`, [id]);
    },

    async accountOptions(): Promise<Option[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.accountOptions();
      try {
        const { rows } = await pool.query<{ id: string; name: string }>(
          `SELECT id, name FROM account ORDER BY name`,
        );
        return rows.map((r) => ({ id: r.id, name: r.name }));
      } catch {
        return mockRepositories.crm.accountOptions();
      }
    },

    async opportunityOptions(): Promise<Option[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.opportunityOptions();
      try {
        const { rows } = await pool.query<{ id: string; name: string }>(
          `SELECT o.id, a.name || ' — ' || o.name AS name
           FROM opportunity o
           JOIN account a ON a.id = o.account_id
           ORDER BY a.name, o.name`,
        );
        return rows.map((r) => ({ id: r.id, name: r.name }));
      } catch {
        return mockRepositories.crm.opportunityOptions();
      }
    },

    async contactOptions(): Promise<Option[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.contactOptions();
      try {
        const { rows } = await pool.query<{ id: string; name: string }>(
          `SELECT c.id, c.full_name || ' (' || coalesce(a.name, '—') || ')' AS name
           FROM contact c
           LEFT JOIN account a ON a.id = c.account_id
           ORDER BY c.full_name`,
        );
        return rows.map((r) => ({ id: r.id, name: r.name }));
      } catch {
        return mockRepositories.crm.contactOptions();
      }
    },

    async assessmentOptions(): Promise<Option[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.assessmentOptions();
      try {
        const { rows } = await pool.query<{ id: string; name: string }>(
          `SELECT s.id, a.name || ' — ' || s.name AS name
           FROM assessment s
           JOIN account a ON a.id = s.account_id
           ORDER BY a.name, s.created_at DESC`,
        );
        return rows.map((r) => ({ id: r.id, name: r.name }));
      } catch {
        return mockRepositories.crm.assessmentOptions();
      }
    },
  },

  agent: {
    // No agent runtime yet (ADR-0015 / ADR-0018 — hosted externally). Empty feed.
    async getConversation() {
      return [];
    },
  },

  reports: {
    async getSummary(): Promise<ReportSummary> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.getSummary();
      try {
        const { rows } = await pool.query<{
          active_mrr: string;
          open_pipeline: string;
          won: string;
          lost: string;
          avg_ttl_days: string | null;
        }>(
          `SELECT
             coalesce(sum(o.amount_mrr) FILTER (WHERE o.sales_stage = 'won'), 0)        AS active_mrr,
             coalesce(sum(o.amount_mrr) FILTER (WHERE o.sales_stage IN
               ('lead','qualified','proposal')), 0)                                     AS open_pipeline,
             count(*) FILTER (WHERE o.sales_stage = 'won')                              AS won,
             count(*) FILTER (WHERE o.sales_stage = 'lost')                             AS lost,
             (SELECT avg(extract(epoch FROM (completed_at - started_at)) / 86400.0)
                FROM project
               WHERE status = 'complete' AND started_at IS NOT NULL
                 AND completed_at IS NOT NULL)                                          AS avg_ttl_days
           FROM opportunity o`,
        );
        const r = rows[0];
        const won = Number(r.won);
        const lost = Number(r.lost);
        const decided = won + lost;
        const ttl = r.avg_ttl_days != null ? Math.round(Number(r.avg_ttl_days)) : null;
        return {
          activeMrr: `${fmtUsdCompact(Number(r.active_mrr))}/mo`,
          openPipeline: fmtUsdCompact(Number(r.open_pipeline)),
          winRate: decided > 0 ? `${Math.round((won / decided) * 100)}%` : "—",
          avgTimeToLive: ttl != null ? `${ttl}d` : "—",
        };
      } catch {
        return mockRepositories.reports.getSummary();
      }
    },

    async pipelineByStage(): Promise<StageValueDatum[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.pipelineByStage();
      try {
        const { rows } = await pool.query<{ sales_stage: string; c: string; mrr: string }>(
          `SELECT sales_stage, count(*) AS c, coalesce(sum(amount_mrr), 0) AS mrr
           FROM opportunity GROUP BY sales_stage`,
        );
        const byStage = new Map(rows.map((r) => [r.sales_stage, r]));
        return SALES_STAGE_ORDER.map((stage) => ({
          stage,
          count: Number(byStage.get(stage)?.c ?? 0),
          mrr: Number(byStage.get(stage)?.mrr ?? 0),
        }));
      } catch {
        return mockRepositories.reports.pipelineByStage();
      }
    },

    async proposalsByStatus(): Promise<CountDatum[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.proposalsByStatus();
      try {
        const { rows } = await pool.query<{ status: string; c: string }>(
          `SELECT status, count(*) AS c FROM proposal GROUP BY status ORDER BY status`,
        );
        return rows.map((r) => ({ label: r.status, count: Number(r.c) }));
      } catch {
        return mockRepositories.reports.proposalsByStatus();
      }
    },

    async projectsByStatus(): Promise<CountDatum[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.projectsByStatus();
      try {
        const { rows } = await pool.query<{ status: string; c: string }>(
          `SELECT status, count(*) AS c FROM project GROUP BY status ORDER BY status`,
        );
        return rows.map((r) => ({ label: r.status, count: Number(r.c) }));
      } catch {
        return mockRepositories.reports.projectsByStatus();
      }
    },

    async revenueSplit(): Promise<RevenueSplit> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.revenueSplit();
      try {
        const { rows } = await pool.query<{ one_time: string; recurring: string }>(
          `SELECT
             (SELECT coalesce(sum(fee_amount), 0) FROM assessment
               WHERE status IN ('delivered','closed'))         AS one_time,
             (SELECT coalesce(sum(amount_mrr), 0) FROM opportunity
               WHERE sales_stage = 'won')                       AS recurring`,
        );
        const r = rows[0];
        return {
          oneTime: fmtUsdCompact(Number(r.one_time)),
          recurring: `${fmtUsdCompact(Number(r.recurring))}/mo`,
        };
      } catch {
        return mockRepositories.reports.revenueSplit();
      }
    },

    async assessmentConversion(): Promise<AssessmentConversion> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.assessmentConversion();
      try {
        const { rows } = await pool.query<{ delivered: string; converted: string }>(
          `SELECT
             count(*) FILTER (WHERE s.status IN ('delivered','closed'))            AS delivered,
             count(*) FILTER (WHERE s.status IN ('delivered','closed')
               AND a.lifecycle_stage = 'managed_active')                          AS converted
           FROM assessment s JOIN account a ON a.id = s.account_id`,
        );
        const delivered = Number(rows[0].delivered);
        const converted = Number(rows[0].converted);
        return {
          delivered,
          converted,
          rate: delivered > 0 ? `${Math.round((converted / delivered) * 100)}%` : "—",
        };
      } catch {
        return mockRepositories.reports.assessmentConversion();
      }
    },

    async sbrDimensionAverages(): Promise<CountDatum[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.sbrDimensionAverages();
      try {
        const { rows } = await pool.query<{ dimension: string; avg: string }>(
          `SELECT dimension,
                  avg(CASE rating
                        WHEN 'at_risk' THEN 1 WHEN 'needs_work' THEN 2
                        WHEN 'solid' THEN 3 WHEN 'strong' THEN 4 END) AS avg
           FROM sbr_dimension_score WHERE rating IS NOT NULL
           GROUP BY dimension`,
        );
        const byDim = new Map(rows.map((r) => [r.dimension, Number(r.avg)]));
        // Return in canonical dimension order with friendly labels.
        return ASSESSMENT_DIMENSIONS.filter((d) => byDim.has(d.key)).map((d) => ({
          label: d.label,
          count: Math.round((byDim.get(d.key) ?? 0) * 10) / 10,
        }));
      } catch {
        return mockRepositories.reports.sbrDimensionAverages();
      }
    },
  },

  engagements: {
    async getQuestions(kind: string): Promise<QuestionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.getQuestions(kind);
      try {
        const { rows } = await pool.query<{
          id: string;
          key: string;
          prompt: string;
          help_text: string | null;
          response_type: string;
          options: string[] | null;
          dimension: string | null;
          ordinal: number;
          required: boolean;
        }>(
          `SELECT q.id, q.key, q.prompt, q.help_text, q.response_type, q.options,
                  q.dimension, q.ordinal, q.required
           FROM question q
           JOIN question_template t ON t.id = q.template_id
           WHERE t.kind = $1::engagement_kind AND t.status = 'active' AND q.active = true
             AND t.version = (SELECT max(version) FROM question_template
                              WHERE kind = $1::engagement_kind AND status = 'active')
           ORDER BY q.ordinal`,
          [kind],
        );
        return rows.map((r) => ({
          id: r.id,
          key: r.key,
          prompt: r.prompt,
          helpText: r.help_text,
          responseType: r.response_type,
          options: r.options,
          dimension: r.dimension,
          ordinal: r.ordinal,
          required: r.required,
          active: true,
        }));
      } catch {
        return mockRepositories.engagements.getQuestions(kind);
      }
    },

    async getActiveTemplate(kind: string): Promise<QuestionTemplateRow | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          kind: string;
          version: number;
          title: string;
        }>(
          `SELECT id, kind, version, title FROM question_template
           WHERE kind = $1::engagement_kind AND status = 'active'
           ORDER BY version DESC LIMIT 1`,
          [kind],
        );
        return rows[0] ?? null;
      } catch {
        return null;
      }
    },

    async listQuestionsForEditor(kind: string): Promise<QuestionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listQuestionsForEditor(kind);
      try {
        const { rows } = await pool.query<{
          id: string;
          key: string;
          prompt: string;
          help_text: string | null;
          response_type: string;
          options: string[] | null;
          dimension: string | null;
          ordinal: number;
          required: boolean;
          active: boolean;
        }>(
          `SELECT q.id, q.key, q.prompt, q.help_text, q.response_type, q.options,
                  q.dimension, q.ordinal, q.required, q.active
           FROM question q
           JOIN question_template t ON t.id = q.template_id
           WHERE t.kind = $1::engagement_kind AND t.status = 'active'
             AND t.version = (SELECT max(version) FROM question_template
                              WHERE kind = $1::engagement_kind AND status = 'active')
           ORDER BY q.ordinal, q.created_at`,
          [kind],
        );
        return rows.map((r) => ({
          id: r.id,
          key: r.key,
          prompt: r.prompt,
          helpText: r.help_text,
          responseType: r.response_type,
          options: r.options,
          dimension: r.dimension,
          ordinal: r.ordinal,
          required: r.required,
          active: r.active,
        }));
      } catch {
        return mockRepositories.engagements.listQuestionsForEditor(kind);
      }
    },

    async getQuestion(id: string): Promise<QuestionEditable | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          key: string;
          prompt: string;
          help_text: string | null;
          response_type: string;
          options: string[] | null;
          dimension: string | null;
          ordinal: number;
          required: boolean;
          active: boolean;
        }>(
          `SELECT id, key, prompt, help_text, response_type, options, dimension,
                  ordinal, required, active
           FROM question WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          key: r.key,
          prompt: r.prompt,
          helpText: r.help_text,
          responseType: r.response_type,
          options: r.options,
          dimension: r.dimension,
          ordinal: r.ordinal,
          required: r.required,
          active: r.active,
        };
      } catch {
        return null;
      }
    },

    async createQuestion(kind: string, input: QuestionInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.createQuestion(kind, input);
      // Resolve (or create) the active template for this kind, then add the question.
      const { rows: t } = await pool.query<{ id: string }>(
        `SELECT id FROM question_template
         WHERE kind = $1::engagement_kind AND status = 'active'
         ORDER BY version DESC LIMIT 1`,
        [kind],
      );
      let templateId = t[0]?.id;
      if (!templateId) {
        const { rows: created } = await pool.query<{ id: string }>(
          `INSERT INTO question_template (kind, version, title)
           VALUES ($1::engagement_kind, 1, $2) RETURNING id`,
          [kind, `${kind} questions (v1)`],
        );
        templateId = created[0].id;
      }
      await pool.query(
        `INSERT INTO question
           (template_id, key, prompt, help_text, response_type, options, dimension,
            ordinal, required, active)
         VALUES ($1, $2, $3, $4, $5::question_response_type, $6::jsonb, $7, $8, $9, $10)`,
        [
          templateId,
          input.key,
          input.prompt,
          nullIfEmpty(input.helpText),
          input.responseType,
          input.options == null ? null : JSON.stringify(input.options),
          nullIfEmpty(input.dimension),
          input.ordinal,
          input.required,
          input.active,
        ],
      );
    },

    async updateQuestion(id: string, input: QuestionInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.updateQuestion(id, input);
      await pool.query(
        `UPDATE question
         SET key = $1, prompt = $2, help_text = $3, response_type = $4::question_response_type,
             options = $5::jsonb, dimension = $6, ordinal = $7, required = $8, active = $9
         WHERE id = $10`,
        [
          input.key,
          input.prompt,
          nullIfEmpty(input.helpText),
          input.responseType,
          input.options == null ? null : JSON.stringify(input.options),
          nullIfEmpty(input.dimension),
          input.ordinal,
          input.required,
          input.active,
          id,
        ],
      );
    },

    async listDiscoveryCalls(): Promise<DiscoveryCallRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listDiscoveryCalls();
      try {
        const { rows } = await pool.query<{
          id: string;
          account: string;
          status: string;
          verdict: string | null;
          held_at: Date | null;
          next_step: string | null;
        }>(
          `SELECT d.id, a.name AS account, d.status, d.verdict, d.held_at, d.next_step
           FROM discovery_call d JOIN account a ON a.id = d.account_id
           ORDER BY d.held_at DESC NULLS LAST, d.created_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          account: r.account,
          status: r.status,
          verdict: r.verdict,
          held: fmtDate(r.held_at),
          nextStep: r.next_step,
        }));
      } catch {
        return mockRepositories.engagements.listDiscoveryCalls();
      }
    },

    async getDiscoveryCall(id: string): Promise<DiscoveryCallDetail | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          account_id: string;
          opportunity_id: string | null;
          contact_id: string | null;
          template_id: string | null;
          status: string;
          held_at: Date | null;
          verdict: string | null;
          verdict_reason: string | null;
          next_step: string | null;
          sbr_cadence: string | null;
        }>(
          `SELECT id, account_id, opportunity_id, contact_id, template_id, status,
                  held_at, verdict, verdict_reason, next_step, sbr_cadence
           FROM discovery_call WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        const { rows: answers } = await pool.query<{
          question_id: string;
          key: string;
          prompt: string;
          response_type: string;
          value: string | null;
        }>(
          `SELECT ea.question_id, q.key, q.prompt, q.response_type,
                  COALESCE(ea.value_text, ea.value_number::text, ea.value_bool::text,
                           ea.value_date::text, ea.value_json::text) AS value
           FROM engagement_answer ea JOIN question q ON q.id = ea.question_id
           WHERE ea.engagement_type = 'discovery' AND ea.engagement_id = $1
           ORDER BY q.ordinal`,
          [id],
        );
        return {
          id: r.id,
          accountId: r.account_id,
          opportunityId: r.opportunity_id,
          contactId: r.contact_id,
          templateId: r.template_id,
          status: r.status,
          heldAt: fmtDate(r.held_at),
          verdict: r.verdict,
          verdictReason: r.verdict_reason,
          nextStep: r.next_step,
          sbrCadence: r.sbr_cadence,
          answers: answers.map((a) => ({
            questionId: a.question_id,
            key: a.key,
            prompt: a.prompt,
            responseType: a.response_type,
            value: a.value,
          })),
        };
      } catch {
        return null;
      }
    },

    async createDiscoveryCall(input: DiscoveryCallInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.createDiscoveryCall(input);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO discovery_call
           (account_id, opportunity_id, contact_id, template_id, status, held_at,
            verdict, verdict_reason, next_step, sbr_cadence)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::discovery_verdict, $8, $9, $10)
         RETURNING id`,
        [
          input.accountId,
          nullIfEmpty(input.opportunityId),
          nullIfEmpty(input.contactId),
          nullIfEmpty(input.templateId),
          input.status,
          nullIfEmpty(input.heldAt),
          nullIfEmpty(input.verdict),
          nullIfEmpty(input.verdictReason),
          nullIfEmpty(input.nextStep),
          nullIfEmpty(input.sbrCadence),
        ],
      );
      return rows[0].id;
    },

    async updateDiscoveryCall(id: string, input: DiscoveryCallInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.updateDiscoveryCall(id, input);
      await pool.query(
        `UPDATE discovery_call
         SET account_id = $1, opportunity_id = $2, contact_id = $3, template_id = $4,
             status = $5, held_at = $6::timestamptz, verdict = $7::discovery_verdict,
             verdict_reason = $8, next_step = $9, sbr_cadence = $10
         WHERE id = $11`,
        [
          input.accountId,
          nullIfEmpty(input.opportunityId),
          nullIfEmpty(input.contactId),
          nullIfEmpty(input.templateId),
          input.status,
          nullIfEmpty(input.heldAt),
          nullIfEmpty(input.verdict),
          nullIfEmpty(input.verdictReason),
          nullIfEmpty(input.nextStep),
          nullIfEmpty(input.sbrCadence),
          id,
        ],
      );
    },

    async deleteDiscoveryCall(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.deleteDiscoveryCall(id);
      await pool.query(`DELETE FROM discovery_call WHERE id = $1`, [id]);
    },

    async listSbrs(): Promise<SbrRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listSbrs();
      try {
        const { rows } = await pool.query<{
          id: string;
          account: string;
          review_date: Date;
          period_label: string | null;
          status: string;
        }>(
          `SELECT s.id, a.name AS account, s.review_date, s.period_label, s.status
           FROM strategic_business_review s JOIN account a ON a.id = s.account_id
           ORDER BY s.review_date DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          account: r.account,
          reviewDate: fmtDate(r.review_date) ?? "",
          periodLabel: r.period_label,
          status: r.status,
        }));
      } catch {
        return mockRepositories.engagements.listSbrs();
      }
    },

    async getSbr(id: string): Promise<SbrDetail | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          account_id: string;
          contact_id: string | null;
          benchmark_assessment_id: string | null;
          review_date: Date;
          period_label: string | null;
          status: string;
          concerns: string | null;
          summary: string | null;
          next_actions: string | null;
        }>(
          `SELECT id, account_id, contact_id, benchmark_assessment_id, review_date,
                  period_label, status, concerns, summary, next_actions
           FROM strategic_business_review WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        const [{ rows: scores }, { rows: tickets }] = await Promise.all([
          pool.query<{ dimension: string; rating: string | null; note: string | null }>(
            `SELECT dimension, rating, note FROM sbr_dimension_score
             WHERE sbr_id = $1 ORDER BY dimension`,
            [id],
          ),
          pool.query<{
            id: string;
            account: string;
            number: string | null;
            title: string;
            status: string | null;
            priority: string | null;
            opened_at: Date | null;
          }>(
            `SELECT t.id, a.name AS account, t.number, t.title, t.status, t.priority, t.opened_at
             FROM sbr_ticket st JOIN ticket t ON t.id = st.ticket_id
             JOIN account a ON a.id = t.account_id
             WHERE st.sbr_id = $1 ORDER BY t.opened_at DESC NULLS LAST`,
            [id],
          ),
        ]);
        return {
          id: r.id,
          accountId: r.account_id,
          contactId: r.contact_id,
          benchmarkAssessmentId: r.benchmark_assessment_id,
          reviewDate: fmtDate(r.review_date) ?? "",
          periodLabel: r.period_label,
          status: r.status,
          concerns: r.concerns,
          summary: r.summary,
          nextActions: r.next_actions,
          dimensionScores: scores.map((s) => ({
            dimension: s.dimension,
            rating: s.rating,
            note: s.note,
          })),
          tickets: tickets.map((t) => ({
            id: t.id,
            account: t.account,
            number: t.number,
            title: t.title,
            status: t.status,
            priority: t.priority,
            opened: fmtDate(t.opened_at),
          })),
        };
      } catch {
        return null;
      }
    },

    async createSbr(input: SbrInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.createSbr(input);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO strategic_business_review
           (account_id, contact_id, benchmark_assessment_id, review_date, period_label,
            status, concerns, summary, next_actions)
         VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          input.accountId,
          nullIfEmpty(input.contactId),
          nullIfEmpty(input.benchmarkAssessmentId),
          input.reviewDate,
          nullIfEmpty(input.periodLabel),
          input.status,
          nullIfEmpty(input.concerns),
          nullIfEmpty(input.summary),
          nullIfEmpty(input.nextActions),
        ],
      );
      return rows[0].id;
    },

    async updateSbr(id: string, input: SbrInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.updateSbr(id, input);
      await pool.query(
        `UPDATE strategic_business_review
         SET account_id = $1, contact_id = $2, benchmark_assessment_id = $3,
             review_date = $4::date, period_label = $5, status = $6, concerns = $7,
             summary = $8, next_actions = $9
         WHERE id = $10`,
        [
          input.accountId,
          nullIfEmpty(input.contactId),
          nullIfEmpty(input.benchmarkAssessmentId),
          input.reviewDate,
          nullIfEmpty(input.periodLabel),
          input.status,
          nullIfEmpty(input.concerns),
          nullIfEmpty(input.summary),
          nullIfEmpty(input.nextActions),
          id,
        ],
      );
    },

    async deleteSbr(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.deleteSbr(id);
      await pool.query(`DELETE FROM strategic_business_review WHERE id = $1`, [id]);
    },

    async saveAnswers(
      engagementType: string,
      engagementId: string,
      answers: AnswerInput[],
    ): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.saveAnswers(engagementType, engagementId, answers);
      // One upsert per answer; the UNIQUE (type,id,question) constraint keeps one row.
      // Provenance (ADR-0027): agent/automation answers carry source/confidence/status;
      // omitted fields default to human/confirmed for backward compatibility.
      for (const a of answers) {
        await pool.query(
          `INSERT INTO engagement_answer
             (engagement_type, engagement_id, question_id, value_text, value_number,
              value_bool, value_json, value_date, answered_by_contact_id,
              source, confidence, status)
           VALUES ($1::engagement_kind, $2, $3, $4, $5::numeric, $6, $7::jsonb, $8::date, $9,
                   COALESCE($10, 'human'), $11::numeric, COALESCE($12, 'confirmed'))
           ON CONFLICT (engagement_type, engagement_id, question_id) DO UPDATE SET
             value_text = excluded.value_text, value_number = excluded.value_number,
             value_bool = excluded.value_bool, value_json = excluded.value_json,
             value_date = excluded.value_date,
             answered_by_contact_id = excluded.answered_by_contact_id, answered_at = now(),
             source = excluded.source, confidence = excluded.confidence, status = excluded.status`,
          [
            engagementType,
            engagementId,
            a.questionId,
            nullIfEmpty(a.valueText),
            nullIfEmpty(a.valueNumber),
            a.valueBool,
            a.valueJson == null ? null : JSON.stringify(a.valueJson),
            nullIfEmpty(a.valueDate),
            nullIfEmpty(a.answeredByContactId),
            a.source ?? null,
            nullIfEmpty(a.confidence ?? null),
            a.status ?? null,
          ],
        );
      }
    },

    async listAnswersForReview(
      engagementType: string,
      engagementId: string,
    ): Promise<AnswerReviewRow[]> {
      const pool = getPool();
      if (!pool) {
        return mockRepositories.engagements.listAnswersForReview(engagementType, engagementId);
      }
      try {
        const { rows } = await pool.query<{
          id: string;
          prompt: string;
          value: string | null;
          source: string;
          confidence: string | null;
          status: string;
        }>(
          `SELECT ea.id, q.prompt,
                  COALESCE(ea.value_text, ea.value_number::text, ea.value_bool::text,
                           ea.value_date::text, ea.value_json::text) AS value,
                  ea.source, ea.confidence, ea.status
           FROM engagement_answer ea JOIN question q ON q.id = ea.question_id
           WHERE ea.engagement_type = $1::engagement_kind AND ea.engagement_id = $2
           ORDER BY q.ordinal`,
          [engagementType, engagementId],
        );
        return rows.map((r) => ({
          id: r.id,
          prompt: r.prompt,
          value: r.value,
          source: r.source,
          confidence: r.confidence != null ? Number(r.confidence) : null,
          status: r.status,
        }));
      } catch {
        return mockRepositories.engagements.listAnswersForReview(engagementType, engagementId);
      }
    },

    async confirmAnswer(answerId: string, userId: string | null): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.confirmAnswer(answerId, userId);
      await pool.query(
        `UPDATE engagement_answer
         SET status = 'confirmed', approved_by_user_id = $2, approved_at = now()
         WHERE id = $1`,
        [answerId, userId],
      );
    },

    async rejectAnswer(answerId: string, userId: string | null): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.rejectAnswer(answerId, userId);
      await pool.query(
        `UPDATE engagement_answer
         SET status = 'rejected', approved_by_user_id = $2, approved_at = now()
         WHERE id = $1`,
        [answerId, userId],
      );
    },

    async saveSbrScores(sbrId: string, scores: SbrScoreInput[]): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.saveSbrScores(sbrId, scores);
      for (const s of scores) {
        await pool.query(
          `INSERT INTO sbr_dimension_score (sbr_id, dimension, rating, note)
           VALUES ($1, $2, $3::assessment_rating, $4)
           ON CONFLICT (sbr_id, dimension) DO UPDATE SET
             rating = excluded.rating, note = excluded.note`,
          [sbrId, s.dimension, nullIfEmpty(s.rating), nullIfEmpty(s.note)],
        );
      }
    },

    async setSbrTickets(sbrId: string, ticketIds: string[]): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.setSbrTickets(sbrId, ticketIds);
      // Replace the link set: clear, then insert the chosen tickets.
      await pool.query(`DELETE FROM sbr_ticket WHERE sbr_id = $1`, [sbrId]);
      for (const ticketId of ticketIds) {
        await pool.query(
          `INSERT INTO sbr_ticket (sbr_id, ticket_id) VALUES ($1, $2)
           ON CONFLICT (sbr_id, ticket_id) DO NOTHING`,
          [sbrId, ticketId],
        );
      }
    },

    async listAssessmentArtifacts(assessmentId: string): Promise<ArtifactRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listAssessmentArtifacts(assessmentId);
      try {
        const { rows } = await pool.query<{
          id: string;
          source: string;
          kind: string;
          title: string | null;
          dimension: string | null;
          collected_at: Date | null;
          summary_gold: string | null;
        }>(
          `SELECT id, source, kind, title, dimension, collected_at, summary_gold
           FROM assessment_artifact WHERE assessment_id = $1 ORDER BY collected_at DESC`,
          [assessmentId],
        );
        return rows.map((r) => ({
          id: r.id,
          source: r.source,
          kind: r.kind,
          title: r.title,
          dimension: r.dimension,
          collectedAt: fmtDate(r.collected_at),
          summary: r.summary_gold,
        }));
      } catch {
        return mockRepositories.engagements.listAssessmentArtifacts(assessmentId);
      }
    },

    async spawnOpportunity(input: SpawnOpportunityInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.spawnOpportunity(input);
      await pool.query(
        `INSERT INTO opportunity
           (account_id, name, sales_stage, amount_mrr, source,
            source_discovery_id, source_assessment_id, source_sbr_id)
         VALUES ($1, $2, $3::opportunity_sales_stage, $4::numeric, 'manual', $5, $6, $7)`,
        [
          input.accountId,
          input.name,
          input.salesStage,
          nullIfEmpty(input.amountMrr),
          nullIfEmpty(input.sourceDiscoveryId),
          nullIfEmpty(input.sourceAssessmentId),
          nullIfEmpty(input.sourceSbrId),
        ],
      );
    },

    async spawnProject(input: SpawnProjectInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.spawnProject(input);
      await pool.query(
        `INSERT INTO project
           (account_id, name, type, status, source_assessment_id, source_sbr_id)
         VALUES ($1, $2, $3::project_type, 'not_started', $4, $5)`,
        [
          input.accountId,
          input.name,
          input.type,
          nullIfEmpty(input.sourceAssessmentId),
          nullIfEmpty(input.sourceSbrId),
        ],
      );
    },

    async spawnTicket(input: SpawnTicketInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.spawnTicket(input);
      await pool.query(
        `INSERT INTO ticket
           (account_id, title, source, status, source_assessment_id, source_sbr_id)
         VALUES ($1, $2, 'manual', 'new', $3, $4)`,
        [
          input.accountId,
          input.title,
          nullIfEmpty(input.sourceAssessmentId),
          nullIfEmpty(input.sourceSbrId),
        ],
      );
    },

    async listTickets(): Promise<TicketRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listTickets();
      try {
        const { rows } = await pool.query<{
          id: string;
          account: string;
          number: string | null;
          title: string;
          status: string | null;
          priority: string | null;
          opened_at: Date | null;
        }>(
          `SELECT t.id, a.name AS account, t.number, t.title, t.status, t.priority, t.opened_at
           FROM ticket t JOIN account a ON a.id = t.account_id
           ORDER BY t.opened_at DESC NULLS LAST`,
        );
        return rows.map((r) => ({
          id: r.id,
          account: r.account,
          number: r.number,
          title: r.title,
          status: r.status,
          priority: r.priority,
          opened: fmtDate(r.opened_at),
        }));
      } catch {
        return mockRepositories.engagements.listTickets();
      }
    },
  },

  // ── Communications (ADR-0011) ─────────────────────────────────────────────
  comms: {
    async listInteractions(filter: InteractionFilter): Promise<InteractionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.comms.listInteractions(filter);
      try {
        const where: string[] = [];
        const params: unknown[] = [];
        if (filter.contactId) { params.push(filter.contactId); where.push(`i.contact_id = $${params.length}`); }
        if (filter.accountId) { params.push(filter.accountId); where.push(`i.account_id = $${params.length}`); }
        if (filter.source) { params.push(filter.source); where.push(`i.source = $${params.length}::interaction_source`); }
        if (filter.kind) { params.push(filter.kind); where.push(`i.kind = $${params.length}`); }
        const limit = Math.min(Math.max(filter.limit ?? 200, 1), 500);
        const { rows } = await pool.query<InteractionDbRow>(
          `SELECT i.id, i.source::text AS source, i.kind, i.channel, i.direction::text AS direction,
                  i.subject, i.summary_gold, i.occurred_at,
                  u.display_name AS owner, c.full_name AS contact, a.name AS account
           FROM interaction i
           LEFT JOIN app_user u ON u.id = i.owner_user_id
           LEFT JOIN contact c ON c.id = i.contact_id
           LEFT JOIN account a ON a.id = i.account_id
           ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
           ORDER BY i.occurred_at DESC
           LIMIT ${limit}`,
          params,
        );
        return rows.map(mapInteraction);
      } catch {
        return mockRepositories.comms.listInteractions(filter);
      }
    },

    async listInteractionsByContact(contactId: string): Promise<InteractionRow[]> {
      return postgresRepositories.comms.listInteractions({ contactId });
    },

    async listInteractionsByAccount(accountId: string): Promise<InteractionRow[]> {
      return postgresRepositories.comms.listInteractions({ accountId });
    },

    async getInteraction(id: string): Promise<CommunicationDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.comms.getInteraction(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          source: string;
          kind: string | null;
          channel: string | null;
          direction: string | null;
          subject: string | null;
          summary_gold: string | null;
          body: string | null;
          occurred_at: Date | null;
          owner: string | null;
          contact: string | null;
          contact_id: string | null;
          account: string | null;
          account_id: string | null;
          m_platform: string | null;
          m_title: string | null;
          m_copilot_recap: string | null;
          m_plaud_summary: string | null;
          m_transcript_ref: string | null;
        }>(
          `SELECT i.id, i.source::text AS source, i.kind, i.channel,
                  i.direction::text AS direction, i.subject, i.summary_gold,
                  coalesce(i.normalized_silver->>'body', i.payload_bronze->>'body') AS body,
                  i.occurred_at,
                  u.display_name AS owner,
                  c.full_name AS contact, c.id AS contact_id,
                  a.name AS account, a.id AS account_id,
                  mt.platform::text AS m_platform, mt.title AS m_title,
                  mt.copilot_recap AS m_copilot_recap, mt.plaud_summary AS m_plaud_summary,
                  mt.transcript_ref AS m_transcript_ref
           FROM interaction i
           LEFT JOIN app_user u ON u.id = i.owner_user_id
           LEFT JOIN contact c ON c.id = i.contact_id
           LEFT JOIN account a ON a.id = i.account_id
           LEFT JOIN meeting mt ON mt.interaction_id = i.id
           WHERE i.id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        const { rows: aiRows } = await pool.query<{
          id: string;
          description: string;
          status: string;
          due_at: Date | null;
          contact: string | null;
          owner: string | null;
          source_task_id: string | null;
        }>(
          `SELECT m.id, m.description, m.status, m.due_at,
                  c.full_name AS contact, u.display_name AS owner, m.source_task_id
           FROM meeting_action_item m
           LEFT JOIN contact c ON c.id = m.contact_id
           LEFT JOIN app_user u ON u.id = m.owner_user_id
           WHERE m.interaction_id = $1
           ORDER BY m.due_at NULLS LAST, m.created_at DESC`,
          [id],
        );
        return {
          id: r.id,
          source: r.source,
          kind: r.kind,
          channel: r.channel,
          direction: r.direction,
          subject: r.subject,
          summary: r.summary_gold,
          body: r.body,
          owner: r.owner,
          contact: r.contact,
          contactId: r.contact_id,
          account: r.account,
          accountId: r.account_id,
          occurredAt: fmtDateTime(r.occurred_at),
          meeting: r.m_platform || r.m_copilot_recap || r.m_plaud_summary || r.m_transcript_ref
            ? {
                platform: r.m_platform,
                title: r.m_title,
                copilotRecap: r.m_copilot_recap,
                plaudSummary: r.m_plaud_summary,
                transcriptRef: r.m_transcript_ref,
              }
            : null,
          actionItems: aiRows.map((a) => ({
            id: a.id,
            description: a.description,
            status: a.status,
            due: fmtDate(a.due_at),
            contact: a.contact,
            owner: a.owner,
            promotedToTask: a.source_task_id != null,
          })),
        };
      } catch {
        return mockRepositories.comms.getInteraction(id);
      }
    },

    async createInteraction(input: InteractionInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.comms.createInteraction(input);
      // Scaffold: logs the comm to the timeline. The real provider send is stubbed.
      await pool.query(
        `INSERT INTO interaction
           (account_id, contact_id, source, kind, direction, subject, summary_gold)
         VALUES ($1, $2, $3::interaction_source, $4, $5::interaction_direction, $6, $7)`,
        [
          nullIfEmpty(input.accountId),
          nullIfEmpty(input.contactId),
          input.source,
          input.kind,
          input.direction,
          nullIfEmpty(input.subject),
          nullIfEmpty(input.body),
        ],
      );
    },

    async listActionItems(contactId?: string): Promise<ActionItemRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.comms.listActionItems(contactId);
      try {
        const params: unknown[] = [];
        let where = "";
        if (contactId) { params.push(contactId); where = `WHERE m.contact_id = $1`; }
        const { rows } = await pool.query<{
          id: string;
          description: string;
          status: string;
          due_at: Date | null;
          contact: string | null;
          owner: string | null;
          source_task_id: string | null;
        }>(
          `SELECT m.id, m.description, m.status, m.due_at,
                  c.full_name AS contact, u.display_name AS owner, m.source_task_id
           FROM meeting_action_item m
           LEFT JOIN contact c ON c.id = m.contact_id
           LEFT JOIN app_user u ON u.id = m.owner_user_id
           ${where}
           ORDER BY m.due_at NULLS LAST, m.created_at DESC`,
          params,
        );
        return rows.map((r) => ({
          id: r.id,
          description: r.description,
          status: r.status,
          due: fmtDate(r.due_at),
          contact: r.contact,
          owner: r.owner,
          promotedToTask: r.source_task_id != null,
        }));
      } catch {
        return mockRepositories.comms.listActionItems(contactId);
      }
    },

    async completeActionItem(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.comms.completeActionItem(id);
      await pool.query(`UPDATE meeting_action_item SET status = 'done' WHERE id = $1`, [id]);
    },
  },

  // ── Contacts 360 & enrichment (ADR-0025) ──────────────────────────────────
  contacts: {
    async getProfile(id: string): Promise<ContactProfile | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.getProfile(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          title: string | null;
          headline: string | null;
          location: string | null;
          avatar_url: string | null;
          lifecycle_status: string;
          account: string | null;
          account_id: string | null;
          last_enriched_at: Date | null;
        }>(
          `SELECT c.id, c.full_name, c.email, c.phone, c.title, c.headline, c.location,
                  c.avatar_url, c.lifecycle_status, a.name AS account, c.account_id,
                  c.last_enriched_at
           FROM contact c LEFT JOIN account a ON a.id = c.account_id
           WHERE c.id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          fullName: r.full_name,
          email: r.email,
          phone: r.phone,
          title: r.title,
          headline: r.headline,
          location: r.location,
          avatarUrl: r.avatar_url,
          lifecycleStatus: r.lifecycle_status,
          account: r.account,
          accountId: r.account_id,
          lastEnrichedAt: fmtDate(r.last_enriched_at),
        };
      } catch {
        return mockRepositories.contacts.getProfile(id);
      }
    },

    async getContact(id: string): Promise<ContactEditable | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.getContact(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          account_id: string | null;
          full_name: string;
          email: string | null;
          phone: string | null;
          title: string | null;
          headline: string | null;
          location: string | null;
          lifecycle_status: string;
        }>(
          `SELECT id, account_id, full_name, email, phone, title, headline, location, lifecycle_status
           FROM contact WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          accountId: r.account_id,
          fullName: r.full_name,
          email: r.email,
          phone: r.phone,
          title: r.title,
          headline: r.headline,
          location: r.location,
          lifecycleStatus: r.lifecycle_status,
        };
      } catch {
        return mockRepositories.contacts.getContact(id);
      }
    },

    async createContact(input: ContactInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.createContact(input);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO contact
           (account_id, full_name, email, phone, title, headline, location, lifecycle_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          nullIfEmpty(input.accountId),
          input.fullName,
          nullIfEmpty(input.email),
          nullIfEmpty(input.phone),
          nullIfEmpty(input.title),
          nullIfEmpty(input.headline),
          nullIfEmpty(input.location),
          input.lifecycleStatus,
        ],
      );
      return rows[0].id;
    },

    async updateContact(id: string, input: ContactInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.updateContact(id, input);
      await pool.query(
        `UPDATE contact
         SET account_id = $1, full_name = $2, email = $3, phone = $4, title = $5,
             headline = $6, location = $7, lifecycle_status = $8
         WHERE id = $9`,
        [
          nullIfEmpty(input.accountId),
          input.fullName,
          nullIfEmpty(input.email),
          nullIfEmpty(input.phone),
          nullIfEmpty(input.title),
          nullIfEmpty(input.headline),
          nullIfEmpty(input.location),
          input.lifecycleStatus,
          id,
        ],
      );
    },

    async deleteContact(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.deleteContact(id);
      await pool.query(`DELETE FROM contact WHERE id = $1`, [id]);
    },

    async listSocialIdentities(contactId: string): Promise<SocialIdentityRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.listSocialIdentities(contactId);
      try {
        const { rows } = await pool.query<{
          id: string;
          platform: string;
          handle: string | null;
          profile_url: string | null;
          follower_count: number | null;
          verified: boolean;
        }>(
          `SELECT id, platform, handle, profile_url, follower_count, verified
           FROM contact_social_identity WHERE contact_id = $1 ORDER BY platform`,
          [contactId],
        );
        return rows.map((r) => ({
          id: r.id,
          platform: r.platform,
          handle: r.handle,
          profileUrl: r.profile_url,
          followerCount: r.follower_count,
          verified: r.verified,
        }));
      } catch {
        return mockRepositories.contacts.listSocialIdentities(contactId);
      }
    },

    async listEnrichment(contactId: string): Promise<EnrichmentFactRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.listEnrichment(contactId);
      try {
        const { rows } = await pool.query<{
          id: string;
          attribute_key: string;
          value_text: string | null;
          value_json: unknown | null;
          confidence: string | null;
          source: string | null;
          source_connection: string | null;
          lawful_basis: string;
          observed_at: Date | null;
        }>(
          `SELECT e.id, e.attribute_key, e.value_text, e.value_json, e.confidence, e.source,
                  CASE WHEN cn.id IS NOT NULL THEN
                    initcap(cn.provider::text) ||
                    COALESCE(' · ' || COALESCE(u.display_name, u.email), '')
                  END AS source_connection,
                  e.lawful_basis::text AS lawful_basis, e.observed_at
           FROM contact_enrichment e
           LEFT JOIN connection cn ON cn.id = e.source_connection_id
           LEFT JOIN app_user u ON u.id = cn.owner_user_id
           WHERE e.contact_id = $1
           ORDER BY e.attribute_key, e.observed_at DESC`,
          [contactId],
        );
        return rows.map((r) => ({
          id: r.id,
          attributeKey: r.attribute_key,
          value: r.value_text ?? (r.value_json != null ? JSON.stringify(r.value_json) : null),
          confidence: r.confidence != null ? Number(r.confidence) : null,
          source: r.source,
          sourceConnection: r.source_connection,
          lawfulBasis: r.lawful_basis,
          observedAt: fmtDate(r.observed_at),
        }));
      } catch {
        return mockRepositories.contacts.listEnrichment(contactId);
      }
    },

    async addEnrichment(input: EnrichmentInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.addEnrichment(input);
      await pool.query(
        `INSERT INTO contact_enrichment
           (contact_id, attribute_key, value_text, confidence, source, lawful_basis)
         VALUES ($1, $2, $3, $4::numeric, $5, $6::lawful_basis)`,
        [
          input.contactId,
          input.attributeKey,
          nullIfEmpty(input.value),
          nullIfEmpty(input.confidence),
          nullIfEmpty(input.source),
          input.lawfulBasis,
        ],
      );
    },
  },

  // ── Consent ledger (ADR-0014) ─────────────────────────────────────────────
  consent: {
    async listConsent(contactId: string): Promise<ConsentEventRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.consent.listConsent(contactId);
      try {
        const { rows } = await pool.query<{
          id: string;
          channel: string;
          state: string;
          lawful_basis: string;
          source: string | null;
          occurred_at: Date | null;
        }>(
          `SELECT id, channel::text AS channel, state::text AS state,
                  lawful_basis::text AS lawful_basis, source, occurred_at
           FROM consent_event WHERE contact_id = $1 ORDER BY occurred_at DESC`,
          [contactId],
        );
        return rows.map((r) => ({
          id: r.id,
          channel: r.channel,
          state: r.state,
          lawfulBasis: r.lawful_basis,
          source: r.source,
          occurredAt: fmtDate(r.occurred_at),
        }));
      } catch {
        return mockRepositories.consent.listConsent(contactId);
      }
    },

    async currentConsent(contactId: string): Promise<CurrentConsentRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.consent.currentConsent(contactId);
      try {
        const { rows } = await pool.query<{ channel: string; state: string; lawful_basis: string }>(
          `SELECT channel::text AS channel, state::text AS state, lawful_basis::text AS lawful_basis
           FROM current_consent WHERE contact_id = $1 ORDER BY channel`,
          [contactId],
        );
        return rows.map((r) => ({ channel: r.channel, state: r.state, lawfulBasis: r.lawful_basis }));
      } catch {
        return mockRepositories.consent.currentConsent(contactId);
      }
    },

    async recordConsentEvent(input: ConsentEventInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.consent.recordConsentEvent(input);
      await pool.query(
        `INSERT INTO consent_event (contact_id, channel, state, lawful_basis, source)
         VALUES ($1, $2::consent_channel, $3::consent_state, $4::lawful_basis, $5)`,
        [input.contactId, input.channel, input.state, input.lawfulBasis, nullIfEmpty(input.source)],
      );
    },

    async canSend(contactId: string, channel: string): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.consent.canSend(contactId, channel);
      try {
        const { rows } = await pool.query<{ state: string }>(
          `SELECT state::text AS state FROM current_consent
           WHERE contact_id = $1 AND channel = $2::consent_channel`,
          [contactId, channel],
        );
        return rows[0]?.state === "opt_in";
      } catch {
        return mockRepositories.consent.canSend(contactId, channel);
      }
    },

    async canUseForAds(contactId: string): Promise<boolean> {
      return postgresRepositories.consent.canSend(contactId, "ad_targeting");
    },
  },

  // ── Connections & identity map (ADR-0012/0024) ────────────────────────────
  connections: {
    async listUserConnections(userEmail: string): Promise<ConnectionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.listUserConnections(userEmail);
      try {
        // Resolve the signed-in employee's app_user by email (the session carries
        // email, not the app_user id) — ADR-0024 per-user connections.
        const { rows } = await pool.query<ConnectionDbRow>(
          `SELECT cn.id, cn.scope::text AS scope, cn.provider::text AS provider, cn.display_name,
                  cn.status::text AS status, cn.scopes, u.display_name AS owner,
                  cn.keyvault_secret_ref, cn.last_sync_at, cn.connected_at
           FROM connection cn LEFT JOIN app_user u ON u.id = cn.owner_user_id
           WHERE cn.scope = 'user'
             AND cn.owner_user_id = (
               SELECT id FROM app_user WHERE lower(email) = lower($1) ORDER BY created_at LIMIT 1
             )
           ORDER BY cn.provider`,
          [userEmail],
        );
        return rows.map(mapConnection);
      } catch {
        return mockRepositories.connections.listUserConnections(userEmail);
      }
    },

    async listCompanyConnections(): Promise<ConnectionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.listCompanyConnections();
      try {
        const { rows } = await pool.query<ConnectionDbRow>(
          `SELECT cn.id, cn.scope::text AS scope, cn.provider::text AS provider, cn.display_name,
                  cn.status::text AS status, cn.scopes, NULL::text AS owner,
                  cn.keyvault_secret_ref, cn.last_sync_at, cn.connected_at
           FROM connection cn WHERE cn.scope = 'company' ORDER BY cn.provider`,
        );
        return rows.map(mapConnection);
      } catch {
        return mockRepositories.connections.listCompanyConnections();
      }
    },

    async connect(input: ConnectionInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.connect(input);
      // Scaffold: records the connection. Real OAuth + Key Vault token storage later.
      // A user-scope connection is attached to the signed-in employee (by email).
      await pool.query(
        `INSERT INTO connection (scope, owner_user_id, provider, display_name, scopes, status)
         VALUES ($1::connection_scope,
                 CASE WHEN $1 = 'user' AND $2 <> '' THEN
                   (SELECT id FROM app_user WHERE lower(email) = lower($2) ORDER BY created_at LIMIT 1)
                 ELSE NULL END,
                 $3::connection_provider, $4, $5, 'active')`,
        [
          input.scope,
          (input.ownerEmail ?? "").trim(),
          input.provider,
          nullIfEmpty(input.displayName),
          input.scopes,
        ],
      );
    },

    async saveCompanyCredential(input: CompanyCredentialInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.saveCompanyCredential(input);
      // Upsert by provider for company scope (uq_connection_company_provider, 0027).
      // The secret lives in Key Vault; we persist only its reference + status.
      await pool.query(
        `INSERT INTO connection
           (scope, provider, display_name, scopes, keyvault_secret_ref, status)
         VALUES ('company', $1::connection_provider, $2, $3, $4, $5::connection_status)
         ON CONFLICT (provider) WHERE scope = 'company'
         DO UPDATE SET display_name        = EXCLUDED.display_name,
                       scopes              = EXCLUDED.scopes,
                       keyvault_secret_ref = EXCLUDED.keyvault_secret_ref,
                       status              = EXCLUDED.status,
                       connected_at        = now(),
                       updated_at          = now()`,
        [
          input.provider,
          nullIfEmpty(input.displayName),
          input.scopes,
          nullIfEmpty(input.keyvaultSecretRef),
          input.status,
        ],
      );
    },

    async disconnect(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.disconnect(id);
      await pool.query(`DELETE FROM connection WHERE id = $1`, [id]);
    },

    async listExternalIdentities(accountId: string): Promise<ExternalIdentityRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.listExternalIdentities(accountId);
      try {
        const { rows } = await pool.query<{
          id: string;
          provider: string;
          external_id: string;
          contact: string | null;
        }>(
          `SELECT e.id, e.provider::text AS provider, e.external_id, c.full_name AS contact
           FROM external_identity e LEFT JOIN contact c ON c.id = e.contact_id
           WHERE e.account_id = $1 ORDER BY e.provider`,
          [accountId],
        );
        return rows.map((r) => ({
          id: r.id,
          provider: r.provider,
          externalId: r.external_id,
          contact: r.contact,
        }));
      } catch {
        return mockRepositories.connections.listExternalIdentities(accountId);
      }
    },
  },

  // ── Demand generation (ADR-0012/0026) ─────────────────────────────────────
  campaigns: {
    async listCampaigns(): Promise<CampaignRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.listCampaigns();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          platform: string;
          status: string;
          budget: string | null;
          spend: string | null;
          leads: string | null;
        }>(
          `SELECT c.id, c.name, c.platform::text AS platform, c.status::text AS status, c.budget,
                  SUM(m.spend) AS spend, COALESCE(SUM(m.leads), 0) AS leads
           FROM campaign c LEFT JOIN campaign_metric m ON m.campaign_id = c.id
           GROUP BY c.id ORDER BY c.created_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          platform: r.platform,
          status: r.status,
          budget: r.budget != null ? fmtUsd(Number(r.budget)) : "—",
          spend: r.spend != null ? fmtUsd(Number(r.spend)) : "—",
          leads: Number(r.leads ?? 0),
        }));
      } catch {
        return mockRepositories.campaigns.listCampaigns();
      }
    },

    async getCampaign(id: string): Promise<CampaignDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.getCampaign(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          platform: string;
          objective: string | null;
          status: string;
          budget: string | null;
          start_at: Date | null;
          end_at: Date | null;
        }>(
          `SELECT id, name, platform::text AS platform, objective, status::text AS status,
                  budget, start_at, end_at
           FROM campaign WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        const { rows: ads } = await pool.query<{
          id: string;
          name: string;
          status: string;
          spend: string | null;
          impressions: string | null;
          clicks: string | null;
          leads: string | null;
        }>(
          `SELECT ad.id, ad.name, ad.status::text AS status,
                  SUM(m.spend) AS spend, COALESCE(SUM(m.impressions),0) AS impressions,
                  COALESCE(SUM(m.clicks),0) AS clicks, COALESCE(SUM(m.leads),0) AS leads
           FROM ad LEFT JOIN campaign_metric m ON m.ad_id = ad.id
           WHERE ad.campaign_id = $1 GROUP BY ad.id ORDER BY ad.created_at`,
          [id],
        );
        return {
          id: r.id,
          name: r.name,
          platform: r.platform,
          objective: r.objective,
          status: r.status,
          budget: r.budget != null ? fmtUsd(Number(r.budget)) : "—",
          startAt: fmtDate(r.start_at),
          endAt: fmtDate(r.end_at),
          ads: ads.map((ad) => ({
            id: ad.id,
            name: ad.name,
            status: ad.status,
            spend: ad.spend != null ? fmtUsd(Number(ad.spend)) : "—",
            impressions: Number(ad.impressions ?? 0),
            clicks: Number(ad.clicks ?? 0),
            leads: Number(ad.leads ?? 0),
          })),
        };
      } catch {
        return mockRepositories.campaigns.getCampaign(id);
      }
    },

    async createCampaign(input: CampaignInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.createCampaign(input);
      await pool.query(
        `INSERT INTO campaign (name, platform, objective, status, budget, start_at, end_at)
         VALUES ($1, $2::campaign_platform, $3, $4::campaign_status, $5::numeric, $6::date, $7::date)`,
        [
          input.name,
          input.platform,
          nullIfEmpty(input.objective),
          input.status,
          nullIfEmpty(input.budget),
          nullIfEmpty(input.startAt),
          nullIfEmpty(input.endAt),
        ],
      );
    },

    async createAd(campaignId: string, input: AdInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.createAd(campaignId, input);
      await pool.query(
        `INSERT INTO ad (campaign_id, name, status, creative)
         VALUES ($1, $2, $3::campaign_status, $4::jsonb)`,
        [
          campaignId,
          input.name,
          input.status,
          input.creative == null ? null : JSON.stringify({ copy: input.creative }),
        ],
      );
    },

    async listAudiences(): Promise<AudienceRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.listAudiences();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          description: string | null;
          kind: string;
          member_count: string;
          ad_ready: string;
        }>(
          `SELECT au.id, au.name, au.description, au.kind::text AS kind,
                  COUNT(am.contact_id) AS member_count,
                  COUNT(am.contact_id) FILTER (
                    WHERE cc.state = 'opt_in'
                  ) AS ad_ready
           FROM audience au
           LEFT JOIN audience_member am ON am.audience_id = au.id
           LEFT JOIN current_consent cc
             ON cc.contact_id = am.contact_id AND cc.channel = 'ad_targeting'
           GROUP BY au.id ORDER BY au.created_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          kind: r.kind,
          memberCount: Number(r.member_count),
          adReadyCount: Number(r.ad_ready),
        }));
      } catch {
        return mockRepositories.campaigns.listAudiences();
      }
    },

    async getAudienceMembers(id: string): Promise<AudienceMemberRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.getAudienceMembers(id);
      try {
        const { rows } = await pool.query<{
          contact_id: string;
          full_name: string;
          account: string | null;
          ad_consent: boolean;
        }>(
          `SELECT c.id AS contact_id, c.full_name, a.name AS account,
                  (cc.state = 'opt_in') AS ad_consent
           FROM audience_member am
           JOIN contact c ON c.id = am.contact_id
           LEFT JOIN account a ON a.id = c.account_id
           LEFT JOIN current_consent cc
             ON cc.contact_id = c.id AND cc.channel = 'ad_targeting'
           WHERE am.audience_id = $1 ORDER BY c.full_name`,
          [id],
        );
        return rows.map((r) => ({
          contactId: r.contact_id,
          fullName: r.full_name,
          account: r.account,
          adConsent: r.ad_consent === true,
        }));
      } catch {
        return mockRepositories.campaigns.getAudienceMembers(id);
      }
    },

    async createAudience(input: AudienceInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.createAudience(input);
      const valid = input.criteria.filter((c) => c.key && c.value);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO audience (name, description, kind, definition)
         VALUES ($1, $2, $3::audience_kind, $4::jsonb)
         RETURNING id`,
        [input.name, nullIfEmpty(input.description), input.kind, JSON.stringify({ criteria: valid })],
      );
      const audienceId = rows[0].id;
      // Materialize the member set from the criteria (over the enrichment dossier).
      const members = await queryAudienceMatches(pool, valid);
      for (const m of members) {
        await pool.query(
          `INSERT INTO audience_member (audience_id, contact_id, source)
           VALUES ($1, $2, 'criteria') ON CONFLICT DO NOTHING`,
          [audienceId, m.contactId],
        );
      }
    },

    async previewAudienceMembers(criteria: AudienceCriterion[]): Promise<AudienceMemberRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.previewAudienceMembers(criteria);
      try {
        return await queryAudienceMatches(pool, criteria);
      } catch {
        return mockRepositories.campaigns.previewAudienceMembers(criteria);
      }
    },

    async launchAudience(id: string): Promise<number> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.launchAudience(id);
      // Consent gate: only members with current ad_targeting opt-in are eligible.
      const members = await postgresRepositories.campaigns.getAudienceMembers(id);
      return members.filter((m) => m.adConsent).length;
    },
  },

  // ── Lead-capture hooks (ADR-0024) ─────────────────────────────────────────
  leads: {
    async listHooks(): Promise<LeadHookRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.leads.listHooks();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          kind: string;
          active: boolean;
          capture_count: string;
        }>(
          `SELECT h.id, h.name, h.kind::text AS kind, h.active,
                  COUNT(e.id) AS capture_count
           FROM lead_hook h LEFT JOIN lead_capture_event e ON e.hook_id = h.id
           GROUP BY h.id ORDER BY h.created_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          kind: r.kind,
          active: r.active,
          captureCount: Number(r.capture_count),
        }));
      } catch {
        return mockRepositories.leads.listHooks();
      }
    },

    async createHook(input: LeadHookInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.leads.createHook(input);
      await pool.query(
        `INSERT INTO lead_hook (name, kind, active, config)
         VALUES ($1, $2::lead_hook_kind, $3, $4::jsonb)`,
        [
          input.name,
          input.kind,
          input.active,
          input.config == null ? null : JSON.stringify(input.config),
        ],
      );
    },

    async listCaptureEvents(): Promise<LeadCaptureEventRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.leads.listCaptureEvents();
      try {
        const { rows } = await pool.query<{
          id: string;
          hook: string | null;
          status: string;
          contact: string | null;
          payload_bronze: unknown | null;
          received_at: Date | null;
        }>(
          `SELECT e.id, h.name AS hook, e.status, c.full_name AS contact,
                  e.payload_bronze, e.received_at
           FROM lead_capture_event e
           LEFT JOIN lead_hook h ON h.id = e.hook_id
           LEFT JOIN contact c ON c.id = e.contact_id
           ORDER BY e.received_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          hook: r.hook,
          status: r.status,
          contact: r.contact,
          summary: r.payload_bronze != null ? JSON.stringify(r.payload_bronze).slice(0, 160) : null,
          receivedAt: fmtDateTime(r.received_at),
        }));
      } catch {
        return mockRepositories.leads.listCaptureEvents();
      }
    },

    async resolveEvent(eventId: string): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.leads.resolveEvent(eventId);
      // Scaffold: mark resolved and return the linked contact (full resolution —
      // contact creation from the raw payload — lands with the ingestion service).
      const { rows } = await pool.query<{ contact_id: string | null }>(
        `UPDATE lead_capture_event SET status = 'resolved' WHERE id = $1
         RETURNING contact_id`,
        [eventId],
      );
      return rows[0]?.contact_id ?? "";
    },
  },

  // ── Automation workflows (ADR-0014/0027) ──────────────────────────────────
  workflows: {
    async listWorkflows(): Promise<WorkflowRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.listWorkflows();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          kind: string;
          status: string;
          step_count: string;
          active_enrollments: string;
        }>(
          `SELECT w.id, w.name, w.kind::text AS kind, w.status,
                  COUNT(DISTINCT s.id) AS step_count,
                  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS active_enrollments
           FROM workflow w
           LEFT JOIN workflow_step s ON s.workflow_id = w.id
           LEFT JOIN workflow_enrollment e ON e.workflow_id = w.id
           GROUP BY w.id ORDER BY w.created_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          kind: r.kind,
          status: r.status,
          stepCount: Number(r.step_count),
          activeEnrollments: Number(r.active_enrollments),
        }));
      } catch {
        return mockRepositories.workflows.listWorkflows();
      }
    },

    async getWorkflow(id: string): Promise<WorkflowDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.getWorkflow(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          kind: string;
          status: string;
          trigger: unknown | null;
        }>(
          `SELECT id, name, kind::text AS kind, status, trigger FROM workflow WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        const { rows: steps } = await pool.query<{
          id: string;
          ordinal: number;
          kind: string;
          config: unknown | null;
        }>(
          `SELECT id, ordinal, kind::text AS kind, config
           FROM workflow_step WHERE workflow_id = $1 ORDER BY ordinal`,
          [id],
        );
        return {
          id: r.id,
          name: r.name,
          kind: r.kind,
          status: r.status,
          trigger: r.trigger != null ? JSON.stringify(r.trigger) : null,
          steps: steps.map((s) => ({
            id: s.id,
            ordinal: s.ordinal,
            kind: s.kind,
            summary: s.config != null ? JSON.stringify(s.config) : null,
          })),
        };
      } catch {
        return mockRepositories.workflows.getWorkflow(id);
      }
    },

    async createWorkflow(input: WorkflowInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.createWorkflow(input);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO workflow (name, kind, status, trigger)
         VALUES ($1, $2::workflow_kind, $3, $4::jsonb)
         RETURNING id`,
        [input.name, input.kind, input.status, input.trigger ? JSON.stringify({ note: input.trigger }) : null],
      );
      return rows[0].id;
    },

    async addStep(workflowId: string, input: WorkflowStepInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.addStep(workflowId, input);
      await pool.query(
        `INSERT INTO workflow_step (workflow_id, ordinal, kind, config)
         VALUES ($1,
                 COALESCE((SELECT MAX(ordinal) + 1 FROM workflow_step WHERE workflow_id = $1), 1),
                 $2::workflow_step_kind, $3::jsonb)`,
        [workflowId, input.kind, input.config ? JSON.stringify({ note: input.config }) : null],
      );
    },

    async deleteStep(stepId: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.deleteStep(stepId);
      await pool.query(`DELETE FROM workflow_step WHERE id = $1`, [stepId]);
    },

    async listEnrollments(): Promise<EnrollmentRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.listEnrollments();
      try {
        const { rows } = await pool.query<{
          id: string;
          contact: string | null;
          workflow: string;
          status: string;
          current_step_ordinal: number;
          enrolled_at: Date | null;
        }>(
          `SELECT e.id, c.full_name AS contact, w.name AS workflow, e.status,
                  e.current_step_ordinal, e.enrolled_at
           FROM workflow_enrollment e
           JOIN workflow w ON w.id = e.workflow_id
           LEFT JOIN contact c ON c.id = e.contact_id
           ORDER BY e.enrolled_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          contact: r.contact,
          workflow: r.workflow,
          status: r.status,
          currentStep: r.current_step_ordinal,
          enrolledAt: fmtDate(r.enrolled_at),
        }));
      } catch {
        return mockRepositories.workflows.listEnrollments();
      }
    },

    async enroll(workflowId: string, contactId: string, accountId: string | null): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.enroll(workflowId, contactId, accountId);
      await pool.query(
        `INSERT INTO workflow_enrollment (workflow_id, contact_id, account_id)
         VALUES ($1, $2, $3)`,
        [workflowId, contactId, nullIfEmpty(accountId)],
      );
    },

    async exitEnrollment(enrollmentId: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.exitEnrollment(enrollmentId);
      await pool.query(
        `UPDATE workflow_enrollment SET status = 'exited', completed_at = now() WHERE id = $1`,
        [enrollmentId],
      );
    },
  },

  // ── Knowledge search over the gold layer ──────────────────────────────────
  knowledge: {
    async search(query: string): Promise<KnowledgeHit[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.knowledge.search(query);
      const q = query.trim();
      if (q === "") return [];
      try {
        const like = `%${q}%`;
        const [contacts, interactions] = await Promise.all([
          pool.query<{ id: string; title: string; snippet: string | null }>(
            `SELECT c.id, c.full_name AS title,
                    COALESCE(c.headline, c.title, a.name) AS snippet
             FROM contact c LEFT JOIN account a ON a.id = c.account_id
             WHERE c.full_name ILIKE $1
                OR EXISTS (SELECT 1 FROM contact_enrichment e
                           WHERE e.contact_id = c.id AND e.value_text ILIKE $1)
             ORDER BY c.full_name LIMIT 15`,
            [like],
          ),
          pool.query<{
            id: string;
            title: string | null;
            snippet: string | null;
            occurred_at: Date | null;
          }>(
            `SELECT i.id, COALESCE(i.subject, i.source::text) AS title,
                    i.summary_gold AS snippet, i.occurred_at
             FROM interaction i
             WHERE i.summary_gold ILIKE $1 OR i.subject ILIKE $1
             ORDER BY i.occurred_at DESC LIMIT 15`,
            [like],
          ),
        ]);
        return [
          ...contacts.rows.map((r) => ({
            id: r.id,
            kind: "contact",
            title: r.title,
            snippet: r.snippet,
            href: `/contacts/${r.id}`,
            when: null,
          })),
          ...interactions.rows.map((r) => ({
            id: r.id,
            kind: "interaction",
            title: r.title ?? "Interaction",
            snippet: r.snippet,
            href: "/communications",
            when: fmtDateTime(r.occurred_at),
          })),
        ];
      } catch {
        return mockRepositories.knowledge.search(query);
      }
    },
  },

  // ── Security / compliance posture ─────────────────────────────────────────
  security: {
    async getPosture(): Promise<SecurityPosture> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.getPosture();
      try {
        const { rows } = await pool.query<{
          total_contacts: string;
          with_consent: string;
          ad_eligible: string;
          conn_active: string;
          conn_total: string;
        }>(
          `SELECT
             (SELECT count(*) FROM contact) AS total_contacts,
             (SELECT count(DISTINCT contact_id) FROM current_consent WHERE state = 'opt_in') AS with_consent,
             (SELECT count(DISTINCT contact_id) FROM current_consent
                WHERE channel = 'ad_targeting' AND state = 'opt_in') AS ad_eligible,
             (SELECT count(*) FROM connection WHERE status = 'active') AS conn_active,
             (SELECT count(*) FROM connection) AS conn_total`,
        );
        const { rows: channels } = await pool.query<{ label: string; count: string }>(
          `SELECT channel::text AS label, count(*) AS count
           FROM current_consent WHERE state = 'opt_in'
           GROUP BY channel ORDER BY channel`,
        );
        const r = rows[0];
        return {
          totalContacts: Number(r.total_contacts),
          contactsWithConsent: Number(r.with_consent),
          adEligible: Number(r.ad_eligible),
          connectionsActive: Number(r.conn_active),
          connectionsTotal: Number(r.conn_total),
          consentByChannel: channels.map((c) => ({ label: c.label, count: Number(c.count) })),
        };
      } catch {
        return mockRepositories.security.getPosture();
      }
    },
  },
};

// ── Row mappers shared across methods ────────────────────────────────────────

interface InteractionDbRow {
  id: string;
  source: string;
  kind: string | null;
  channel: string | null;
  direction: string | null;
  subject: string | null;
  summary_gold: string | null;
  occurred_at: Date | null;
  owner: string | null;
  contact: string | null;
  account: string | null;
}

function mapInteraction(r: InteractionDbRow): InteractionRow {
  return {
    id: r.id,
    source: r.source,
    kind: r.kind,
    channel: r.channel,
    direction: r.direction,
    subject: r.subject,
    summary: r.summary_gold,
    owner: r.owner,
    contact: r.contact,
    account: r.account,
    occurredAt: fmtDateTime(r.occurred_at),
  };
}

interface ConnectionDbRow {
  id: string;
  scope: string;
  provider: string;
  display_name: string | null;
  status: string;
  scopes: string[];
  owner: string | null;
  keyvault_secret_ref: string | null;
  last_sync_at: Date | null;
  connected_at: Date | null;
}

function mapConnection(r: ConnectionDbRow): ConnectionRow {
  return {
    id: r.id,
    scope: r.scope,
    provider: r.provider,
    displayName: r.display_name,
    status: r.status,
    scopes: r.scopes ?? [],
    owner: r.owner,
    keyvaultSecretRef: r.keyvault_secret_ref,
    lastSync: fmtDateTime(r.last_sync_at),
    connectedAt: fmtDate(r.connected_at),
  };
}

/**
 * Match contacts against a set of enrichment criteria (ADR-0026). A contact matches
 * when, for every criterion, it has an enrichment fact whose attribute_key equals the
 * key and whose value contains the given value (ILIKE). Ad eligibility (current
 * ad_targeting consent) is flagged on each match. Empty criteria → no matches.
 */
async function queryAudienceMatches(
  pool: NonNullable<ReturnType<typeof getPool>>,
  criteria: AudienceCriterion[],
): Promise<AudienceMemberRow[]> {
  const valid = criteria.filter((c) => c.key && c.value);
  if (valid.length === 0) return [];
  const params: unknown[] = [];
  const clauses = valid.map((c) => {
    params.push(c.key);
    const ki = params.length;
    params.push(`%${c.value}%`);
    const vi = params.length;
    return `EXISTS (SELECT 1 FROM contact_enrichment e
              WHERE e.contact_id = c.id AND e.attribute_key = $${ki} AND e.value_text ILIKE $${vi})`;
  });
  const { rows } = await pool.query<{
    contact_id: string;
    full_name: string;
    account: string | null;
    ad_consent: boolean;
  }>(
    `SELECT c.id AS contact_id, c.full_name, a.name AS account,
            (cc.state = 'opt_in') AS ad_consent
     FROM contact c
     LEFT JOIN account a ON a.id = c.account_id
     LEFT JOIN current_consent cc ON cc.contact_id = c.id AND cc.channel = 'ad_targeting'
     WHERE ${clauses.join(" AND ")}
     ORDER BY c.full_name`,
    params,
  );
  return rows.map((r) => ({
    contactId: r.contact_id,
    fullName: r.full_name,
    account: r.account,
    adConsent: r.ad_consent === true,
  }));
}
