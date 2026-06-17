import { describe, expect, it } from "vitest";
import { mockRepositories } from "./mock-repositories";
import type { ConnectorInstanceInput } from "@/types";

/**
 * Behaviour tests for the mock connector repository (ADR-0076 §2/§3, #414): the
 * in-memory connector_instance store. Covers enable → list/get, the
 * (connectorKey, accountScope) upsert that mirrors the UNIQUE constraint, lifecycle
 * status transitions, cadence override, and disable. Module-level singleton state,
 * so each test uses a unique connectorKey/scope to avoid collisions.
 */
const c = mockRepositories.connectors;

const input = (over: Partial<ConnectorInstanceInput> = {}): ConnectorInstanceInput => ({
  connectorKey: "autotask",
  accountScope: "global",
  grantedScopes: ["tickets:read"],
  cadenceOverrideMinutes: null,
  ...over,
});

describe("mock connectors — enable + read", () => {
  it("enables a connector in 'connecting' and reads it back by id and by key", async () => {
    const id = await c.enableConnector(input({ connectorKey: "m365", accountScope: "acme" }));
    const byId = await c.getConnectorInstance(id);
    expect(byId?.status).toBe("connecting");
    expect(byId?.connectorKey).toBe("m365");
    const byKey = await c.getConnectorInstanceByKey("m365", "acme");
    expect(byKey?.id).toBe(id);
    expect((await c.listConnectorInstances()).some((x) => x.id === id)).toBe(true);
  });

  it("upserts on (connectorKey, accountScope) — re-enable updates, does not duplicate", async () => {
    const first = await c.enableConnector(
      input({ connectorKey: "itglue", accountScope: "globex", grantedScopes: ["assets:read"] }),
    );
    const again = await c.enableConnector(
      input({
        connectorKey: "itglue",
        accountScope: "globex",
        grantedScopes: ["assets:read", "docs:read"],
        cadenceOverrideMinutes: 720,
      }),
    );
    expect(again).toBe(first); // same row
    const row = await c.getConnectorInstance(first);
    expect(row?.grantedScopes).toEqual(["assets:read", "docs:read"]);
    expect(row?.cadenceOverrideMinutes).toBe(720);
    const all = await c.listConnectorInstances();
    expect(all.filter((x) => x.connectorKey === "itglue" && x.accountScope === "globex")).toHaveLength(1);
  });
});

describe("mock connectors — lifecycle + mutation", () => {
  it("advances status and records a health blob", async () => {
    const id = await c.enableConnector(input({ connectorKey: "meta", accountScope: "scope-a" }));
    await c.setConnectorStatus(id, "polling", { state: "ok", message: "first sync done" });
    const row = await c.getConnectorInstance(id);
    expect(row?.status).toBe("polling");
    expect(row?.health).toEqual({ state: "ok", message: "first sync done" });
  });

  it("sets and clears the cadence override", async () => {
    const id = await c.enableConnector(input({ connectorKey: "darkwebid", accountScope: "scope-b" }));
    await c.setConnectorCadence(id, 360);
    expect((await c.getConnectorInstance(id))?.cadenceOverrideMinutes).toBe(360);
    await c.setConnectorCadence(id, null);
    expect((await c.getConnectorInstance(id))?.cadenceOverrideMinutes).toBeNull();
  });

  it("disables (removes) a connector instance", async () => {
    const id = await c.enableConnector(input({ connectorKey: "apollo", accountScope: "scope-c" }));
    await c.disableConnector(id);
    expect(await c.getConnectorInstance(id)).toBeNull();
    expect(await c.getConnectorInstanceByKey("apollo", "scope-c")).toBeNull();
  });
});
