/**
 * Company-wide integration providers configured under Settings → Company
 * credentials (ADR-0036). Each entry describes how its credential is collected:
 * either a set of `fields` (the secret ones are write-only password inputs, never
 * echoed back) or an admin-consent `kind: "consent"` flow (GDAP).
 *
 * This is metadata only — no secrets. The values entered are POSTed to the backend
 * credential store, which writes them to Key Vault (CLAUDE.md §5).
 */

export type CredentialFieldType = "text" | "password" | "select";

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
  /** "credential" = field form; "consent" = admin-consent connect button (GDAP). */
  kind: "credential" | "consent";
  description: string;
  /** Scopes recorded on the connection row (display/audit only). */
  scopes: string[];
  /** Present for kind "credential". */
  fields?: CredentialField[];
}

export const COMPANY_PROVIDERS: CompanyProvider[] = [
  {
    key: "gdap",
    label: "Microsoft GDAP (Imperion)",
    icon: "ShieldCheck",
    kind: "consent",
    description:
      "Granular Delegated Admin Privileges for Imperion's Microsoft partner tenant. " +
      "Establishes delegated admin access via Microsoft admin consent — there is no key to paste.",
    scopes: ["DelegatedAdmin.ReadWrite.All"],
  },
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
];
