/**
 * Curated report sources — the ONLY data the report runner ever sees (ADR-0075 §5,
 * #411). Each reportable object in the semantic registry maps to ONE existing curated
 * repository read; this module projects that read's rows into a flat `ReportRow` keyed
 * by the registry's field keys. There is no new SQL and no arbitrary table access: a
 * report can only ever scan a read the BI hub already runs (ADR-0075 §B/§5).
 *
 * Money fields the curated read formats as display strings (`Account.mrr`,
 * `CampaignRow.budget/spend` are e.g. "$1,200" / "—") are parsed back to numbers here
 * so the runner can sum/avg them; the RBAC strip already happened upstream
 * (`validateReportSelection`), so a money column only reaches a viewer who may see it.
 *
 * Server-only: it resolves repositories. The pure shaping (projection/aggregation)
 * lives in `report-runner.ts` so it stays unit-testable without a DB.
 */
import "server-only";
import type { Repositories } from "@/lib/data/repositories";
import type { ReportRow } from "@/lib/reporting/report-runner";

/** Parse a formatted money string ("$1,200" / "—" / "") to a number, or null. */
function parseMoney(v: string | null | undefined): number | null {
  if (v == null) return null;
  const cleaned = v.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

/**
 * Load the flat row set for a reportable object, keyed by registry field keys. Unknown
 * object → `[]`. Each branch reuses the curated read the field mapping was modelled on
 * (see docs/reporting/report-builder.md), so the field keys here MUST match
 * `semantic-model.ts`.
 */
export async function loadReportRows(
  objectKey: string,
  repos: Repositories,
): Promise<ReportRow[]> {
  switch (objectKey) {
    case "account": {
      const rows = await repos.crm.listAccounts();
      return rows.map((a) => ({
        name: a.name,
        stage: a.stage,
        owner: a.owner,
        health: a.health,
        mrr: parseMoney(a.mrr),
      }));
    }
    case "contact": {
      const rows = await repos.crm.listContacts();
      return rows.map((c) => ({
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        account: c.account,
      }));
    }
    case "opportunity": {
      const rows = await repos.crm.listOpportunityForecast();
      return rows.map((o) => ({
        name: o.name,
        account: o.account,
        stage: o.stage,
        forecastCategory: o.forecastCategory,
        expectedCloseDate: o.expectedCloseDate,
        winProbability: o.winProbability,
        dealValue: o.dealValue,
        weighted: o.weighted,
      }));
    }
    case "ticket": {
      const rows = await repos.engagements.listTickets();
      return rows.map((t) => ({
        number: t.number,
        title: t.title,
        account: t.account,
        status: t.status,
        priority: t.priority,
        opened: t.opened,
      }));
    }
    case "campaign": {
      const rows = await repos.campaigns.listCampaigns();
      return rows.map((c) => ({
        name: c.name,
        platform: c.platform,
        status: c.status,
        leads: c.leads,
        budget: parseMoney(c.budget),
        spend: parseMoney(c.spend),
      }));
    }
    default:
      return [];
  }
}
