"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { asCiType } from "@/lib/cmdb/ci";
import { asCriticality } from "@/lib/cmdb/criticality";
import type { CiType } from "@/types";

/**
 * CMDB relationship-layer server actions (#647, epic #372, ADR-0078). Every write is
 * gated by `cmdb:write` (admin-only, ADR-0045) re-asserted server-side via
 * `requireCapability` — defense in depth: the GUI also hides the controls (the CMDB
 * surface is admin∨support read, admin-only write), but the server never trusts the
 * client. App-native overlay only — there is NO IT Glue write path here.
 *
 * MANUAL edges only. The DERIVED edges are recomputed by `deriveCiRelationships` (the
 * same seed the migration runs); manual edges survive every re-derivation.
 */

/** The CI-detail route to revalidate after an edge change (`/cmdb/<type>/<id>`). */
function revalidateCi(ciType: CiType, ciId: string): void {
  revalidatePath(`/cmdb/${ciType}/${ciId}`);
}

function readCiType(formData: FormData, field: string): CiType {
  const t = asCiType(String(formData.get(field) ?? ""));
  if (!t) throw new Error(`Invalid CI type for ${field}.`);
  return t;
}

export async function createCiRelationshipAction(formData: FormData): Promise<void> {
  await requireCapability("cmdb:write");
  const fromCiType = readCiType(formData, "fromCiType");
  const fromCiId = String(formData.get("fromCiId") ?? "").trim();
  const toCiType = readCiType(formData, "toCiType");
  const toCiId = String(formData.get("toCiId") ?? "").trim();
  const relationType = String(formData.get("relationType") ?? "").trim();
  const noteRaw = String(formData.get("note") ?? "").trim();
  if (!fromCiId || !toCiId) throw new Error("Both endpoints are required.");
  if (!relationType) throw new Error("A relation type is required.");

  const { crm } = getRepositories();
  await crm.createCiRelationship({
    fromCiType,
    fromCiId,
    toCiType,
    toCiId,
    relationType,
    note: noteRaw.length > 0 ? noteRaw : null,
  });
  // Revalidate BOTH endpoints' detail pages — the new edge shows on each.
  revalidateCi(fromCiType, fromCiId);
  revalidateCi(toCiType, toCiId);
}

export async function updateCiRelationshipAction(formData: FormData): Promise<void> {
  await requireCapability("cmdb:write");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing relationship id.");
  const relationType = String(formData.get("relationType") ?? "").trim();
  if (!relationType) throw new Error("A relation type is required.");
  const noteRaw = String(formData.get("note") ?? "").trim();

  const { crm } = getRepositories();
  await crm.updateCiRelationship(id, {
    relationType,
    note: noteRaw.length > 0 ? noteRaw : null,
  });
  // The originating CI's detail page (the panel that posted this) needs a refresh.
  const ciType = asCiType(String(formData.get("ciType") ?? ""));
  const ciId = String(formData.get("ciId") ?? "").trim();
  if (ciType && ciId) revalidateCi(ciType, ciId);
}

export async function deleteCiRelationshipAction(formData: FormData): Promise<void> {
  await requireCapability("cmdb:write");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const { crm } = getRepositories();
  await crm.deleteCiRelationship(id);
  const ciType = asCiType(String(formData.get("ciType") ?? ""));
  const ciId = String(formData.get("ciId") ?? "").trim();
  if (ciType && ciId) revalidateCi(ciType, ciId);
}

/**
 * Recompute the DERIVED edges from current silver FKs (on demand from the panel). Manual
 * edges are untouched. Re-runnable; the authoritative scheduled recompute can also be a
 * backend/pipeline job (ADR-0042) — this is the GUI convenience trigger.
 */
export async function deriveCiRelationshipsAction(formData: FormData): Promise<void> {
  await requireCapability("cmdb:write");
  const { crm } = getRepositories();
  await crm.deriveCiRelationships();
  const ciType = asCiType(String(formData.get("ciType") ?? ""));
  const ciId = String(formData.get("ciId") ?? "").trim();
  if (ciType && ciId) revalidateCi(ciType, ciId);
}

/**
 * Set or clear the admin CRITICALITY override on a CI (#648, `cmdb_ci_overlay`,
 * migration 0132). `cmdb:write`, re-asserted server-side. An empty/`"inherit"` value
 * clears the override (effective criticality falls back to the derived default). The
 * override SURVIVES re-derivation — only the derived default is ever recomputed. Both
 * the CI detail and the register show the badge, so both are revalidated.
 */
export async function setCiCriticalityOverrideAction(formData: FormData): Promise<void> {
  await requireCapability("cmdb:write");
  const ciType = readCiType(formData, "ciType");
  const ciId = String(formData.get("ciId") ?? "").trim();
  if (!ciId) throw new Error("Missing CI id.");
  // Empty string / "inherit" → clear the override; otherwise narrow to a known level.
  const raw = String(formData.get("override") ?? "").trim();
  const override = raw === "" || raw === "inherit" ? null : asCriticality(raw);
  if (raw !== "" && raw !== "inherit" && override === null) {
    throw new Error("Invalid criticality level.");
  }

  const { crm } = getRepositories();
  await crm.setCiCriticalityOverride({ ciType, ciId, override });
  revalidateCi(ciType, ciId);
  revalidatePath("/cmdb");
}

/**
 * Recompute the DERIVED-DEFAULT criticality for every CI from current silver (on demand).
 * Admin overrides are untouched. `cmdb:write`. Re-runnable; the authoritative scheduled
 * recompute can also be a backend/pipeline job (ADR-0042) — this is the GUI trigger.
 */
export async function deriveCiCriticalityAction(formData: FormData): Promise<void> {
  await requireCapability("cmdb:write");
  const { crm } = getRepositories();
  await crm.deriveCiCriticality();
  const ciType = asCiType(String(formData.get("ciType") ?? ""));
  const ciId = String(formData.get("ciId") ?? "").trim();
  if (ciType && ciId) revalidateCi(ciType, ciId);
  revalidatePath("/cmdb");
}
