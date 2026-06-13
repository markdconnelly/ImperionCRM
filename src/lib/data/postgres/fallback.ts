/**
 * Mock-fallback guard for the Postgres repositories (#193).
 *
 * The Postgres repositories historically returned mock data from every error path, so
 * a transient DB issue degraded to demo data instead of breaking the page. That is the
 * right behavior ONLY when no database is configured (local dev / demo): with a real
 * database, silently substituting demo KPIs/revenue/security data misleads users into
 * trusting numbers that aren't real, masks production incidents, and lets WRITE methods
 * report success without persisting anything.
 *
 * This module is the one seam between the two behaviors. `postgres-repositories.ts`
 * imports its `mockRepositories` from HERE (same shape, drop-in): every method call is
 * intercepted, and
 *  - database NOT configured → the real mock runs (unchanged dev/demo behavior);
 *  - database configured (the call means a real query just failed, or the pool could
 *    not be built) → log loudly and throw `DataUnavailableError` naming the failed
 *    method. Server components surface it through the route error boundary
 *    (`src/app/(app)/error.tsx`) instead of rendering fake data.
 *
 * Known limit: the original query error is swallowed by the existing bare `catch {}`
 * sites — what reaches the log here is which repository method failed, not why. Pool
 * (`pg`) errors are visible in the platform logs.
 */
import { mockRepositories as realMockRepositories } from "@/lib/data/mock/mock-repositories";
import { isDbConfigured } from "@/lib/db/client";
import type { Repositories } from "@/lib/data/repositories";

/**
 * Postgres SQLSTATE codes that mean "the schema isn't migrated yet", NOT "the database is
 * down". A merged read of a new optional bronze table can outpace its prod migration
 * (happened with 0078 SharePoint and 0079 directory groups, #301); the query then fails
 * with `undefined_table`/`undefined_column`. That is deterministic schema lag, not an
 * outage — so OPTIONAL enrichment reads degrade to empty on these codes (a blank section)
 * rather than blanking the whole page through the fail-closed seam below. Connection/
 * timeout errors carry different codes and still fail closed.
 */
const SCHEMA_LAG_CODES = new Set([
  "42P01", // undefined_table (or view)
  "42703", // undefined_column
]);

/** True when an error is a not-yet-migrated table/column, not a live-database outage (#301). */
export function isSchemaLagError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    SCHEMA_LAG_CODES.has(String((err as { code?: unknown }).code))
  );
}

/** A repository read/write failed against a CONFIGURED database — never mock-masked. */
export class DataUnavailableError extends Error {
  constructor(public readonly method: string) {
    super(
      `Live data is unavailable: ${method} failed against the configured database. ` +
        "Refusing to substitute demo data.",
    );
    this.name = "DataUnavailableError";
  }
}

function guardGroup<T extends object>(groupName: string, group: T): T {
  return new Proxy(group, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        if (isDbConfigured()) {
          const method = `${groupName}.${String(prop)}`;
          console.error(
            `[data] ${method} fell back with a database configured — refusing mock data (#193)`,
          );
          throw new DataUnavailableError(method);
        }
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
}

/**
 * Drop-in replacement for the mock repositories that fails closed when a database is
 * configured. Import target for `postgres-repositories.ts` ONLY — everything else that
 * wants mocks (the provider's unconfigured branch) keeps using the real module.
 */
export const mockRepositories: Repositories = new Proxy(realMockRepositories, {
  get(target, prop, receiver) {
    const group = Reflect.get(target, prop, receiver);
    if (group === null || typeof group !== "object") return group;
    return guardGroup(String(prop), group as object);
  },
}) as Repositories;
