/**
 * Read repository for the unified, client-scoped communications history
 * (`client_communication` silver, ADR-0126 / #1369). Read-only: the GUI renders a
 * per-account unified comms history; every WRITE (the filtered bronze→silver merge)
 * happens in the ingesting plane (LP/Pipeline, LP ADR-0026) — never here (ADR-0042 §1).
 *
 * Server-only. Kept as its own module (not folded into the 16k-line
 * `postgres-repositories.ts`) to keep this foundational slice an isolated micro-PR and
 * off a shared merge-conflict hot file (system CLAUDE.md §10.4).
 *
 * Fallback posture: `client_communication` is brand-new and EMPTY in prod until the
 * migration is applied and the sibling merge hydrates it (deploy-dormant). So with no DB
 * configured, or if the table/relation isn't there yet, this returns `[]` (an empty
 * history) rather than throwing — an unhydrated history is "no comms yet", not an outage.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import { fmtDateTime } from "@/lib/data/postgres/date-format";
import type { ClientCommunicationRow } from "@/types";

interface ClientCommunicationDbRow {
  id: string;
  channel: string;
  direction: string;
  subject: string | null;
  snippet: string | null;
  client_participants: string[] | null;
  imperion_participants: string[] | null;
  contact_id: string | null;
  contact: string | null;
  account_id: string;
  account: string | null;
  occurred_at: Date | string | null;
}

function mapRow(row: ClientCommunicationDbRow): ClientCommunicationRow {
  return {
    id: row.id,
    channel: row.channel,
    direction: row.direction,
    subject: row.subject,
    snippet: row.snippet,
    clientParticipants: row.client_participants ?? [],
    imperionParticipants: row.imperion_participants ?? [],
    contactId: row.contact_id,
    contact: row.contact,
    accountId: row.account_id,
    account: row.account,
    occurredAt: fmtDateTime(row.occurred_at),
  };
}

const SELECT = `
  SELECT cc.id, cc.channel, cc.direction, cc.subject, cc.snippet,
         cc.client_participants, cc.imperion_participants,
         cc.contact_id, ct.full_name AS contact,
         cc.account_id, a.name AS account,
         cc.occurred_at
    FROM client_communication cc
    LEFT JOIN account a  ON a.id  = cc.account_id
    LEFT JOIN contact ct ON ct.id = cc.contact_id`;

/** The unified client-communications history for one account, newest first. */
export async function listClientCommunicationsForAccount(
  accountId: string,
  limit = 100,
): Promise<ClientCommunicationRow[]> {
  const pool = getPool();
  if (!pool) return [];
  try {
    const { rows } = await pool.query<ClientCommunicationDbRow>(
      `${SELECT}
        WHERE cc.account_id = $1
        ORDER BY cc.occurred_at DESC NULLS LAST
        LIMIT $2`,
      [accountId, Math.max(1, Math.min(limit, 500))],
    );
    return rows.map(mapRow);
  } catch {
    // New/empty entity (relation may not exist until the migration applies) → empty history.
    return [];
  }
}

/** The most recent client communications across all accounts, newest first (admin/overview). */
export async function listRecentClientCommunications(
  limit = 100,
): Promise<ClientCommunicationRow[]> {
  const pool = getPool();
  if (!pool) return [];
  try {
    const { rows } = await pool.query<ClientCommunicationDbRow>(
      `${SELECT}
        ORDER BY cc.occurred_at DESC NULLS LAST
        LIMIT $1`,
      [Math.max(1, Math.min(limit, 500))],
    );
    return rows.map(mapRow);
  } catch {
    return [];
  }
}
