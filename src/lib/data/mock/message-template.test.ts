import { describe, expect, it } from "vitest";
import { mockRepositories } from "./mock-repositories";
import type { MessageTemplateInput } from "@/types";

/**
 * Behaviour tests for the message-template store (#731, ADR-0073) on the mock repo. The
 * store is the render-content a journey send references by id; the backend journey runner
 * (BE #174) renders email → { subject, html } / sms → { body } against it. These cover
 * the CRUD round-trip and the channel-typed content shape (the render contract).
 */
const repo = mockRepositories.messageTemplates;

const emailInput: MessageTemplateInput = {
  name: "Onboarding email",
  channel: "email",
  subject: "Welcome aboard, {{firstName}}",
  html: "<p>Glad to have you.</p>",
  body: null,
  mergeFields: ["firstName"],
};

describe("mock message templates (#731)", () => {
  it("createTemplate returns an id and the template reads back with its content contract", async () => {
    const id = await repo.createTemplate(emailInput, "me@example.com");
    const got = await repo.getTemplate(id);
    expect(got).not.toBeNull();
    expect(got).toMatchObject({
      id,
      name: "Onboarding email",
      channel: "email",
      subject: "Welcome aboard, {{firstName}}",
      html: "<p>Glad to have you.</p>",
      body: null,
    });
    expect(got!.mergeFields).toEqual(["firstName"]);
  });

  it("listTemplateOptions returns {id,name,channel} the journey picker renders against", async () => {
    const id = await repo.createTemplate(
      { ...emailInput, name: "Picker option" },
      "me@example.com",
    );
    const opts = await repo.listTemplateOptions();
    const opt = opts.find((o) => o.id === id);
    expect(opt).toEqual({ id, name: "Picker option", channel: "email" });
  });

  it("updateTemplate switches channel + content (email → sms)", async () => {
    const id = await repo.createTemplate(emailInput, "me@example.com");
    await repo.updateTemplate(id, {
      name: "Now SMS",
      channel: "sms",
      subject: null,
      html: null,
      body: "Quick reminder, {{firstName}}.",
      mergeFields: ["firstName"],
    });
    const got = await repo.getTemplate(id);
    expect(got).toMatchObject({ channel: "sms", body: "Quick reminder, {{firstName}}.", subject: null });
  });

  it("deleteTemplate removes it (getTemplate then returns null)", async () => {
    const id = await repo.createTemplate(emailInput, "me@example.com");
    await repo.deleteTemplate(id);
    expect(await repo.getTemplate(id)).toBeNull();
  });
});
