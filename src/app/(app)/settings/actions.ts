"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { COMPANY_PROVIDERS } from "@/lib/integrations/company-providers";
import {
  clientMappingService,
  connectionsService,
  credentialsService,
  pipelineService,
} from "@/lib/services";
import {
  callServiceWithFallback,
  classifyServiceError,
  isBackendNotConfigured,
} from "@/lib/services/call-guard";
import { ServiceCallError, ServiceNotConfiguredError } from "@/lib/services/external-client";
import { docusignTestResult, type DocusignTestResult } from "@/lib/integrations/docusign-test";
import type { QboConnectResult } from "@/lib/integrations/qbo-connect";
import { connectorFor } from "@/lib/integrations/connector-registry";
import { companySecretName } from "@/lib/integrations/kv-secret-name";
import { PLATFORM_PROVIDERS, platformSecretName } from "@/lib/integrations/platform-providers";
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
 * Purge a registered credential (#1282, backend #390): delete the `connection` row AND its
 * backing Key Vault secret, so a wrongly-seeded credential can be re-seeded cleanly.
 *
 * The row delete + KV purge is a BACKEND process and happens entirely in the backend purge
 * endpoint (#1284) — the web app's DB role has no DELETE on `connection` by design (ADR-0042:
 * the front end is GUI-only; deletes are a backend process). So this action NEVER deletes the
 * row itself; doing so threw an uncaught permission error (the 503 that blocked removals). It
 * calls the backend purge and revalidates; an unconfigured/unreachable backend leaves the row
 * intact (the operator can retry) rather than crashing or half-deleting.
 *
 * Keyed on the connection `id` so a same-account duplicate (e.g. a dead cert row + the correct
 * secret row for one account) is removed individually.
 */
export async function purgeCredentialAction(formData: FormData) {
  await requireCapability("settings:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Optional: the client-mapping screen passes its connector so we revalidate that page too.
  const connector = String(formData.get("connector") ?? "").trim();

  try {
    await credentialsService.purgeCredential({ connectionId: id });
  } catch (err) {
    // Unconfigured backend → nothing we can do from the GUI (the delete is the backend's job);
    // leave the row so the operator can retry once the backend is wired. Any other failure is
    // logged and the row likewise stays. Never throw — an uncaught error here is a 503.
    if (!isBackendNotConfigured(err)) {
      console.error(`purgeCredentialAction(${id}) backend purge failed:`, err);
    }
  }

  // The backend owns the delete; on success the row is already gone from the shared DB. We just
  // refresh the surfaces that render it.
  revalidatePath("/settings/connections");
  if (connector) revalidatePath(`/settings/client-mapping/${connector}`);
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
  // A PUBLIC owned-asset id the backend resolved from the credential (Meta = the FB Page id the
  // ONE Business-Suite token owns, resolved via Graph — ADR-0124 #7 / #1568). `undefined` leaves
  // the column untouched (so a pending/degraded save never wipes a previously-resolved id).
  let externalAccountId: string | undefined;
  try {
    const res = await credentialsService.store({ provider: provider.key, fields });
    keyvaultSecretRef = res.keyvaultSecretRef;
    // Persist the resolved owned-asset id (Meta page id) so it is discovered once, never
    // re-prompted. The id is a public identifier — never a secret (CLAUDE.md §5).
    if (res.externalAccountId) externalAccountId = res.externalAccountId;
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
    externalAccountId,
  });
  revalidatePath("/settings/connections");
}

/** Outcome of saving a platform AI key, rendered inline on the card. Never carries the key. */
export type PlatformCredentialResult = {
  ok: boolean;
  tone: "green" | "amber" | "red";
  message: string;
};

/**
 * Save (or rotate) a PLATFORM-scope AI provider key — Voyage / Anthropic (ADR-0129, #1400).
 *
 * The key is a RAW SCALAR handed to the backend, which VALIDATES it with one cheap live provider
 * call and writes it to Key Vault (`conn-platform-<provider>`) ONLY on success — the secret never
 * touches this DB (CLAUDE.md §5). We then persist the custody reference on a `scope='platform'`
 * `connection` row. Until the backend endpoint is wired the call throws ServiceNotConfiguredError;
 * we record the intended canonical ref + `pending` so the card reflects intent. Gated on
 * `settings:write` (the existing app-admin gate, ADR-0129 #6 — no new role); returns a result the
 * card renders inline. The key is NEVER logged, returned, or stored here.
 */
export async function savePlatformCredentialAction(
  formData: FormData,
): Promise<PlatformCredentialResult> {
  await requireCapability("settings:write");
  const providerKey = String(formData.get("provider") ?? "");
  const provider = PLATFORM_PROVIDERS.find((p) => p.key === providerKey);
  if (!provider) return { ok: false, tone: "red", message: "Unknown platform provider." };

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) return { ok: false, tone: "red", message: `Enter the ${provider.label} key.` };

  // Record the intended canonical name (`conn-platform-<provider>`) up front; the backend store
  // returns the identical string on success (ADR-0129 #3).
  let keyvaultSecretRef = platformSecretName(provider.key);
  let status = "pending";
  let result: PlatformCredentialResult = {
    ok: true,
    tone: "amber",
    message: `Saved nothing — the credential custody backend isn't configured in this environment yet.`,
  };
  try {
    const res = await credentialsService.storePlatform({ provider: provider.key, apiKey });
    keyvaultSecretRef = res.keyvaultSecretRef;
    status = "active";
    result = {
      ok: true,
      tone: "green",
      message: `${provider.label} key validated and custodied in Key Vault.`,
    };
  } catch (err) {
    if (!isBackendNotConfigured(err)) {
      // A real failure — most often the key failed the backend's validate-before-write probe.
      status = "error";
      console.error(`savePlatformCredentialAction(${provider.key}) failed:`, err);
      result = {
        ok: false,
        tone: "red",
        message: `Couldn't save the ${provider.label} key — the backend rejected it (it may have failed validation).`,
      };
    }
  }

  const { connections } = getRepositories();
  await connections.savePlatformCredential({
    provider: provider.key,
    displayName: `Imperion ${provider.label}`,
    keyvaultSecretRef,
    status,
  });
  revalidatePath("/settings/connections");
  return result;
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

  // Auto-map the freshly-registered tenant so the on-prem pipeline can hydrate it on the next
  // run (#1286). Without this, the credential exists but `account_tenant` has no row, so the LP
  // 365/Azure collectors fail closed ("tenant not mapped") and the tenant stays invisible in the
  // mapping panel (which lists only tenants already in entity_xref / posture bronze). The admin
  // already binds account↔tenant on this form, so mirror the client-mapping dual-write
  // (ADR-0112): the entity_xref link via the backend (the authority) + the legacy `account_tenant`
  // row (the join key the posture rollups + LP read, #1049). Both are best-effort — the credential
  // is already custodied, so a mapping hiccup must never fail the registration — and idempotent, so
  // re-saving (rotation) just refreshes the mapping.
  // Truly best-effort: the credential is already custodied, so NEITHER auto-map step may fail the
  // registration or throw to the route error boundary ("Live data is unavailable"). A backend
  // hiccup on the link (e.g. the entity_xref upsert) must not blank the page — log it, keep going,
  // and tell the admin the credential saved but the map needs a manual retry on this screen.
  let autoMapFailed = false;
  if (outcome.ok) {
    const lowerTenant = tenantId.toLowerCase();
    try {
      await clientMappingService.link({
        entityType: "account",
        sourceSystem: "m365",
        sourceKey: lowerTenant,
        internalEntityId: accountId,
        connectionId: outcome.value.connectionId,
      });
    } catch (err) {
      // Backend not wired yet = expected no-op; any other error is a real map failure we swallow.
      if (!(err instanceof ServiceNotConfiguredError)) {
        autoMapFailed = true;
        console.error("[registerClientM365] auto-map link failed (credential is saved)", err);
      }
    }
    try {
      const { security } = getRepositories();
      await security.upsertTenantMapping({
        tenantId: lowerTenant,
        accountId,
        displayName: displayName || null,
      });
    } catch (err) {
      autoMapFailed = true;
      console.error("[registerClientM365] account_tenant upsert failed (credential is saved)", err);
    }
  }

  // The M365 registration form lives on the client-mapping screen (ADR-0122 S3a); refresh it so
  // the new per-client health dot + mapping appear.
  revalidatePath("/settings/client-mapping/m365");
  if (outcome.ok) {
    const custody =
      authMethod === "secret"
        ? "the secret is custodied in Key Vault and the connection is live"
        : "the certificate thumbprint is recorded and the connection is live";
    return autoMapFailed
      ? {
          ok: true,
          tone: "amber",
          message: `Client M365 app registered — ${custody}. The account mapping didn't complete; map this tenant from the table below.`,
        }
      : {
          ok: true,
          tone: "green",
          message: `Client M365 app registered — ${custody}.`,
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
