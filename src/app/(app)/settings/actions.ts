"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { COMPANY_PROVIDERS } from "@/lib/integrations/company-providers";
import { GDAP_CONSENT_COOKIE } from "@/lib/integrations/gdap";
import { connectionsService, credentialsService, pipelineService } from "@/lib/services";
import { classifyServiceError, isBackendNotConfigured } from "@/lib/services/call-guard";
import { ServiceCallError } from "@/lib/services/external-client";
import type { QboConnectResult } from "@/lib/integrations/qbo-connect";
import { REFRESH_SOURCES } from "@/lib/integrations/pipeline-refresh";
import { isPersonalOAuthProvider } from "@/lib/integrations/personal-oauth";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";

// Personal connect (`connectAction`) moved to `profile/actions.ts` (#796) — personal
// connections now live on the all-auth Profile page. The generic disconnect / poll
// actions below stay here: they are shared by the company-credential cards (Settings)
// and the personal connection cards (Profile), so they revalidate BOTH paths.

/**
 * Disconnect a connection. For live per-user OAuth providers the backend is called
 * FIRST — it deletes the Key Vault token secret (real revocation of token custody)
 * and marks the row `revoked` (backend ADR-0038) — then the local row is removed as
 * before. If the backend errors unexpectedly the row is kept so the operator can
 * see it and retry; an unconfigured backend (501) just falls back to the local delete.
 */
export async function disconnectAction(formData: FormData) {
  await requireCapability("settings:write");
  const id = String(formData.get("id") ?? "");
  const provider = String(formData.get("provider") ?? "");
  const scope = String(formData.get("scope") ?? "");
  if (!id) return;

  if (scope === "user" && isPersonalOAuthProvider(provider)) {
    const session = await auth();
    const email = session?.user?.email ?? "";
    const userId = email ? await resolveAppUserIdByEmail(email) : null;
    if (userId) {
      try {
        await connectionsService.disconnectOAuth(provider, { userId });
      } catch (err) {
        if (!isBackendNotConfigured(err)) {
          // Token custody was NOT revoked — keep the row visible rather than
          // deleting it and stranding a live token in Key Vault.
          console.error(`disconnectAction(${provider}) backend revoke failed:`, err);
          revalidatePath("/settings");
          revalidatePath("/profile");
          return;
        }
      }
    }
  }

  const { connections } = getRepositories();
  await connections.disconnect(id);
  revalidatePath("/settings");
  revalidatePath("/profile");
}

/**
 * Set how often the ingestion pipeline polls a connection (ADR-0038). Stored as
 * minutes on the connection row; 0 = manual/paused. The pipeline repo consumes the
 * value — this only persists the operator's choice.
 */
export async function setPollIntervalAction(formData: FormData) {
  await requireCapability("settings:write");
  const id = String(formData.get("id") ?? "");
  const minutes = Number(formData.get("pollIntervalMinutes"));
  if (!id || !Number.isFinite(minutes) || minutes < 0) return;
  const { connections } = getRepositories();
  await connections.setPollInterval(id, Math.floor(minutes));
  revalidatePath("/settings");
  revalidatePath("/profile");
}

/**
 * Trigger a targeted live sync of one source via the cloud pipeline's on-demand
 * endpoint (pipeline ADR-0011). The explicit click bypasses the poll cadence; the
 * write path is idempotent, so this can never duplicate a scheduled on-prem load.
 * Degrades silently when PIPELINE_SERVICE_URL is unset (button does nothing useful
 * yet) and records an error status on any other failure so the card surfaces it.
 */
export async function refreshNowAction(formData: FormData) {
  await requireCapability("settings:write");
  const providerKey = String(formData.get("provider") ?? "");
  const source = REFRESH_SOURCES[providerKey];
  if (!source) return;

  try {
    await pipelineService.refresh({ source });
  } catch (err) {
    // Unconfigured pipeline (#190 taxonomy) → quiet no-op; the pipeline records run
    // health on the connection row itself (sync_cursor/status), so other failures
    // surface there.
    if (!isBackendNotConfigured(err)) {
      console.error(`refreshNowAction(${source}) failed:`, err);
    }
  }
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
  await requireCapability("settings:write");
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
    // Backend not wired yet (#190 taxonomy) → keep the placeholder ref + pending.
    // Any other failure is recorded as an error so the operator sees it on the card.
    if (!isBackendNotConfigured(err)) status = "error";
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
  await requireCapability("settings:write");
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
    if (!isBackendNotConfigured(err)) status = "error";
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

/**
 * Begin the company-wide QuickBooks Online connect flow (#117/#528). Unlike GDAP this
 * needs no cookie: the backend parks a one-time CSRF `state` in Key Vault and embeds it
 * in the Intuit consent URL, then validates it on the callback (same posture as the
 * per-user OAuth flow). We record a pending `qbo` company row, then redirect the admin to
 * Intuit. When the backend isn't configured yet the row is recorded and we stay put
 * (graceful degradation — the card shows the pending/not-configured state).
 */
export async function connectQuickBooksAction(formData: FormData) {
  await requireCapability("settings:write");
  const providerKey = String(formData.get("provider") ?? "");
  const provider = COMPANY_PROVIDERS.find((p) => p.key === providerKey);
  if (!provider || provider.key !== "qbo") return;

  let authorizationUrl: string | null = null;
  let status = "pending";
  let result: QboConnectResult = "ok";
  let httpStatus: number | undefined;
  try {
    const res = await connectionsService.startQboConnect();
    authorizationUrl = res.authorizationUrl ?? null;
    if (!authorizationUrl) {
      // 200 but no consent URL — the backend started nothing usable (#530).
      status = "error";
      result = "start_no_url";
    }
  } catch (err) {
    const kind = classifyServiceError(err);
    if (kind === "not_configured") {
      status = "pending";
      result = "start_not_configured";
    } else {
      status = "error";
      result = kind === "rejected" ? "start_rejected" : "start_unreachable";
      if (err instanceof ServiceCallError) httpStatus = err.status;
      // The connection row's bare "error" isn't enough to triage — log the real
      // cause server-side (App Service console logs). Never contains token material.
      console.error("connectQuickBooksAction: QBO connect start failed:", err);
    }
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

  // redirect() throws — keep redirects last, outside the try/catch.
  if (authorizationUrl) redirect(authorizationUrl);
  const params = new URLSearchParams({ tab: "credentials", qbo: result });
  if (httpStatus) params.set("qboStatus", String(httpStatus));
  redirect(`/settings?${params.toString()}`);
}
