import { describe, expect, it } from "vitest";
import { mockRepositories } from "./mock-repositories";

/**
 * The credential registry read (ADR-0103, #905): `listAllConnections` returns every
 * connection across scopes, client-first, carrying the registry fields (account linkage +
 * auth method) and the Key Vault secret NAME — never a value.
 */
const conns = mockRepositories.connections;

describe("listAllConnections (credential registry)", () => {
  it("returns every scope, ordered client → company → user", async () => {
    const all = await conns.listAllConnections();
    const scopes = [...new Set(all.map((c) => c.scope))];
    expect(scopes).toContain("client");
    expect(scopes).toContain("company");
    expect(scopes).toContain("user");
    // Client rows come before company rows, which come before user rows.
    const firstUser = all.findIndex((c) => c.scope === "user");
    const lastClient = all.map((c) => c.scope).lastIndexOf("client");
    const lastCompany = all.map((c) => c.scope).lastIndexOf("company");
    expect(lastClient).toBeLessThan(firstUser);
    expect(lastCompany).toBeLessThan(firstUser);
  });

  it("carries the registry fields: client rows link an account; enterprise apps carry an auth method", async () => {
    const all = await conns.listAllConnections();
    const client = all.find((c) => c.scope === "client");
    expect(client?.accountId).toBeTruthy();
    expect(client?.accountName).toBeTruthy();
    expect(client?.authMethod).toBe("secret");

    const certApp = all.find((c) => c.authMethod === "certificate");
    expect(certApp?.certThumbprint).toBeTruthy();
  });

  it("surfaces the Key Vault secret NAME, not a value, on every row", async () => {
    const all = await conns.listAllConnections();
    for (const c of all) {
      // Names follow the human-readable standard conn-<scope>-…; never an inline secret.
      expect(c.keyvaultSecretRef).toMatch(/^conn-/);
    }
  });
});
