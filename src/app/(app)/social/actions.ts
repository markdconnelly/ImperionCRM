"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth/guard";
import { str, strList, strOrNull } from "@/lib/form-data";
import { resolveActingUser } from "@/lib/services/acting-user";
import { socialService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";

/**
 * Save a compose-once social post as a DRAFT (ADR-0124 #3, slice B #1340).
 *
 * The web role is SELECT-only on `social_post`/`social_post_channel` (migration 0210
 * grant), so persisting is a backend *process* (ADR-0042 §1) — unlike the campaign_send
 * Builder (web-direct-write). This action validates + forwards to the backend save
 * endpoint. Until that endpoint is wired (backend follow-up), the call degrades honestly:
 * a `not_configured` outcome means NOTHING was persisted (`?stub=1`), never a faked draft.
 * Nothing publishes here — publish/schedule are cockpit-gated Social Actions (ADR-0058).
 *
 * Gated `sales:write` — the marketing-capable roles (admin | sales), same twin as the
 * campaign Builder (ADR-0053 §8 / ADR-0045).
 */
export async function saveSocialPostAction(formData: FormData) {
  await requireCapability("sales:write");

  const body = str(formData, "body").trim();
  const channels = strList(formData, "channel");
  if (!body || channels.length === 0) {
    // The form requires both; bounce back without a backend round-trip.
    redirect("/social/publishing/compose");
  }

  const scheduleMode = str(formData, "scheduleMode"); // draft|absolute
  const scheduledAt = scheduleMode === "absolute" ? strOrNull(formData, "scheduledAt") : null;
  const campaignId = strOrNull(formData, "campaignId");

  const acting = await resolveActingUser();
  if (!acting.ok) {
    // No app_user to attribute the authored post to — degrade, do not pretend to save.
    redirect("/social/publishing/compose?stub=1");
  }

  const outcome = await callServiceWithFallback(
    () =>
      socialService.saveDraft({
        content: { body },
        channels,
        campaignId,
        scheduledAt,
        actingUserId: acting.id,
      }),
    {
      label: "saveSocialPostAction",
      notConfigured: "", // not rendered — handled via ?stub=1
      failed: "", // not rendered — handled via ?stub=1
    },
  );

  if (outcome.ok) {
    revalidatePath("/social/publishing");
    redirect("/social/publishing/compose?saved=1");
  }
  // Backend unconfigured or a real failure — honest "not persisted" notice (stubbed-not-broken).
  redirect("/social/publishing/compose?stub=1");
}
