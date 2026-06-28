import { describe, expect, it } from "vitest";
import { COMPANY_PROVIDERS, providerIsPollable } from "./company-providers";

describe("providerIsPollable", () => {
  // Poll cadence (ADR-0038 / pollDue()) is only meaningful for polled data
  // sources. #531: it must NOT render for consent/OAuth providers.
  it("credential providers are pollable", () => {
    expect(providerIsPollable({ kind: "credential" })).toBe(true);
  });

  it("consent providers are not pollable", () => {
    expect(providerIsPollable({ kind: "consent" })).toBe(false);
  });

  it("send-capable credentials are not pollable (nothing polls a send token)", () => {
    // Meta DM token is OUTBOUND-only (pipeline #89) — no ingest cadence applies.
    expect(providerIsPollable({ kind: "credential", sendCapable: true })).toBe(false);
  });

  it("Autotask and IT Glue are pollable; QBO and Meta are not", () => {
    const byKey = (key: string) => {
      const p = COMPANY_PROVIDERS.find((cp) => cp.key === key);
      if (!p) throw new Error(`missing provider ${key}`);
      return p;
    };
    expect(providerIsPollable(byKey("autotask"))).toBe(true);
    expect(providerIsPollable(byKey("itglue"))).toBe(true);
    expect(providerIsPollable(byKey("qbo"))).toBe(false);
    expect(providerIsPollable(byKey("meta"))).toBe(false);
  });

  it("DocuSign (adminConsent credential) is not pollable — nothing polls a send integration", () => {
    const docusign = COMPANY_PROVIDERS.find((p) => p.key === "docusign");
    expect(docusign?.kind).toBe("credential");
    expect(providerIsPollable(docusign!)).toBe(false);
  });

  it("only non-send-capable, non-consent credential providers are pollable across the whole catalog", () => {
    for (const p of COMPANY_PROVIDERS) {
      expect(providerIsPollable(p)).toBe(
        p.kind === "credential" && p.sendCapable !== true && p.adminConsent !== true,
      );
    }
  });
});

describe("COMPANY_PROVIDERS — DocuSign provider (#862)", () => {
  const docusign = COMPANY_PROVIDERS.find((p) => p.key === "docusign");

  it("is a credential provider that also needs admin consent", () => {
    expect(docusign).toBeDefined();
    expect(docusign?.kind).toBe("credential");
    expect(docusign?.adminConsent).toBe(true);
  });

  it("collects the three JWT secrets the backend store maps to named Key Vault secrets", () => {
    const fieldNames = docusign?.fields?.map((f) => f.name) ?? [];
    expect(fieldNames).toEqual(["integrationKey", "rsaPrivateKey", "impersonatedUserId"]);
    // Every field is a write-only secret; the RSA key is a multiline textarea.
    expect(docusign?.fields?.every((f) => f.secret)).toBe(true);
    expect(docusign?.fields?.find((f) => f.name === "rsaPrivateKey")?.type).toBe("textarea");
    // Account id + environment are NOT entered via the form (ops App Settings).
    expect(fieldNames).not.toContain("accountId");
    expect(fieldNames).not.toContain("environment");
  });
});

