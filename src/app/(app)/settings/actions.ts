"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { COMPANY_PROVIDERS } from "@/lib/integrations/company-providers";
import { GDAP_CONSENT_COOKIE } from "@/lib/integrations/gdap";
import { credentialsService } from "@/lib/services";
import { ServiceNotConfiguredError } from "@/lib/services/external-client";

// Default OAuth scopes for personal connects (mirrors the former /integrations).
const DEFAULT_SCOPES: Record<string, string[]> = {
  m365: ["Mail.Read", "Calendars.Read", "Chat.Read"],
  google: ["gmail.readonly", "calendar.readonly"],
  youtube: ["youtube.readonly"],
  linkedin: ["r_liteprofile", "r_organization_social"],
  facebook: ["public_profile", "pages_read_engagement"],
  plaud: ["recordings.read"],
};

/**
 * Connect a personal external account (ADR-0024). OAuth is stubbed this phase —
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
    ownerEmail: session?.user?.email ?? null,
    provider,
    displayName: displayName ?? session?.user?.email ?? null,
    scopes: DEFAULT_SCOPES[provider] ?? [],
  });
  revalidatePath("/settings");
}

export async function disconnectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { connections } = getRepositories();
  await connections.disconnect(id);
  revalidatePath("/settings");
}

/**
 * Save (or rotate) a company credential (ADR-0036). The entered fields are handed
 * to the backend, which writes the secret to Key Vault and returns a reference —
 * the secret never touches this DB (CLAUDE.md §5). Until that backend endpoint is
 * configured the call throws ServiceNotConfiguredError; we then record the row as
 * `pending` with the intended reference so the UI reflects intent and the credential
 * lights up once the backend ships.
 */
export async function saveCredentialAction(formData: FormData) {
  const providerKey = String(formData.get("provider") ?? "");
  const provider = COMPANY_PROVIDERS.find((p) => p.key === providerKey);
  if (!provider || provider.kind !== "credential") return;

  const fields: Record<string, string> = {};
  for (const f of provider.fields ?? []) {
    const v = String(formData.get(f.name) ?? "").trim();
    if (v) fields[f.name] = v;
  }

  let keyvaultSecretRef = `kv://imperion/conn/${provider.key}`;
  let status = "pending";
  try {
    const res = await credentialsService.store({ provider: provider.key, fields });
    keyvaultSecretRef = res.keyvaultSecretRef;
    status = "active";
  } catch (err) {
    // Backend not wired yet → keep the placeholder ref + pending. Any other failure
    // is recorded as an error so the operator sees it on the card.
    if (!(err instanceof ServiceNotConfiguredError)) status = "error";
  }

  const { connections } = getRepositories();
  await connections.saveCompanyCredential({
    provider: provider.key,
    displayName: `Imperion ${provider.label}`,
    scopes: provider.scopes,
    keyvaultSecretRef,
    status,
  });
  revalidatePath("/settings");
}

/**
 * Begin Microsoft GDAP admin consent for Imperion (ADR-0036). The backend returns
 * the admin-consent URL to visit; we record a pending row and redirect there. Until
 * the backend is wired we record the pending intent without redirecting.
 *
 * Before redirecting we set a short-lived, httpOnly, SameSite=Lax cookie holding a
 * nonce. Microsoft redirects back to `/api/gdap/callback` as a top-level GET, which
 * Lax cookies accompany; the callback requires this cookie (plus an authenticated
 * session) before it will flip the row to `active`. Once the backend finalizes the
 * `state` it embeds in the consent URL, the callback should additionally match it.
 */
export async function grantGdapAction(formData: FormData) {
  const providerKey = String(formData.get("provider") ?? "");
  const provider = COMPANY_PROVIDERS.find((p) => p.key === providerKey);
  if (!provider || provider.kind !== "consent") return;

  let consentUrl: string | null = null;
  let consentState: string | null = null;
  let status = "pending";
  try {
    const res = await credentialsService.beginGdapConsent();
    consentUrl = res.consentUrl;
    consentState = res.state;
  } catch (err) {
    if (!(err instanceof ServiceNotConfiguredError)) status = "error";
  }

  const { connections } = getRepositories();
  await connections.saveCompanyCredential({
    provider: provider.key,
    displayName: `Imperion ${provider.label}`,
    scopes: provider.scopes,
    keyvaultSecretRef: `kv://imperion/conn/${provider.key}`,
    status,
  });
  revalidatePath("/settings");

  // Only arm the callback when we actually have somewhere to send the admin. Store the
  // backend's `state` nonce as the cookie value so the callback can match it (CSRF guard).
  if (consentUrl) {
    (await cookies()).set(GDAP_CONSENT_COOKIE, consentState ?? randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 15, // 15 minutes to complete consent
    });
  }

  // redirect() throws — keep it last, outside the try/catch.
  if (consentUrl) redirect(consentUrl);
}
