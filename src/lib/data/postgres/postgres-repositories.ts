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
  AssessmentEditable,
  AssessmentInput,
  DiscoveryCallInput,
  Option,
  ProjectEditable,
  ProjectInput,
  ProposalEditable,
  ProposalInput,
  Repositories,
  SbrInput,
  TaskEditable,
  TaskInput,
} from "@/lib/data/repositories";
import type {
  Account,
  ArtifactRow,
  AssessmentRow,
  ContactRow,
  CountDatum,
  DiscoveryCallDetail,
  DiscoveryCallRow,
  Health,
  Kpi,
  OpportunityRow,
  PipelineColumn,
  PipelineStage,
  ProjectRow,
  ProposalRow,
  QuestionRow,
  ReportSummary,
  SbrDetail,
  SbrRow,
  StageValueDatum,
  TaskRow,
  TicketRow,
} from "@/types";

/** Empty string → null, for optional form fields. */
function nullIfEmpty(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
}

function fmtDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
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

    async listContacts(): Promise<ContactRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listContacts();
      try {
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
           ORDER BY c.full_name`,
        );
        return rows.map((row) => ({
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          account: row.account,
        }));
      } catch {
        return mockRepositories.crm.listContacts();
      }
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

    async listTasks(): Promise<TaskRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listTasks();
      try {
        const { rows } = await pool.query<{
          id: string;
          title: string;
          status: string;
          due_at: Date | null;
          account: string | null;
        }>(
          `SELECT t.id, t.title, t.status, t.due_at, a.name AS account
           FROM task t
           LEFT JOIN account a ON a.id = t.account_id
           ORDER BY t.due_at NULLS LAST, t.title`,
        );
        return rows.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
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
          due_at: Date | null;
        }>(
          `SELECT id, account_id, title, detail, status, due_at
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
        `INSERT INTO task (account_id, title, detail, status, due_at)
         VALUES ($1, $2, $3, $4, $5::timestamptz)`,
        [
          nullIfEmpty(input.accountId),
          input.title,
          nullIfEmpty(input.detail),
          input.status,
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
             due_at = $5::timestamptz
         WHERE id = $6`,
        [
          nullIfEmpty(input.accountId),
          input.title,
          nullIfEmpty(input.detail),
          input.status,
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
        }));
      } catch {
        return mockRepositories.engagements.getQuestions(kind);
      }
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
      for (const a of answers) {
        await pool.query(
          `INSERT INTO engagement_answer
             (engagement_type, engagement_id, question_id, value_text, value_number,
              value_bool, value_json, value_date, answered_by_contact_id)
           VALUES ($1::engagement_kind, $2, $3, $4, $5::numeric, $6, $7::jsonb, $8::date, $9)
           ON CONFLICT (engagement_type, engagement_id, question_id) DO UPDATE SET
             value_text = excluded.value_text, value_number = excluded.value_number,
             value_bool = excluded.value_bool, value_json = excluded.value_json,
             value_date = excluded.value_date,
             answered_by_contact_id = excluded.answered_by_contact_id, answered_at = now()`,
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
          ],
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
};
