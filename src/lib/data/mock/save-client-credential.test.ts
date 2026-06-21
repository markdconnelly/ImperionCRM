import { describe, expect, it } from "vitest";
import { mockRepositories } from "./mock-repositories";

/**
 * saveClientCredential (ADR-0103, #957): the data-layer foundation the client
 * credential-entry form (#950) writes — one `scope='client'` connection row per
 * (account, provider, client-app), carrying the registry fields and the Key Vault
 * secret NAME (never a value). Re-saving the same identity rotates, not duplicates.
 */
const conns = mockRepositories.connections;

describe("saveClientCredential (client credential registry)", () => {
  it("inserts a new client-scope row linked to the account", async () => {
    await conns.saveClientCredential({
      accountId: "acc_widgets",
      provider: "m365",
      displayName: "Widgets M365",
      scopes: ["Directory.Read.All"],
      authMethod: "secret",
      certThumbprint: null,
      clientId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      keyvaultSecretRef: "conn-client-widgets-m365",
      externalAccountId: "tenant-widgets",
      status: "active",
    });
    const forAccount = await conns.listAccountConnections("acc_widgets");
    expect(forAccount).toHaveLength(1);
    expect(forAccount[0]).toMatchObject({
      scope: "client",
      provider: "m365",
      accountId: "acc_widgets",
      authMethod: "secret",
      clientId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      keyvaultSecretRef: "conn-client-widgets-m365",
      status: "active",
    });
  });

  it("rotates (does not duplicate) when the same (account, provider, client app) is re-saved", async () => {
    const input = {
      accountId: "acc_rotate",
      provider: "m365",
      displayName: "Rotate Co",
      scopes: ["Directory.Read.All"],
      authMethod: "secret" as const,
      certThumbprint: null,
      clientId: "11111111-1111-1111-1111-111111111111",
      keyvaultSecretRef: "conn-client-rotate-m365",
      externalAccountId: null,
      status: "active",
    };
    await conns.saveClientCredential(input);
    await conns.saveClientCredential({ ...input, status: "expired", displayName: "Rotate Co (rotated)" });
    const forAccount = await conns.listAccountConnections("acc_rotate");
    expect(forAccount).toHaveLength(1);
    expect(forAccount[0].status).toBe("expired");
    expect(forAccount[0].displayName).toBe("Rotate Co (rotated)");
  });

  it("supports the unifi api_key provider (one console per account)", async () => {
    await conns.saveClientCredential({
      accountId: "acc_unifi",
      provider: "unifi",
      displayName: "Acme UniFi console",
      scopes: [],
      authMethod: "api_key",
      certThumbprint: null,
      clientId: null,
      keyvaultSecretRef: "conn-client-unifi-console9",
      externalAccountId: "console9",
      status: "active",
    });
    const forAccount = await conns.listAccountConnections("acc_unifi");
    expect(forAccount).toHaveLength(1);
    expect(forAccount[0]).toMatchObject({ provider: "unifi", authMethod: "api_key" });
  });

  it("never stores a secret value — only the Key Vault reference name", async () => {
    await conns.saveClientCredential({
      accountId: "acc_secretcheck",
      provider: "m365",
      displayName: null,
      scopes: [],
      authMethod: "certificate",
      certThumbprint: "AB12CD34",
      clientId: "22222222-2222-2222-2222-222222222222",
      keyvaultSecretRef: "conn-client-secretcheck-m365",
      externalAccountId: null,
      status: "active",
    });
    const [row] = await conns.listAccountConnections("acc_secretcheck");
    expect(row.keyvaultSecretRef).toMatch(/^conn-/);
    expect(row.certThumbprint).toBe("AB12CD34");
  });
});
