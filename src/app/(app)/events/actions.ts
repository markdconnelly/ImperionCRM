"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { intOr, str, strOr, strOrNull } from "@/lib/form-data";
import type { EventInput } from "@/lib/data/repositories";

/**
 * Event builder actions (ADR-0053 slice A, #109/#229). Events are first-class
 * objects campaigns promote; writes are campaign-team work, so the capability is
 * `sales:write` (admin | sales — the GUI twin is `canManageCampaigns`, ADR-0053 §8).
 * Field coercion lives in the shared form-data grammar (#189).
 */
function parse(formData: FormData): EventInput {
  const capacity = intOr(formData, "capacity", 0);
  return {
    kind: strOr(formData, "kind", "webinar"),
    name: str(formData, "name"),
    description: strOrNull(formData, "description"),
    status: strOr(formData, "status", "draft"),
    startsAt: strOrNull(formData, "startsAt"),
    endsAt: strOrNull(formData, "endsAt"),
    timezone: strOrNull(formData, "timezone"),
    capacity: capacity > 0 ? capacity : null,
    joinUrl: strOrNull(formData, "joinUrl"),
    location: strOrNull(formData, "location"),
    registrationHeadline: strOrNull(formData, "registrationHeadline"),
    registrationBlurb: strOrNull(formData, "registrationBlurb"),
  };
}

export async function createEventAction(formData: FormData) {
  await requireCapability("sales:write");
  const { events } = getRepositories();
  const id = await events.createEvent(parse(formData));
  revalidatePath("/events");
  redirect(`/events/${id}`);
}

export async function updateEventAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { events } = getRepositories();
  await events.updateEvent(id, parse(formData));
  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  redirect(`/events/${id}`);
}