describe("COMPANY_PROVIDERS — Meta provider (#586, extended #1341)", () => {
  const meta = COMPANY_PROVIDERS.find((p) => p.key === "meta");

  it("is present as a send-capable credential provider, not pollable", () => {
    expect(meta).toBeDefined();
    expect(meta?.kind).toBe("credential");
    expect(meta?.sendCapable).toBe(true);
    expect(providerIsPollable(meta!)).toBe(false);
  });

  it("collects ONLY the token — NO Page ID prompt (#1568, ADR-0124 #7)", () => {
    // The ONE Business-Suite token owns the FB Page + IG account; the backend resolves those
    // ids from the token via Graph on save (backend #457), so the operator never types a Page
    // ID. The old required `pageId` field was a stored-value re-prompt and is removed.
    const fieldNames = meta?.fields?.map((f) => f.name) ?? [];
    expect(fieldNames).toEqual(["pageAccessToken"]);
    expect(fieldNames).not.toContain("pageId");
    const token = meta?.fields?.find((f) => f.name === "pageAccessToken");
    expect(token?.secret).toBe(true);
    expect(token?.required).toBe(true);
  });

  it("records the full FB+IG+Messenger+Ads scope union, one secret (ADR-0124 #7)", () => {
    // The exact union the issue requires recorded for display/audit (ADR-0124 #7). Existing DM
    // messaging scopes (pages_messaging / instagram_manage_messages) are RETAINED so the Meta-DM
    // path keeps resolving; the rest extend the one app token to Page management, IG content, Ads.
    expect(meta?.scopes).toEqual([
      "pages_messaging",
      "pages_manage_metadata",
      "pages_read_engagement",
      "pages_manage_posts",
      "instagram_basic",
      "instagram_manage_messages",
      "instagram_content_publish",
      "ads_management",
      "ads_read",
      "business_management",
    ]);
    // DM messaging is preserved (the acceptance criterion: existing DM messaging still resolves).
    expect(meta?.scopes).toContain("pages_messaging");
    expect(meta?.scopes).toContain("instagram_manage_messages");
  });

  it("renders as two card views (Meta Social / Meta Ads) over the ONE secret", () => {
    // Datto 2-cards/1-key precedent (ADR-0122); single credential, two scope views (ADR-0124 #7).
    const groups = meta?.scopeGroups ?? [];
    expect(groups.map((g) => g.label)).toEqual(["Meta Social", "Meta Ads"]);
    // Still ONE secret: a single write-only token field, not one per view.
    const secretFields = meta?.fields?.filter((f) => f.secret) ?? [];
    expect(secretFields).toHaveLength(1);
    expect(secretFields[0]?.name).toBe("pageAccessToken");
  });

  it("every grouped scope is a subset of the flat union, and the union is fully covered", () => {
    const flat = new Set(meta?.scopes ?? []);
    const grouped = new Set<string>();
    for (const g of meta?.scopeGroups ?? []) {
      for (const s of g.scopes) {
        expect(flat.has(s)).toBe(true); // subset
        grouped.add(s);
      }
    }
    // Union of groups covers every declared scope (no orphan scope hidden from both views).
    expect([...flat].every((s) => grouped.has(s))).toBe(true);
  });

  it("puts the ads scopes only in the Meta Ads view, messaging only in Meta Social", () => {
    const social = meta?.scopeGroups?.find((g) => g.label === "Meta Social");
    const ads = meta?.scopeGroups?.find((g) => g.label === "Meta Ads");
    expect(ads?.scopes).toEqual(["ads_management", "ads_read", "business_management"]);
    expect(social?.scopes).toContain("pages_messaging");
    expect(social?.scopes).not.toContain("ads_management");
  });
});

describe("COMPANY_PROVIDERS — Pax8 provider (#1052)", () => {
  const pax8 = COMPANY_PROVIDERS.find((p) => p.key === "pax8");

  it("is a pollable credential ingest source (procure→bill loop, #1042)", () => {
    expect(pax8).toBeDefined();
    expect(pax8?.kind).toBe("credential");
    expect(pax8?.sendCapable).not.toBe(true);
    expect(pax8?.adminConsent).not.toBe(true);
    expect(providerIsPollable(pax8!)).toBe(true);
  });

  it("collects an OAuth client-credentials pair — clientId (public) + clientSecret (write-only)", () => {
    const fieldNames = pax8?.fields?.map((f) => f.name) ?? [];
    expect(fieldNames).toEqual(["clientId", "clientSecret"]);
    expect(pax8?.fields?.find((f) => f.name === "clientId")?.secret).toBe(false);
    const secret = pax8?.fields?.find((f) => f.name === "clientSecret");
    expect(secret?.secret).toBe(true);
    expect(secret?.required).toBe(true);
  });
});

