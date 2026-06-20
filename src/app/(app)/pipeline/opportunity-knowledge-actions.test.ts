import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server-action wiring tests for opportunity sales-knowledge (#429, epic #425). These pin
 * the FE slice of the website-opportunity bronze write: self-scoping (`sales:write` +
 * session user), fast local file validation, the backend upload → `website_opportunities`
 * bronze write flow, notes-saved-even-when-upload-fails, and graceful degradation when the
 * backend blob custody is unconfigured. The backend upload (`knowledgeService.upload`),
 * the deal read (`getOpportunity`), and the bronze write (`addOpportunityKnowledge`) are
 * mocked at the seam; the action's own logic runs.
 */
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  resolveAppUserIdByEmail: vi.fn(),
  upload: vi.fn(),
  getOpportunity: vi.fn(),
  addOpportunityKnowledge: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { email: "rep@imperionllc.com" } })) }));
vi.mock("@/lib/data/app-user", () => ({ resolveAppUserIdByEmail: h.resolveAppUserIdByEmail }));
vi.mock("@/lib/data", () => ({
  getRepositories: () => ({
    crm: { getOpportunity: h.getOpportunity, addOpportunityKnowledge: h.addOpportunityKnowledge },
  }),
}));
vi.mock("@/lib/services", () => ({ knowledgeService: { upload: h.upload } }));
// external-client carries `import "server-only"` (unresolvable under vitest) + the Azure
// identity client; stub its error classes so call-guard's real classifier still runs.
vi.mock("@/lib/services/external-client", () => {
  class ServiceNotConfiguredError extends Error {}
  class ServiceCallError extends Error {
    constructor(
      _name: string,
      public status: number,
      body: string,
    ) {
      super(body);
    }
  }
  return { ServiceNotConfiguredError, ServiceCallError };
});

import { addOpportunityKnowledgeAction } from "./actions";

const USER = "11111111-1111-4111-8111-111111111111";
const OPP = "33333333-3333-4333-8333-333333333333";
const ACCT = "44444444-4444-4444-8444-444444444444";

function fd(opts: { notes?: string; file?: File | null; opportunityId?: string }): FormData {
  const f = new FormData();
  f.set("opportunityId", opts.opportunityId ?? OPP);
  if (opts.notes !== undefined) f.set("notes", opts.notes);
  if (opts.file) f.set("knowledge", opts.file);
  return f;
}

function pdfFile(bytes = 10): File {
  return new File([new Uint8Array(bytes)], "deal.pdf", { type: "application/pdf" });
}

async function run(formData: FormData): Promise<string> {
  try {
    await addOpportunityKnowledgeAction(formData);
  } catch (e) {
    return (e as Error).message;
  }
  return "<no-redirect>";
}

beforeEach(() => {
  vi.clearAllMocks();
  h.resolveAppUserIdByEmail.mockResolvedValue(USER);
  h.getOpportunity.mockResolvedValue({
    id: OPP,
    name: "Acme MSP renewal",
    account: "Acme",
    accountId: ACCT,
    stage: "proposal",
    mrr: "—",
  });
});

describe("addOpportunityKnowledgeAction", () => {
  it("requires the sales:write capability", async () => {
    await run(fd({ notes: "hi" }));
    expect(h.requireCapability).toHaveBeenCalledWith("sales:write");
  });

  it("no-ops when opportunityId is missing", async () => {
    const f = new FormData();
    const r = await run(f);
    expect(r).toBe("<no-redirect>");
    expect(h.addOpportunityKnowledge).not.toHaveBeenCalled();
  });

  it("saves notes (no file) and redirects clean", async () => {
    h.addOpportunityKnowledge.mockResolvedValue(undefined);
    const r = await run(fd({ notes: "Decision maker is the CTO." }));

    expect(h.upload).not.toHaveBeenCalled();
    expect(h.addOpportunityKnowledge).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunityId: OPP,
        accountRef: ACCT,
        title: "Acme MSP renewal",
        stage: "proposal",
        ownerUserId: USER,
        notes: "Decision maker is the CTO.",
        addedKnowledge: [],
      }),
    );
    expect(r).toBe(`NEXT_REDIRECT:/pipeline/${OPP}`);
  });

  it("rejects an over-size file before any backend call", async () => {
    const big = new File([new Uint8Array(26 * 1024 * 1024)], "big.pdf", { type: "application/pdf" });
    const r = await run(fd({ file: big }));
    expect(r).toContain("notice=");
    expect(h.upload).not.toHaveBeenCalled();
    expect(h.addOpportunityKnowledge).not.toHaveBeenCalled();
  });

  it("rejects an unsupported content type before any backend call", async () => {
    const exe = new File([new Uint8Array(10)], "x.exe", { type: "application/x-msdownload" });
    const r = await run(fd({ file: exe }));
    expect(r).toContain("notice=");
    expect(h.upload).not.toHaveBeenCalled();
  });

  it("uploads the file, appends the ref, writes the bronze, redirects clean", async () => {
    h.upload.mockResolvedValue({
      blobPath: "knowledge/abc",
      contentHash: "sha256:deadbeef",
      byteSize: 10,
      contentType: "application/pdf",
    });
    h.addOpportunityKnowledge.mockResolvedValue(undefined);

    const r = await run(fd({ notes: "see attached", file: pdfFile() }));

    expect(h.upload).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: USER, contentType: "application/pdf", filename: "deal.pdf" }),
    );
    expect(h.addOpportunityKnowledge).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunityId: OPP,
        notes: "see attached",
        addedKnowledge: [expect.objectContaining({ blobPath: "knowledge/abc", filename: "deal.pdf" })],
      }),
    );
    expect(r).toBe(`NEXT_REDIRECT:/pipeline/${OPP}`);
  });

  it("still saves notes (no ref) and notices when the upload backend is unconfigured", async () => {
    const { ServiceNotConfiguredError } = await import("@/lib/services/external-client");
    h.upload.mockRejectedValue(
      new ServiceNotConfiguredError("Opportunity knowledge upload", "INTEGRATION_SERVICE_URL"),
    );
    h.addOpportunityKnowledge.mockResolvedValue(undefined);

    const r = await run(fd({ notes: "context", file: pdfFile() }));

    expect(h.addOpportunityKnowledge).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "context", addedKnowledge: [] }),
    );
    expect(r).toContain("notice=");
  });
});
