"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";

const DEFAULT_SCOPES: Record<string, string[]> = {
  m365: ["Mail.Read", "Calendars.Read", "Chat.Read"],
  google: ["gmail.readonly", "calendar.readonly"],
  youtube: ["youtube.readonly"],
  linkedin: ["r_liteprofile", "r_organization_social"],
  facebook: ["public_profile", "pages_read_engagement"],
  plaud: ["recordings.read"],
};

/**
 * Connect an external account (ADR-0024). OAuth is stubbed in this phase — this
 * records the connection row; real token exchange + Key Vault storage land later.
 */
export async function connectAction(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  const scope = String(formData.get("scope") ?? "user");
  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  if (!provider) return;

  const session = await auth();
  const { connections } = getRepositories();
  await connections.connect({
    scope,
    ownerEmail: session?.user?.email ?? null, // resolved to the signed-in app_user
    provider,
    displayName: displayName ?? session?.user?.email ?? null,
    scopes: DEFAULT_SCOPES[provider] ?? [],
  });
  revalidatePath("/integrations");
}

export async function disconnectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { connections } = getRepositories();
  await connections.disconnect(id);
  revalidatePath("/integrations");
}
