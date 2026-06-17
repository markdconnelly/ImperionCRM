"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { connectionsService } from "@/lib/services";
import { isBackendNotConfigured } from "@/lib/services/call-guard";
import {
  isConnectableProvider,
  isPersonalOAuthProvider,
  profileConnectionsPath,
  type ConnectResult,
} from "@/lib/integrations/personal-oauth";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";

// Personal (per-user) OAuth connect action (ADR-0024 + backend ADR-0038).
// This moved off the admin-only Settings page onto the all-authenticated-user
// Profile page (#796): a personal connection is the employee's own account, so it
// belongs on their profile, and the flow now round-trips through `/profile`. The
// capability stays `settings:write` (the connection enums and Key Vault custody are
// unchanged); company credentials remain under Settings. The generic
// `disconnectAction` / `setPollIntervalAction` stay in settings/actions.ts — they
// are shared by the company-credential cards too — and revalidate `/profile` as well.

// Default OAuth scopes recorded on the STUB path only (backend unavailable / Plaud).
// On a live connect the backend writes the real granted scopes (backend ADR-0038).
const DEFAULT_SCOPES: Record<string, string[]> = {
  m365: ["Mail.Read", "Calendars.Read", "Chat.Read"],
  google: ["gmail.readonly", "calendar.readonly"],
  youtube: ["youtube.readonly"],
  linkedin: ["openid", "profile", "email"], // OIDC scopes — r_liteprofile is deprecated (backend ADR-0038)
  facebook: ["public_profile", "pages_read_engagement"],
  plaud: ["recordings.read"],
};

/**
 * Connect a personal external account (ADR-0024 + backend ADR-0038). For the live
 * OAuth providers this starts the backend's authorization-code flow (the backend
 * parks a one-time CSRF state in Key Vault and returns the provider's consent URL)
 * and redirects the browser there; the provider then redirects back to
 * `/api/connections/{provider}/callback`, which finishes the exchange server-side
 * and lands on Profile with a notice. When the backend (or the provider's app
 * registration) isn't configured yet — or for Plaud, which is key-based — this
 * degrades to the previous stub behavior: record the row locally and say so.
 */
export async function connectAction(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  const scope = String(formData.get("scope") ?? "user");
  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  await requireCapability("settings:write");

  // This action only connects PERSONAL accounts: the Profile buttons post
  // scope="user" and a known provider. Anything else is a tampered/stale form —
  // reject before any DB write so raw values never reach the connection enums (#194).
  if (scope !== "user" || !isConnectableProvider(provider)) {
    redirect(profileConnectionsPath("error", provider || undefined));
  }

  // Fail closed when the signed-in employee can't be resolved to an app_user: a
  // user-scope connection row must have an owner, never owner_user_id = NULL (#194).
  const session = await auth();
  const email = session?.user?.email ?? null;
  const userId = email ? await resolveAppUserIdByEmail(email) : null;
  if (!email || !userId) {
    redirect(profileConnectionsPath("error", provider));
  }

  // Live flow — only for the OAuth providers (Plaud is key-based, stub by design).
  let authorizationUrl: string | null = null;
  let failure: ConnectResult | null = null;
  if (isPersonalOAuthProvider(provider)) {
    try {
      const res = await connectionsService.startOAuth(provider, {
        userId,
        displayName: displayName ?? email,
      });
      authorizationUrl = res.authorizationUrl;
    } catch (err) {
      if (!isBackendNotConfigured(err)) {
        console.error(`connectAction(${provider}) backend start failed:`, err);
        failure = "error";
      }
      // 501 / unset INTEGRATION_SERVICE_URL → fall through to the stub below.
    }
  }

  // redirect() throws — keep it outside any try/catch. The backend callback writes
  // the connection row; this action records nothing for the live path.
  if (authorizationUrl) redirect(authorizationUrl);
  if (failure) redirect(profileConnectionsPath(failure, provider));

  // Stub path: record the connection row locally so the card renders, and surface a
  // notice that the flow isn't live yet. Validation above guarantees scope="user", an
  // allowlisted provider, and a resolvable owner — no orphaned rows (#194).
  const { connections } = getRepositories();
  await connections.connect({
    scope,
    ownerEmail: email,
    provider,
    displayName: displayName ?? email,
    scopes: DEFAULT_SCOPES[provider] ?? [],
  });
  revalidatePath("/profile");
  redirect(profileConnectionsPath("stubbed", provider));
}
