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
import type { Repositories } from "@/lib/data/repositories";
import type { Account, Health, Kpi, PipelineColumn, PipelineStage } from "@/types";

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
          total: string;
          managed: string;
          prospects: string;
          inactive: string;
        }>(
          `SELECT count(*) AS total,
                  count(*) FILTER (WHERE lifecycle_stage='managed_active') AS managed,
                  count(*) FILTER (WHERE relationship='prospect')          AS prospects,
                  count(*) FILTER (WHERE NOT is_active)                    AS inactive
           FROM account`,
        );
        const r = rows[0];
        return [
          { label: "Accounts", value: r.total },
          { label: "Managed", value: r.managed },
          { label: "Prospects", value: r.prospects },
          { label: "Inactive", value: r.inactive },
        ];
      } catch {
        return mockRepositories.dashboard.getKpis();
      }
    },

    async getPipeline(): Promise<PipelineColumn[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.dashboard.getPipeline();
      try {
        const { rows } = await pool.query<{ lifecycle_stage: string; count: string }>(
          `SELECT lifecycle_stage, count(*) AS count FROM account GROUP BY lifecycle_stage`,
        );
        const counts = new Map<PipelineStage, number>(PIPELINE_ORDER.map((s) => [s, 0]));
        for (const row of rows) {
          const stage = toPipelineStage(row.lifecycle_stage);
          counts.set(stage, (counts.get(stage) ?? 0) + Number(row.count));
        }
        return PIPELINE_ORDER.map((stage) => ({
          stage,
          count: counts.get(stage) ?? 0,
          value: "—",
        }));
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
        }>(
          `SELECT a.id, a.name, a.lifecycle_stage, a.relationship, a.is_active,
                  a.health_score, u.display_name AS owner
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
          mrr: "—",
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

  agent: {
    // No agent runtime yet (ADR-0015 / ADR-0018 — hosted externally). Empty feed.
    async getConversation() {
      return [];
    },
  },
};
