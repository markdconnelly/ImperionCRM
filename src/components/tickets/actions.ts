"use server";

import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import type { TicketRow } from "@/types";

/**
 * Ticket typeahead search (#852) for the ticket-link picker. Reads the locally-synced
 * silver `ticket` (no live Autotask call) via `engagements.listTickets`. Requires an
 * authenticated session; returns at most 20 rows, newest-opened first (the repo's
 * default order). Tickets are non-comp internal data already shown on the Tickets
 * board — this is a read, scoped only by the optional account.
 */
export async function searchTicketsAction(
  query: string,
  accountId?: string,
): Promise<TicketRow[]> {
  const session = await auth();
  if (!session?.user?.email) return [];

  const q = query.trim();
  // Avoid dumping the whole board on an empty query unless scoped to one account.
  if (!q && !accountId) return [];

  const { engagements } = getRepositories();
  const rows = await engagements.listTickets({
    query: q || undefined,
    accountId: accountId || undefined,
    openedWithinDays: 365,
  });
  return rows.slice(0, 20);
}