describe("COMPANY_PROVIDERS — Dark Web ID provider (#1312)", () => {
  const darkwebid = COMPANY_PROVIDERS.find((p) => p.key === "darkwebid");

  it("is a pollable credential ingest source (ADR-0040)", () => {
    expect(darkwebid).toBeDefined();
    expect(darkwebid?.kind).toBe("credential");
    expect(darkwebid?.sendCapable).not.toBe(true);
    expect(providerIsPollable(darkwebid!)).toBe(true);
  });

  it("collects an HTTP Basic-auth pair — username (public) + password (write-only), not a single API key", () => {
    // ADR-0040 amendment (2026-06-24): Dark Web ID uses Basic auth + IP allowlist,
    // NOT a bearer apiKey. Stored as the conn-company-darkwebid Key Vault JSON blob.
    const fieldNames = darkwebid?.fields?.map((f) => f.name) ?? [];
    expect(fieldNames).toEqual(["username", "password"]);
    expect(fieldNames).not.toContain("apiKey");
    const username = darkwebid?.fields?.find((f) => f.name === "username");
    const password = darkwebid?.fields?.find((f) => f.name === "password");
    expect(username?.secret).toBe(false);
    expect(username?.required).toBe(true);
    expect(password?.secret).toBe(true);
    expect(password?.required).toBe(true);
  });
});

describe("COMPANY_PROVIDERS — Threads provider (#1335)", () => {
  const threads = COMPANY_PROVIDERS.find((p) => p.key === "threads");

  it("is a send-capable credential, NOT pollable (the token is outbound, nothing polls it)", () => {
    expect(threads).toBeDefined();
    expect(threads?.kind).toBe("credential");
    expect(threads?.sendCapable).toBe(true);
    expect(providerIsPollable(threads!)).toBe(false);
  });

  it("records exactly the six Threads use-case App Review scopes", () => {
    // graph.threads.net use case (epic #1334) — read paths drive ingest, write paths drive
    // the dormant outbound (S4). Display/audit only; no secret lives here.
    expect(threads?.scopes).toEqual([
      "threads_basic",
      "threads_content_publish",
      "threads_manage_replies",
      "threads_read_replies",
      "threads_manage_mentions",
      "threads_manage_insights",
    ]);
  });

  it("collects a write-only Threads user token + a public Threads user id", () => {
    const fieldNames = threads?.fields?.map((f) => f.name) ?? [];
    expect(fieldNames).toEqual(["userToken", "threadsUserId"]);
    const token = threads?.fields?.find((f) => f.name === "userToken");
    const userId = threads?.fields?.find((f) => f.name === "threadsUserId");
    expect(token?.secret).toBe(true);
    expect(token?.required).toBe(true);
    expect(userId?.secret).toBe(false);
    expect(userId?.required).toBe(true);
  });

  it("is a Marketing card distinct from the Meta (Facebook/Instagram) credential", () => {
    // Threads is a separate API + OAuth + credential — must not be folded into conn-company-meta.
    const meta = COMPANY_PROVIDERS.find((p) => p.key === "meta");
    expect(threads?.category).toBe("Marketing");
    expect(threads?.key).not.toBe(meta?.key);
  });
});

describe("COMPANY_PROVIDERS — Datto provider (#1569, ADR-0122 S4)", () => {
  const datto = COMPANY_PROVIDERS.find((p) => p.key === "datto");

  it("is a pollable credential ingest source under Backups (one company key)", () => {
    expect(datto).toBeDefined();
    expect(datto?.kind).toBe("credential");
    expect(datto?.category).toBe("Backups");
    expect(datto?.sendCapable).not.toBe(true);
    expect(datto?.adminConsent).not.toBe(true);
    expect(providerIsPollable(datto!)).toBe(true);
  });

  it("collects a Datto BCDR public key (public) + secret key (write-only) pair", () => {
    const fieldNames = datto?.fields?.map((f) => f.name) ?? [];
    expect(fieldNames).toEqual(["publicKey", "secretKey"]);
    const publicKey = datto?.fields?.find((f) => f.name === "publicKey");
    const secretKey = datto?.fields?.find((f) => f.name === "secretKey");
    expect(publicKey?.secret).toBe(false);
    expect(publicKey?.required).toBe(true);
    expect(secretKey?.secret).toBe(true);
    expect(secretKey?.required).toBe(true);
  });

  it("renders as two card views (Endpoint / SaaS) over the ONE secret", () => {
    // ADR-0122 S4: Datto = two cards over one company key. Two scope views, one secret.
    const groups = datto?.scopeGroups ?? [];
    expect(groups.map((g) => g.label)).toEqual([
      "Datto Endpoint Backups",
      "Datto SaaS Backups",
    ]);
    const secretFields = datto?.fields?.filter((f) => f.secret) ?? [];
    expect(secretFields).toHaveLength(1);
    expect(secretFields[0]?.name).toBe("secretKey");
  });
});
