/**
 * Repository provider — the single place that chooses the data source (ADR-0007).
 *
 * Server-only. Callers (server components, route handlers, the future agent
 * orchestrator) get repositories from here and never construct a data source
 * themselves. When a database is configured (Azure managed identity or
 * DATABASE_URL) the Postgres-backed repositories are used; otherwise mock data so
 * the UI still renders. With a configured database, a failing query throws
 * `DataUnavailableError` (#193, postgres/fallback.ts) and surfaces through the route
 * error boundary — live pages never silently show demo data during an outage.
 */
import "server-only";
import type { Repositories } from "@/lib/data/repositories";
import { mockRepositories } from "@/lib/data/mock/mock-repositories";
import { postgresRepositories } from "@/lib/data/postgres/postgres-repositories";
import { isDbConfigured } from "@/lib/db/client";

/** Resolve the repositories for the current runtime. */
export function getRepositories(): Repositories {
  return isDbConfigured() ? postgresRepositories : mockRepositories;
}
