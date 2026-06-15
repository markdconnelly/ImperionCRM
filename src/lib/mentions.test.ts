import { describe, expect, it } from "vitest";
import {
  handleFromEmail,
  parseMentionHandles,
  resolveMentions,
  segmentBody,
  type MentionableUser,
} from "./mentions";

const users: MentionableUser[] = [
  { id: "u1", displayName: "Ada Lovelace", handle: "ada" },
  { id: "u2", displayName: "Grace Hopper", handle: "grace" },
  { id: "u3", displayName: "First Last", handle: "first.last" },
];

describe("handleFromEmail", () => {
  it("lowercases the local-part", () => {
    expect(handleFromEmail("Ada@imperion.com")).toBe("ada");
    expect(handleFromEmail("First.Last@x.io")).toBe("first.last");
  });
  it("returns null for empty / malformed input", () => {
    expect(handleFromEmail(null)).toBeNull();
    expect(handleFromEmail("")).toBeNull();
    expect(handleFromEmail("has space@x.io")).toBeNull();
  });
});

describe("parseMentionHandles", () => {
  it("extracts distinct, lowercased handles in first-seen order", () => {
    expect(parseMentionHandles("hi @Ada and @grace and @ada again")).toEqual(["ada", "grace"]);
  });
  it("supports dotted handles and ignores bare @", () => {
    expect(parseMentionHandles("cc @first.last @")).toEqual(["first.last"]);
  });
  it("returns [] when there are no mentions", () => {
    expect(parseMentionHandles("no mentions here")).toEqual([]);
  });
});

describe("resolveMentions", () => {
  it("returns only handles that match a known user, deduped", () => {
    const out = resolveMentions("@ada @nobody @grace @ada", users);
    expect(out.map((u) => u.id)).toEqual(["u1", "u2"]);
  });
  it("drops unknown handles (an unknown token is not a mention)", () => {
    expect(resolveMentions("@ghost", users)).toEqual([]);
  });
});

describe("segmentBody", () => {
  it("splits into text + mention runs, leaving unknown tokens as text", () => {
    const seg = segmentBody("hey @ada see @ghost", users);
    expect(seg).toEqual([
      { kind: "text", text: "hey " },
      { kind: "mention", handle: "ada", user: users[0] },
      { kind: "text", text: " see @ghost" },
    ]);
  });
  it("handles a body that is only a mention", () => {
    const seg = segmentBody("@grace", users);
    expect(seg).toEqual([{ kind: "mention", handle: "grace", user: users[1] }]);
  });
  it("returns a single text segment when nothing resolves", () => {
    expect(segmentBody("plain @ghost text", users)).toEqual([
      { kind: "text", text: "plain @ghost text" },
    ]);
  });
});
