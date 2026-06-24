"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { COMPANY_PROVIDERS } from "@/lib/integrations/company-providers";
import { connectionsService, credentialsService, pipelineService } from "@/lib/services";
import {
  callServiceWithFallback,
  classifyServiceError,
  isBackendNotConfigured,
} from "@/lib/services/call-guard";
import { ServiceCallError } from "@/lib/services/external-client";
import { docusignTestResult, type DocusignTestResult } from "@/lib/integrations/docusign-test";
import type { QboConnectResult } from "@/lib/integrations/qbo-connect";
import { connectorFor } from "@/lib/integrations/connector-registry";
import { companySecretName } from "@/lib/integrations/kv-secret-name";
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
          revalidatePath("/settings/connections");
          revalidatePath("/profile");
          return;
        }
      }
    }
  }

  const { connections } = getRepositories();
  await connections.disconnect(id);
  revalidatePath("/settings/connections");
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
  revalidatePath("/settings/connections");
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
  const source = connectorFor(providerKey).refresh;
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
  revalidatePath("/settings/connections");
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

  // Record the *intended* canonical name (`conn-company-<provider>`, ADR-0122) up front; the
  // backend store returns the identical string on success. No more `kv://imperion/conn/*`
  // placeholder that pointed at no real secret (epic #1256).
  let keyvaultSecretRef = companySecretName(provider.key);
  let status = "pending";
  try {
    const res = await credentialsService.store({ provider: provider.key, fields });
    keyvaultSecretRef = res.keyvaultSecretRef;
    status = "active";
  } catch (err) {
    // Backend not wired yet (#190 taxonomy) → keep the intended ref + pending.
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
  revalidatePath("/settings/connections");
}

/**
 * Begin the one-time DocuSign admin-consent flow (#862, backend #192). DocuSign is a
 * `kind: "credential"` provider (its secrets are entered via the form + stored by the
 * backend) that ALSO needs a one-time JWT-impersonation admin grant — this action fetches
 * the consent URL and redirects the admin to DocuSign. No cookie: unlike QBO there is
 * no auth-code callback into our app (JWT grant is 2-legged); DocuSign's redirect lands on
 * its own site. When the backend isn't configured yet we record the intent and stay put.
 */
export async function connectDocusignAction(formData: FormData) {
  await requireCapability("settings:write");
  const providerKey = String(formData.get("provider") ?? "");
  const provider = COMPANY_PROVIDERS.find((p) => p.key === providerKey);
  if (!provider || provider.adminConsent !== true) return;

  let consentUrl: string | null = null;
  let status = "pending";
  try {
    const res = await connectionsService.startDocusignConsent();
    consentUrl = res.consentUrl ?? null;
    if (!consentUrl) status = "error";
  } catch (err) {
    if (!isBackendNotConfigured(err)) {
      console.error("connectDocusignAction: consent start failed:", err);
      status = "error";
    }
  }

  const { connections } = getRepositories();
  try {
    await connections.saveCompanyCredential({
      provider: provider.key,
      displayName: `Imperion ${provider.label}`,
      scopes: provider.scopes,
      // Logical canonical ref for the row (`conn-company-docusign`); the engine reads its
      // three role-suffixed secrets by App Setting (ADR-0122 / epic #1256).
      keyvaultSecretRef: companySecretName(provider.key),
      status,
    });
  } catch (err) {
    // The `docusign` connection_provider enum value ships in this PR's migration; if it
    // hasn't been applied yet, a cosmetic row write must not block the consent redirect.
    console.error("connectDocusignAction: record row failed (migration pending?):", err);
  }
  revalidatePath("/settings/connections");

  // redirect() throws — keep it last, outside the try/catch.
  if (consentUrl) redirect(consentUrl);
}

/**
 * Test the DocuSign connection from the GUI (#867). Calls the backend status probe
 * (backend #143) via the web app's managed identity — boundary-clean, the browser
 * never touches the backend (ADR-0028/0035) — and maps the outcome to a renderable
 * result. The probe mints a token as the consent check, so a green result means
 * DocuSign is genuinely ready to send envelopes (DocuSign #318, go-live runbook
 * #850). Gated on `settings:write`; returns a value (the card renders it inline).
 */
