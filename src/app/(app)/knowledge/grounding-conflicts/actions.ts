"use server";

import { revalidatePath } from "next/cache";
import { requestIdentity } from "@/lib/auth/request-identity";
import { resolveConflict, type ConflictResolution } from "@/lib/data/grounding-conflict";
import type { GroundingTier } from "@/lib/grounding/authority";
import { agentService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import { resolveActingUser } from "@/lib/services/acting-user";

/** Result the cockpit shows after a resolve / dismiss + write-back attempt. */
export interface ResolveConflictResult {
  ok: boolean;
  message: string;
}

const VALID_TIERS: readonly GroundingTier[] = ["canon", "company_silver", "personal"];

function parseTier(raw: string): GroundingTier | null {
  return (VALID_TIERS as readonly string[]).includes(raw) ? (raw as GroundingTier) : null;
}

/**
 * Resolve (affirm a tier) or dismiss an OPEN `grounding_conflict`, then — on a RESOLVE — trigger the
 * cross-plane write-back (#1217, BE #365, ADR-0119).
 *
 * Two steps, in order:
 *   1. Record the owner's DECISION in the DB (`resolveConflict`). The DB RLS resolve-policy
 *      (`app_grounding_conflict_resolver(domain)`) is the authority boundary — only the domain
 *      owner / fallback role / admin can move the row, so we do NOT pre-gate on a coarse role
 *      capability here (the predicate is per-domain, not per-role). A non-resolver simply matches
 *      no row and gets a no-op (null) — reported as "not authorized".
 *   2. On a successful RESOLVE (not a dismiss), fire the backend write-back executor with ONLY the
 *      conflict id (ADR-0042 — the FE records the decision, the backend runs the cross-plane
 *      process and re-reads the resolved row itself). Best-effort: a write-back failure does not
 *      unwind the resolution (the decision stands, ledgered); the message tells the owner to retry.
 */
export async function resolveConflictAction(formData: FormData): Promise<ResolveConflictResult> {
  const id = String(formData.get("conflictId") ?? "").trim();
  if (!id) return { ok: false, message: "Missing the conflict to resolve." };

  const decisionRaw = String(formData.get("decision") ?? "").trim();
  if (decisionRaw !== "resolved" && decisionRaw !== "dismissed") {
    return { ok: false, message: "Pick resolve or dismiss." };
  }
  const decision = decisionRaw as ConflictResolution;

  const tierRaw = String(formData.get("resolutionTier") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  // A resolve MUST affirm which tier won — that tier is what the backend write-back corrects toward.
  let resolutionTier: GroundingTier | null = null;
  if (decision === "resolved") {
    resolutionTier = parseTier(tierRaw);
    if (!resolutionTier) {
      return { ok: false, message: "Affirm which tier is authoritative (canon, company silver, or personal)." };
    }
  }

  const identity = await requestIdentity();
  const updated = await resolveConflict(identity, id, decision, { resolutionTier, note });
  if (!updated) {
    // null = already resolved, not a resolver for this domain, unresolved identity, or mock mode.
    return {
      ok: false,
      message: "Couldn't resolve — it may already be resolved, or you aren't an owner for this domain.",
    };
  }

  if (decision === "dismissed") {
    revalidatePath("/knowledge/grounding-conflicts");
    return { ok: true, message: "Conflict dismissed." };
  }

  // Resolved → trigger the cross-plane write-back. Backend-owned (ADR-0042); pass only the id.
  const acting = await resolveActingUser();
  const writeback = await callServiceWithFallback(
    () =>
      agentService.resolveGroundingWriteback({
        conflictId: id,
        ...(acting.ok ? { actingUserId: acting.id } : {}),
      }),
    {
      label: "resolveGroundingWriteback",
      notConfigured:
        "Resolution recorded. The write-back backend isn't wired in this environment (AGENT_SERVICE_URL unset) — the correction is logged and will dispatch once it's live.",
      failed:
        "Resolution recorded, but triggering the write-back failed — re-resolving (a no-op) will retry it.",
    },
  );

  revalidatePath("/knowledge/grounding-conflicts");
  if (!writeback.ok) {
    // The resolution stands; surface the (non-fatal) write-back hiccup so the owner can retry.
    return { ok: true, message: writeback.message };
  }

  const ref = writeback.value.externalRef;
  const where = writeback.value.target === "canon" ? "canon (okf-sync issue)" : "company silver";
  const dispatched = writeback.value.dispatched
    ? `Write-back dispatched to ${where}${ref ? ` — ${ref}` : ""}.`
    : `Write-back already dispatched to ${where}${ref ? ` — ${ref}` : ""}.`;
  return { ok: true, message: `Resolved. ${dispatched}` };
}
