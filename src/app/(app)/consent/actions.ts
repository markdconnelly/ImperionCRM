"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";

/**
 * Append a consent event (ADR-0014). The ledger is append-only — opting out is a new
 * event, never a deletion. Current consent is derived from the latest event.
 */
export async function recordConsentAction(formData: FormData) {
  const contactId = String(formData.get("contactId") ?? "");
  const channel = String(formData.get("channel") ?? "");
  const state = String(formData.get("state") ?? "opt_in");
  const lawfulBasis = String(formData.get("lawfulBasis") ?? "consent");
  const source = String(formData.get("source") ?? "").trim() || null;
  await requireCapability("comms:write");
  if (!contactId || !channel) return;

  const { consent } = getRepositories();
  await consent.recordConsentEvent({ contactId, channel, state, lawfulBasis, source });
  revalidatePath(`/consent`);
  redirect(`/consent?contactId=${contactId}`);
}