export async function testDocusignConnectionAction(): Promise<DocusignTestResult> {
  await requireCapability("settings:write");
  const outcome = await callServiceWithFallback(() => connectionsService.docusignStatus(), {
    label: "testDocusignConnectionAction",
    notConfigured: "DocuSign is not configured in this environment yet.",
    failed: "DocuSign status check failed.",
  });
  return outcome.ok
    ? docusignTestResult({ ok: true, body: outcome.value })
    : docusignTestResult({ ok: false, kind: outcome.kind, status: outcome.status });
}

/**
 * Outcome of registering a client tenant's M365 app credential (#950), rendered inline
 * on the form. Never carries secret material — only a human status line.
 */
export type ClientCredentialResult = {
  ok: boolean;
  tone: "green" | "amber" | "red";
  message: string;
};

const GUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const THUMBPRINT_RE = /^[0-9a-fA-F]{40}$/;

/**
 * Register (or rotate) a managed client tenant's per-tenant M365 app credential (#950,
 * ADR-0103 / backend #217). The admin supplies the linked account, the tenant's Entra
 * app (client) id, and a credential — a client secret OR a certificate thumbprint. The
 * secret/cert is handed to the backend, which custodies it in Key Vault and writes the
 * `client`-scope `connection` row (the value never touches this DB or a log, CLAUDE.md §5).
 * The browser never calls the backend — this server action proxies it (ADR-0028/0035).
 * Gated on `settings:write` (admin); returns a result the form renders inline. Degrades
 * to an honest notice when the backend isn't configured yet.
 */
