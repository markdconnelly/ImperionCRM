/**
 * Company-wide integration providers configured under Settings → Company
 * credentials (ADR-0036). Each entry describes how its credential is collected:
 * either a set of `fields` (the secret ones are write-only password inputs, never
 * echoed back) or an admin-consent `kind: "consent"` flow (QBO).
 *
 * This is metadata only — no secrets. The values entered are POSTed to the backend
 * credential store, which writes them to Key Vault (CLAUDE.md §5).
 */

export type CredentialFieldType = "text" | "password" | "select" | "textarea";

export interface CredentialField {
  /** Form field name (also the key sent to the backend). */
  name: string;
  label: string;
  /** Write-only secret (rendered as a password input, never pre-filled). */
  secret: boolean;
  type: CredentialFieldType;
  required: boolean;
  placeholder?: string;
  /** For type "select". */
  options?: { value: string; label: string }[];
  /** Short helper text under the field. */
  help?: string;
}

export interface CompanyProvider {
  key: string; // matches connection_provider enum
  label: string;
  icon: string; // lucide name resolved by <Icon />
  /** "credential" = field form; "consent" = admin-consent connect button (QBO). */
  kind: "credential" | "consent";
  description: string;
  /** Scopes recorded on the connection row (display/audit only). */
  scopes: string[];
  /** Present for kind "credential". */
  fields?: CredentialField[];
  /**
   * A send-capable credential: its token grants OUTBOUND action (e.g. Meta DM
   * replies — pipeline #89 / PR #113), not just read/ingest. Entering it is a
   * Mark-approved security event. Flagged so the UI can mark it accordingly and so
   * it is never treated as a routine, pollable ingest source (it has nothing
   * polling it — the cadence selector would be meaningless).
   */
  sendCapable?: boolean;
  /**
   * A `kind: "credential"` provider that ALSO needs a one-time admin-consent step
   * after its secrets are stored (DocuSign JWT impersonation, #318/#392). Unlike a
   * `kind: "consent"` provider (no secret to paste, QBO), DocuSign needs both:
   * the secrets entered via the form AND an admin grant. When set, the card renders a
   * "Grant admin consent" button alongside the credential form.
   */
  adminConsent?: boolean;
}

/**
 * Whether a poll cadence is meaningful for this provider (ADR-0038 / `pollDue()`).
 *
 * Only polled data sources (`kind: "credential"` — Autotask, IT Glue, …) are
 * scraped on a cadence, so only they get the cadence selector and the on-demand
 * "Refresh now" control. Consent/OAuth providers (QBO — `kind: "consent"`)
 * have nothing polling them: QBO refreshes on-demand and is bulk-pulled by the
 * on-prem pipeline. Rendering a poll cadence
 * for them is meaningless, so it is gated out here. A `sendCapable` credential
 * (Meta DM token) is likewise not an ingest source — nothing polls it — so it is
 * excluded too. An `adminConsent` credential (DocuSign) is a send/consent integration
 * with nothing polling it either, so it is excluded as well.
 */
export function providerIsPollable(
  provider: Pick<CompanyProvider, "kind" | "sendCapable" | "adminConsent">,
): boolean {
  return (
    provider.kind === "credential" &&
    provider.sendCapable !== true &&
    provider.adminConsent !== true
  );
}

