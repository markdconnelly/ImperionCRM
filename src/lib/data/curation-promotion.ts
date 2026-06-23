/**
 * `curation_promotion` data layer — the HUMAN-REVIEW surface of the cross-wall curation
 * identity (#981, ADR-0105 §3c).
 *
 * The privileged curation PROMOTER (the autonomous boundary-crosser) runs in the BACKEND and
 * acts as its own `imperion-curation-promoter` DB role — it writes DRAFT proposals and appends
 * the `curation_event` ledger, never through this module. This module is the FRONT-END half:
 * the human who reviews the promotion queue and approves / rejects / applies a proposal. That
 * human approval is the "explicit, never silent" gate (#966 decision 5; engagement_answer
 * agent-draft pattern, ADR-0027): a personal→company promotion is only ever applied by a human.
 *
 * Every read/write goes through `withIdentity`, so the reviewer RLS policy (migration 0192,
 * `curation_promotion_reviewer`) gates the queue to privileged roles (`admin` / `finance`) AT
 * THE DATABASE — the storage layer is the floor. The reviewer also gets a defense-in-depth
 * application check (`isReviewer`) above the policy, mirroring the god-view pattern
 * (`listAllPersonalNotesAsAdmin`, ADR-0105 §3b): the human path is never accidental.
 *
 * Every approve/reject/apply is LEDGERED to `curation_event` inside the same transaction as the
 * status change, so a status flip without an audit row is impossible (§3c invariant 2). The
 * ledger carries provenance pointers only — never personal content (no PII in the ledger).
 *
 * Server-only; degrades to `[]` / `null` in mock mode (no pool), like the rest of the data
 * layer (ADR-0024).
 */
import "server-only";
import type { PoolClient } from "pg";
import type { IdentityContext } from "@/lib/db/identity";
import { withIdentity } from "@/lib/db/identity";

/** The role slugs that may review the promotion queue (mirrors the SQL reviewer policy, §3c). */
const REVIEWER_ROLES = ["admin", "finance"] as const;

/** curation_event actions a human review can produce (mirrors the SQL CHECK, migration 0192). */
export const CURATION_EVENT_APPLIED = "applied";
export const CURATION_EVENT_REJECTED = "rejected";

export type CurationPromotionStatus = "draft" | "approved" | "applied" | "rejected";

export interface CurationPromotion {
  id: string;
  sourceKind: string;
  sourceId: string;
  sourceOwnerUserId: string | null;
  proposedSubject: string;
  proposedPredicate: string;
  proposedObject: string;
  rationale: string | null;
  confidence: number | null;
  status: CurationPromotionStatus;
  proposedBy: string;
  proposedAt: string;
}

interface CurationPromotionRow {
  id: string;
  source_kind: string;
  source_id: string;
  source_owner_user_id: string | null;
  proposed_subject: string;
  proposed_predicate: string;
  proposed_object: string;
  rationale: string | null;
  confidence: number | null;
  status: CurationPromotionStatus;
  proposed_by: string;
  proposed_at: string;
}

function mapRow(r: CurationPromotionRow): CurationPromotion {
  return {
    id: r.id,
    sourceKind: r.source_kind,
    sourceId: r.source_id,
    sourceOwnerUserId: r.source_owner_user_id,
    proposedSubject: r.proposed_subject,
    proposedPredicate: r.proposed_predicate,
    proposedObject: r.proposed_object,
    rationale: r.rationale,
    confidence: r.confidence,
    status: r.status,
    proposedBy: r.proposed_by,
    proposedAt: r.proposed_at,
  };
}

/** Is the caller a privileged reviewer (carries `admin` or `finance`)? Mirrors the SQL policy. */
function isReviewer(identity: IdentityContext): boolean {
  return identity.groups.some((g) => (REVIEWER_ROLES as readonly string[]).includes(g));
}

/**
 * The promotion proposals awaiting human review (newest first). RLS scopes the queue to
 * reviewer roles; a non-reviewer gets `null` (the application-layer gate above the policy), so
 * the queue is never accidentally surfaced. Defaults to the `draft` (pending) status — the
 * proposals a human still has to act on.
 */
export async function listPendingPromotions(
  identity: IdentityContext,
  status: CurationPromotionStatus = "draft",
): Promise<CurationPromotion[] | null> {
  if (!isReviewer(identity)) return null;
  const rows = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<CurationPromotionRow>(
      `SELECT id, source_kind, source_id, source_owner_user_id,
              proposed_subject, proposed_predicate, proposed_object,
              rationale, confidence, status, proposed_by, proposed_at
         FROM curation_promotion
        WHERE status = $1
        ORDER BY proposed_at DESC`,
      [status],
    );
    return rows;
  });
  return (rows ?? []).map(mapRow);
}