export async function registerClientM365Action(
  formData: FormData,
): Promise<ClientCredentialResult> {
  await requireCapability("settings:write");

  const accountId = String(formData.get("accountId") ?? "").trim();
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const clientAppId = String(formData.get("clientAppId") ?? "").trim();
  const authMethodRaw = String(formData.get("authMethod") ?? "").trim();
  const clientSecret = String(formData.get("clientSecret") ?? "").trim();
  const certThumbprint = String(formData.get("certThumbprint") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();

  // Validate before sending anything across the boundary (mirrors the backend zod schema).
  if (!accountId) return { ok: false, tone: "red", message: "Pick the linked account." };
  if (!GUID_RE.test(tenantId))
    return { ok: false, tone: "red", message: "Tenant id must be a GUID." };
  if (!GUID_RE.test(clientAppId))
    return { ok: false, tone: "red", message: "App (client) id must be a GUID." };
  if (authMethodRaw !== "secret" && authMethodRaw !== "certificate")
    return { ok: false, tone: "red", message: "Choose an auth method." };
  const authMethod = authMethodRaw;
  if (authMethod === "secret" && !clientSecret)
    return { ok: false, tone: "red", message: "Enter the client secret." };
  if (authMethod === "certificate" && !THUMBPRINT_RE.test(certThumbprint))
    return {
      ok: false,
      tone: "red",
      message: "Certificate thumbprint must be a 40-character hex SHA-1.",
    };

  const outcome = await callServiceWithFallback(
    () =>
      connectionsService.registerClientM365({
        accountId,
        tenantId,
        clientAppId,
        authMethod,
        clientSecret: authMethod === "secret" ? clientSecret : undefined,
        certThumbprint: authMethod === "certificate" ? certThumbprint : undefined,
        displayName: displayName || undefined,
      }),
    {
      label: "registerClientM365Action",
      notConfigured:
        "Saved nothing — the credential custody backend isn't configured in this environment yet.",
      failed: "Couldn't register the client credential — the backend rejected the request.",
    },
  );

  // The M365 registration form lives on the client-mapping screen (ADR-0122 S3a); refresh it so
  // the new per-client health dot appears.
  revalidatePath("/settings/client-mapping/m365");
  if (outcome.ok) {
    return {
      ok: true,
      tone: "green",
      message:
        authMethod === "secret"
          ? "Client M365 app registered — the secret is custodied in Key Vault and the connection is live."
          : "Client M365 app registered — the certificate thumbprint is recorded and the connection is live.",
    };
  }
  return {
    ok: false,
    tone: outcome.kind === "not_configured" ? "amber" : "red",
    message: outcome.message,
  };
}

// A UniFi console/site id — short slug or GUID; alphanumerics + dashes (mirrors the backend
// zod regex + the Key Vault secret-name charset).
const UNIFI_CONSOLE_RE = /^[0-9a-zA-Z-]{1,64}$/;

/**
 * Register (or rotate) a managed client's per-console UniFi credential — the api-key twin of
 * {@link registerClientM365Action} (#964, ADR-0103 / backend #229/#233). The admin supplies
 * the linked account, the console/site id, the API family (`connectionType` console|cloud)
 * with the on-prem `controllerHost` when it's a console, and the API key. The key is handed
 * to the backend, which custodies it in Key Vault and writes the `client`-scope `unifi`
 * `connection` row (the key value never touches this DB or a log, CLAUDE.md §5; the non-secret
 * `connectionType`/`controllerHost` land on `connection.provider_config`). The browser never
 * calls the backend — this server action proxies it (ADR-0028/0035). Gated on `settings:write`
 * (admin); degrades to an honest notice when the backend isn't configured.
 */
export async function registerClientUnifiAction(
  formData: FormData,
): Promise<ClientCredentialResult> {
  await requireCapability("settings:write");

  const accountId = String(formData.get("accountId") ?? "").trim();
  const consoleId = String(formData.get("consoleId") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const connectionTypeRaw = String(formData.get("connectionType") ?? "").trim();
  const controllerHost = String(formData.get("controllerHost") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();

  // Validate before sending anything across the boundary (mirrors the backend zod schema).
  if (!accountId) return { ok: false, tone: "red", message: "Pick the linked account." };
  if (!UNIFI_CONSOLE_RE.test(consoleId))
    return {
      ok: false,
      tone: "red",
      message: "Console id must be alphanumerics/dashes (1–64 chars).",
    };
  if (connectionTypeRaw !== "console" && connectionTypeRaw !== "cloud")
    return { ok: false, tone: "red", message: "Choose a connection type." };
  const connectionType = connectionTypeRaw;
  if (connectionType === "console" && !controllerHost)
    return {
      ok: false,
      tone: "red",
      message: "Controller host is required for a console connection.",
    };
  if (!apiKey) return { ok: false, tone: "red", message: "Enter the API key." };

  const outcome = await callServiceWithFallback(
    () =>
      connectionsService.registerClientUnifi({
        accountId,
        consoleId,
        apiKey,
        connectionType,
        // Never send a host for a cloud console (the backend drops it anyway).
        controllerHost: connectionType === "console" ? controllerHost : undefined,
        displayName: displayName || undefined,
      }),
    {
      label: "registerClientUnifiAction",
      notConfigured:
        "Saved nothing — the credential custody backend isn't configured in this environment yet.",
      failed: "Couldn't register the UniFi console — the backend rejected the request.",
    },
  );

  // The UniFi registration form lives on the client-mapping screen (ADR-0122 S3a).
  revalidatePath("/settings/client-mapping/unifi");
  if (outcome.ok) {
    return {
      ok: true,
      tone: "green",
      message:
        "UniFi console registered — the API key is custodied in Key Vault and the connection is live.",
    };
  }
  return {
    ok: false,
    tone: outcome.kind === "not_configured" ? "amber" : "red",
    message: outcome.message,
  };
}

/**
 * Begin the company-wide QuickBooks Online connect flow (#117/#528). It needs no cookie:
 * the backend parks a one-time CSRF `state` in Key Vault and embeds it
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
    // Canonical pending ref; the real OAuth token secret is minted by the backend callback
    // under the same `conn-company-qbo` name (ADR-0122 / epic #1256).
    keyvaultSecretRef: companySecretName(provider.key),
    status,
  });
  revalidatePath("/settings/connections");

  // redirect() throws — keep redirects last, outside the try/catch.
  if (authorizationUrl) redirect(authorizationUrl);
  const params = new URLSearchParams({ qbo: result });
  if (httpStatus) params.set("qboStatus", String(httpStatus));
  redirect(`/settings/connections?${params.toString()}`);
}
