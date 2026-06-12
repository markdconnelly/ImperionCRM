import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wiring tests for #111 (FB ads builder): the structured form posts typed creative
 * (ADR-0053 §3) into `ad.creative`, writes stay capability-gated, and an empty
 * headline degrades to a creative-less ad rather than a malformed shape.
 */
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  createAd: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("@/lib/data", () => ({
  getRepositories: () => ({ campaigns: { createAd: h.createAd } }),
}));

import { createAdAction } from "./actions";

function adForm(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAdAction (#111, ADR-0053 §3)", () => {
  it("persists the typed creative shape including the targeted audience", async () => {
    await expect(
      createAdAction(
        adForm({
          campaignId: "camp_1",
          name: "Carousel — what attackers see",
          status: "active",
          headline: "One click from ransomware?",
          body: "Get the 15-minute readiness check.",
          imageRef: "https://cdn.example/ad.png",
          cta: "Learn more",
          landingUrl: "https://imperion.example/check",
          utm: "utm_campaign=q3-webinar",
          audienceId: "aud_01",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/campaigns/camp_1");

    expect(h.requireCapability).toHaveBeenCalledWith("sales:write");
    expect(h.createAd).toHaveBeenCalledWith("camp_1", {
      name: "Carousel — what attackers see",
      status: "active",
      creative: {
        headline: "One click from ransomware?",
        body: "Get the 15-minute readiness check.",
        imageRef: "https://cdn.example/ad.png",
        cta: "Learn more",
        landingUrl: "https://imperion.example/check",
        utm: "utm_campaign=q3-webinar",
        audienceId: "aud_01",
      },
    });
    expect(h.revalidatePath).toHaveBeenCalledWith("/campaigns/camp_1");
  });

  it("saves creative: null (not a hollow shape) when no headline is provided", async () => {
    await expect(
      createAdAction(adForm({ campaignId: "camp_1", name: "Untyped", status: "draft" })),
    ).rejects.toThrow("NEXT_REDIRECT:/campaigns/camp_1");
    expect(h.createAd).toHaveBeenCalledWith("camp_1", {
      name: "Untyped",
      status: "draft",
      creative: null,
    });
  });

  it("does nothing without a campaign id", async () => {
    await createAdAction(adForm({ name: "Orphan" }));
    expect(h.createAd).not.toHaveBeenCalled();
  });

  it("refuses the write when the capability gate throws (ADR-0045)", async () => {
    h.requireCapability.mockRejectedValueOnce(new Error("forbidden"));
    await expect(
      createAdAction(adForm({ campaignId: "camp_1", name: "X" })),
    ).rejects.toThrow("forbidden");
    expect(h.createAd).not.toHaveBeenCalled();
  });
});