/**
 * Approve a draft proposal (draft → approved) and ledger the decision. Reviewer-only. The
 * status change and the `curation_event` ledger row commit atomically — a decision without an
 * audit row is impossible (§3c invariant 2). Returns the updated proposal, or null in mock mode
 * / when the caller is not a reviewer / when the row was not in `draft` (RLS + the WHERE guard).
 */
export async function approvePromotion(
  identity: IdentityContext,
  promotionId: string,
): Promise<CurationPromotion | null> {
  return reviewPromotion(identity, promotionId, "approved", "draft");
}

/**
 * Reject a draft proposal (draft → rejected) and ledger it. Reviewer-only; same atomic
 * status+ledger guarantee as approve.
 */
export async function rejectPromotion(
  identity: IdentityContext,
  promotionId: string,
): Promise<CurationPromotion | null> {
  return reviewPromotion(identity, promotionId, "rejected", "draft");
}

/**
 * Apply an approved proposal (approved → applied) and ledger it. Reviewer-only. The COMPANY-SIDE
 * write the apply ultimately performs (turning the proposal into a real company row) is the
 * consumer's concern (a backend issue); this records that the human applied it and closes the
 * envelope. Same atomic status+ledger guarantee.
 */
export async function applyPromotion(
  identity: IdentityContext,
  promotionId: string,
): Promise<CurationPromotion | null> {
  return reviewPromotion(identity, promotionId, "applied", "approved");
}

/**
 * The shared human-review transition: flip `status` from `fromStatus` to `toStatus`, stamp the
 * reviewer + timestamp, and ledger the action to `curation_event` — all in ONE transaction.
 * Reviewer-only (the application gate above the RLS reviewer policy). The `WHERE status =
 * $fromStatus` guard makes the transition idempotent and ordering-safe (you cannot apply a
 * draft, nor re-approve an applied row). When the UPDATE matched no row, no ledger entry is
 * written (nothing happened) and null is returned.
 */
async function reviewPromotion(
  identity: IdentityContext,
  promotionId: string,
  toStatus: CurationPromotionStatus,
  fromStatus: CurationPromotionStatus,
): Promise<CurationPromotion | null> {
  if (!isReviewer(identity)) return null;
  const reviewerUserId = identity.userId ?? null;

  const row = await withIdentity(identity, async (client) => {
    const appliedAt = toStatus === "applied" ? "now()" : "applied_at";
    const { rows } = await client.query<CurationPromotionRow>(
      `UPDATE curation_promotion
          SET status = $1,
              reviewed_by_user_id = $2,
              reviewed_at = now(),
              applied_at = ${appliedAt}
        WHERE id = $3 AND status = $4
      RETURNING id, source_kind, source_id, source_owner_user_id,
                proposed_subject, proposed_predicate, proposed_object,
                rationale, confidence, status, proposed_by, proposed_at`,
      [toStatus, reviewerUserId, promotionId, fromStatus],
    );
    const updated = rows[0];
    if (!updated) return null; // no matching row in the expected state → nothing to ledger
    await ledgerReview(client, updated, toStatus);
    return updated;
  });
  return row ? mapRow(row) : null;
}

/**
 * Append one `curation_event` row for a human review decision (§3c invariant 2). `action` is
 * the cross-wall verb: `applied` (the proposal became a company write) or `rejected`. An
 * `approved` interim decision is recorded as the proposal's status; the ledgered cross-wall
 * actions are the terminal `applied` / `rejected`. The detail carries provenance pointers + the
 * decision only — never the proposed content (no PII in the ledger).
 */
async function ledgerReview(
  client: PoolClient,
  promotion: CurationPromotionRow,
  toStatus: CurationPromotionStatus,
): Promise<void> {
  // Only the terminal cross-wall outcomes are ledgered as curation_event actions.
  const action =
    toStatus === "applied"
      ? CURATION_EVENT_APPLIED
      : toStatus === "rejected"
        ? CURATION_EVENT_REJECTED
        : null;
  if (!action) return; // an 'approved' interim step is not a cross-wall action

  await client.query(
    `INSERT INTO curation_event
       (actor, action, promotion_id, source_kind, source_id, source_owner_user_id, detail)
     VALUES ($1, $2, $3, $4, $5, $6,
             jsonb_build_object('status', $7::text))`,
    [
      promotion.proposed_by,
      action,
      promotion.id,
      promotion.source_kind,
      promotion.source_id,
      promotion.source_owner_user_id,
      toStatus,
    ],
  );
}
