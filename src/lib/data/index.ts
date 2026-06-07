/**
 * Repository provider — the single place that chooses the data source.
 *
 * Server-only. Callers (server components, route handlers, the future agent
 * orchestrator) get repositories from here and never construct a data source
 * themselves, so swapping mock → Postgres (ADR-0003) is a one-line change.
 */
import "server-only";
import type { Repositories } from "@/lib/data/repositories";
import { mockRepositories } from "@/lib/data/mock/mock-repositories";

/**
 * Resolve the repositories for the current runtime.
 *
 * TODO (ADR-0003): when `process.env.DATABASE_URL` is set and the Postgres
 * implementation exists, return the Postgres-backed repositories instead. Until
 * then we always return mock so the UI renders without a database.
 */
export function getRepositories(): Repositories {
  return mockRepositories;
}
