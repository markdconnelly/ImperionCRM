import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server-action wiring tests for receipt upload (#899, ADR-0083 §Receipts). These pin the
 * FE slice of the receipt write path: self-scoping (`expense:write` + session employee),
 * fast local file validation, the backend upload → `receipt_attachment` row + link flow,
 * and graceful degradation when the backend is unconfigured / refuses the file. The backend
 * upload (`receiptsService.upload`) and the repo write (`attachReceiptToExpenseItem`) are
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
  attachReceiptToExpenseItem: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { email: "emp@imperionllc.com" } })) }));
vi.mock("@/lib/data/app-user", () => ({ resolveAppUserIdByEmail: h.resolveAppUserIdByEmail }));
vi.mock("@/lib/data", () => ({
  getRepositories: () => ({ crm: { attachReceiptToExpenseItem: h.attachReceiptToExpenseItem } }),
}));
vi.mock("@/lib/services", () => ({ receiptsService: { upload: h.upload } }));
// external-client carries `import "server-only"` (unresolvable under vitest) + the Azure
// identity client; stub its error classes the way every caller test does so call-guard's
// real classifier still runs against them.
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

import { uploadReceiptAction } from "./actions";

const EMP = "11111111-1111-4111-8111-111111111111";
const PERIOD = "2026-06";
const ITEM = "22222222-2222-4222-8222-222222222222";

function fd(file: File | null, itemId: string = ITEM): FormData {
  const f = new FormData();
  f.set("period", PERIOD);
  f.set("itemId", itemId);
  if (file) f.set("receipt", file);
  return f;
}

function pngFile(bytes = 10): File {
  return new File([new Uint8Array(bytes)], "receipt.png", { type: "image/png" });
}

async function run(formData: FormData): Promise<string> {
  try {
    await uploadReceiptAction(formData);
  } catch (e) {
    return (e as Error).message;
  }
  return "<no-redirect>";
}

beforeEach(() => {
  vi.clearAllMocks();
  h.resolveAppUserIdByEmail.mockResolvedValue(EMP);
});

describe("uploadReceiptAction", () => {
  it("requires the expense:write capability", async () => {
    await run(fd(pngFile()));
    expect(h.requireCapability).toHaveBeenCalledWith("expense:write");
  });

  it("notices (no upload) when no file is provided", async () => {
    const r = await run(fd(null));
    expect(r).toContain("notice=");
    expect(h.upload).not.toHaveBeenCalled();
  });

  it("rejects an over-size file before any backend call", async () => {
    const big = new File([new Uint8Array(26 * 1024 * 1024)], "big.pdf", { type: "application/pdf" });
    const r = await run(fd(big));
    expect(r).toMatch(/notice=.*25%20MB|notice=/);
    expect(h.upload).not.toHaveBeenCalled();
  });

  it("rejects an unsupported content type before any backend call", async () => {
    const exe = new File([new Uint8Array(10)], "x.exe", { type: "application/x-msdownload" });
    const r = await run(fd(exe));
    expect(r).toContain("notice=");
    expect(h.upload).not.toHaveBeenCalled();
  });

  it("uploads, inserts the receipt row, links the item, then redirects clean", async () => {
    h.upload.mockResolvedValue({
      blobPath: "receipts/abc",
      contentHash: "sha256:deadbeef",
      byteSize: 10,
      contentType: "image/png",
    });
    h.attachReceiptToExpenseItem.mockResolvedValue("rcpt-1");

    const r = await run(fd(pngFile()));

    expect(h.upload).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: EMP, contentType: "image/png", filename: "receipt.png" }),
    );
    expect(h.attachReceiptToExpenseItem).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: ITEM, employeeId: EMP, blobPath: "receipts/abc" }),
    );
    expect(h.revalidatePath).toHaveBeenCalledWith("/expenses");
    expect(r).toBe(`NEXT_REDIRECT:/expenses?period=${PERIOD}`);
  });

  it("degrades to a notice (no row write) when the backend upload is not configured", async () => {
    const { ServiceNotConfiguredError } = await import("@/lib/services/external-client");
    h.upload.mockRejectedValue(new ServiceNotConfiguredError("Receipt upload", "INTEGRATION_SERVICE_URL"));

    const r = await run(fd(pngFile()));

    expect(r).toContain("notice=");
    expect(h.attachReceiptToExpenseItem).not.toHaveBeenCalled();
  });

  it("notices when the report is no longer open (repo returns null)", async () => {
    h.upload.mockResolvedValue({
      blobPath: "receipts/abc",
      contentHash: null,
      byteSize: 10,
      contentType: "image/png",
    });
    h.attachReceiptToExpenseItem.mockResolvedValue(null);

    const r = await run(fd(pngFile()));
    expect(r).toContain("notice=");
  });
});