export const COMPANY_PROVIDERS: CompanyProvider[] = [
  {
    key: "autotask",
    label: "Autotask (PSA)",
    icon: "Ticket",
    kind: "credential",
    description: "Kaseya Autotask REST API — tickets, contracts, and company records.",
    scopes: ["tickets:read", "companies:read"],
    fields: [
      {
        name: "username",
        label: "API user (username)",
        secret: false,
        type: "text",
        required: true,
        placeholder: "apiuser@imperion.example",
      },
      {
        name: "secret",
        label: "API secret",
        secret: true,
        type: "password",
        required: true,
      },
      {
        name: "integrationCode",
        label: "API integration (tracking) code",
        secret: true,
        type: "password",
        required: true,
        help: "The API Tracking Identifier issued for the integration vendor.",
      },
    ],
  },
  {
    key: "itglue",
    label: "IT Glue",
    icon: "BookText",
    kind: "credential",
    description: "IT Glue documentation API — assets, configurations, and runbooks.",
    scopes: ["assets:read", "docs:read"],
    fields: [
      { name: "apiKey", label: "API key", secret: true, type: "password", required: true },
      {
        name: "region",
        label: "Region",
        secret: false,
        type: "select",
        required: true,
        options: [
          { value: "us", label: "US (api.itglue.com)" },
          { value: "eu", label: "EU (api.eu.itglue.com)" },
          { value: "au", label: "AU (api.au.itglue.com)" },
        ],
      },
    ],
  },
  {
    key: "pax8",
    label: "Pax8",
    icon: "ShoppingCart",
    kind: "credential",
    description:
      "Pax8 distributor API — subscriptions, licenses, and orders (the procure→provision→bill loop, #1042).",
    scopes: ["subscriptions:read", "licenses:read", "orders:read", "companies:read"],
    fields: [
      {
        name: "clientId",
        label: "Client ID",
        secret: false,
        type: "text",
        required: true,
        placeholder: "Pax8 API client id",
      },
      {
        name: "clientSecret",
        label: "Client secret",
        secret: true,
        type: "password",
        required: true,
        help: "Pax8 API OAuth client-credentials secret. Stored in Key Vault by reference; never echoed back.",
      },
    ],
  },
  {
    key: "myitprocess",
    label: "My IT Process",
    icon: "ListChecks",
    kind: "credential",
    description: "My IT Process (vCIO / strategic roadmap) API.",
    scopes: ["reviews:read", "recommendations:read"],
    fields: [
      { name: "apiKey", label: "API key", secret: true, type: "password", required: true },
    ],
  },
  {
    key: "quotemanager",
    label: "Kaseya Quote Manager",
    icon: "Calculator",
    kind: "credential",
    description: "Kaseya Quote Manager API — quotes and the product catalog for proposals.",
    scopes: ["quotes:read", "quotes:write"],
    fields: [
      { name: "apiKey", label: "API key", secret: true, type: "password", required: true },
      {
        name: "tenant",
        label: "Tenant / account ID",
        secret: false,
        type: "text",
        required: false,
        placeholder: "optional",
      },
    ],
  },
  {
    key: "televy",
    label: "Televy",
    icon: "BarChart3",
    kind: "credential",
    description: "Televy API — assessment reporting and scorecards.",
    scopes: ["assessments:read", "reports:read"],
    fields: [
      { name: "apiKey", label: "API key", secret: true, type: "password", required: true },
    ],
  },
  {
    key: "qbo",
    label: "QuickBooks Online",
    icon: "DollarSign",
    kind: "consent",
    description:
      "Imperion's own QuickBooks Online company (read-only) — the authoritative payment " +
      "fact for time + expense reconciliation (ADR-0085). Connect once via Intuit OAuth; " +
      "there is no key to paste and the app never writes to QuickBooks.",
    scopes: ["com.intuit.quickbooks.accounting"],
  },
  {
    key: "darkwebid",
    label: "Dark Web ID",
    icon: "ShieldAlert",
    kind: "credential",
    description:
      "Kaseya / ID Agent Dark Web ID — dark-web monitoring for compromised credentials tied to " +
      "your clients' domains. Exposures land as credential-exposure records (ADR-0040).",
    scopes: ["compromises:read"],
    fields: [
      { name: "apiKey", label: "API key", secret: true, type: "password", required: true },
    ],
  },
  {
    key: "meta",
    label: "Meta (Facebook / Instagram)",
    icon: "MessageCircle",
    kind: "credential",
    // Send-capable: the Page token authorizes OUTBOUND DM replies, so the cloud
    // pipeline stays dormant/fail-closed until this secret exists (pipeline #89 / PR #113).
    sendCapable: true,
    description:
      "Meta (Facebook / Instagram) Page messaging — long-lived Page access token used to send " +
      "Facebook & Instagram DM replies. SEND-CAPABLE: entering it is a Mark-approved security " +
      "event (Meta App Review / Advanced Access for the messaging permissions must be granted " +
      "first). Stored as the Key Vault secret conn-company-meta; the pipeline stays dormant " +
      "until it exists.",
    scopes: ["pages_messaging", "instagram_manage_messages"],
    fields: [
      {
        name: "pageAccessToken",
        label: "Page access token",
        secret: true,
        type: "password",
        required: true,
        help: "Long-lived Facebook Page token granting pages_messaging / instagram_manage_messages.",
      },
      {
        name: "pageId",
        label: "Facebook Page ID",
        secret: false,
        type: "text",
        required: true,
        placeholder: "1234567890",
        help: "The Facebook Page id the Instagram account is linked to.",
      },
    ],
  },
  {
    key: "docusign",
    label: "DocuSign (e-signature)",
    icon: "FileSignature",
    kind: "credential",
    // Also needs a one-time admin grant after the secrets are stored — the card
    // renders a "Grant admin consent" button (JWT impersonation, #318/#392).
    adminConsent: true,
    description:
      "DocuSign JWT-grant service integration — sends proposal/contract envelopes for " +
      "signature (ADR-0071 / backend ADR-0056). Enter the integration key, RSA private key, " +
      "and impersonated API user; the backend custodies each in Key Vault. Account id + " +
      "environment (demo/production) are set in App Settings. After saving, click Grant admin " +
      "consent once per environment.",
    scopes: ["signature", "impersonation"],
    fields: [
      {
        name: "integrationKey",
        label: "Integration key (client id)",
        secret: true,
        type: "password",
        required: true,
        help: "The DocuSign app's Integration Key (GUID) — the JWT issuer / OAuth client id.",
      },
      {
        name: "rsaPrivateKey",
        label: "RSA private key (PEM)",
        secret: true,
        type: "textarea",
        required: true,
        placeholder: "-----BEGIN RSA PRIVATE KEY-----",
        help: "The RSA keypair's PRIVATE key for the integration. Written to Key Vault, never the DB.",
      },
      {
        name: "impersonatedUserId",
        label: "Impersonated API user (GUID)",
        secret: true,
        type: "password",
        required: true,
        help: "The DocuSign user the service acts as — the JWT `sub`.",
      },
    ],
  },
];
