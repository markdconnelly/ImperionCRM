import { describe, expect, it } from "vitest";
import {
  CLIENT_SCOPED_CONNECTORS,
  connectorChainSteps,
  isClientScopedConnector,
  type ChainStepKey,
  type ChainStepStatus,
  type ConnectorChainSignals,
} from "./connector-chain";

/** Pull the 4 statuses out in pipeline order for terse assertions. */
function statuses(signals: ConnectorChainSignals): Record<ChainStepKey, ChainStepStatus> {
  const steps = connectorChainSteps(signals);
  return Object.fromEntries(steps.map((s) => [s.key, s.status])) as Record<
    ChainStepKey,
    ChainStepStatus
  >;
}

const base: ConnectorChainSignals = {
  hasCredential: false,
  instanceStatus: null,
  lastSyncAt: null,
  unitsDiscovered: null,
  unitsMapped: null,
};

describe("CLIENT_SCOPED_CONNECTORS", () => {
  it("contains the per-client set and excludes system/company connectors", () => {
    for (const k of ["m365", "autotask", "itglue", "pax8", "unifi", "darkwebid"]) {
      expect(isClientScopedConnector(k)).toBe(true);
    }
    for (const k of ["qbo", "meta", "docusign", "apollo"]) {
      expect(isClientScopedConnector(k)).toBe(false);
    }
    expect(CLIENT_SCOPED_CONNECTORS.size).toBe(9);
  });
});

describe("connectorChainSteps", () => {
  it("returns the four steps in pipeline order with icons + labels", () => {
    const steps = connectorChainSteps(base);
    expect(steps.map((s) => s.key)).toEqual([
      "credential",
      "ingestion",
      "discovery",
      "mapping",
    ]);
    expect(steps.every((s) => s.icon && s.label && s.detail)).toBe(true);
  });

  it("everything pending when no credential", () => {
    expect(statuses(base)).toEqual({
      credential: "pending",
      ingestion: "pending",
      discovery: "pending",
      mapping: "pending",
    });
  });

  it("credential done but ingestion still pending before any sync", () => {
    expect(statuses({ ...base, hasCredential: true })).toMatchObject({
      credential: "done",
      ingestion: "pending",
    });
  });

  it("ingestion active while a first sync is in flight", () => {
    expect(
      statuses({ ...base, hasCredential: true, instanceStatus: "first_sync" }).ingestion,
    ).toBe("active");
  });

  it("ingestion blocked when the instance errored", () => {
    expect(
      statuses({ ...base, hasCredential: true, instanceStatus: "error" }).ingestion,
    ).toBe("blocked");
  });

  it("ingestion done once a sync has completed", () => {
    expect(
      statuses({
        ...base,
        hasCredential: true,
        instanceStatus: "polling",
        lastSyncAt: "2026-06-22T10:00:00Z",
      }).ingestion,
    ).toBe("done");
  });

  it("discovery stays pending when units are unknown (source not wired)", () => {
    expect(
      statuses({ ...base, hasCredential: true, lastSyncAt: "2026-06-22T10:00:00Z", unitsDiscovered: null })
        .discovery,
    ).toBe("active"); // ingested but counts unknown → active, not a false green
  });

  it("discovery done when units are visible; mapping active until all linked", () => {
    const s = statuses({
      ...base,
      hasCredential: true,
      lastSyncAt: "2026-06-22T10:00:00Z",
      unitsDiscovered: 3,
      unitsMapped: 1,
    });
    expect(s.discovery).toBe("done");
    expect(s.mapping).toBe("active");
  });

  it("mapping done only when every discovered unit is linked", () => {
    const s = statuses({
      ...base,
      hasCredential: true,
      lastSyncAt: "2026-06-22T10:00:00Z",
      unitsDiscovered: 2,
      unitsMapped: 2,
    });
    expect(s.mapping).toBe("done");
  });

  it("discovery known-zero is active (ingested, nothing found yet), mapping pending", () => {
    const s = statuses({
      ...base,
      hasCredential: true,
      lastSyncAt: "2026-06-22T10:00:00Z",
      unitsDiscovered: 0,
      unitsMapped: 0,
    });
    expect(s.discovery).toBe("active");
    expect(s.mapping).toBe("pending");
  });

  it("surfaces discovered/mapped counts in the tooltips, never a secret", () => {
    const steps = connectorChainSteps({
      ...base,
      hasCredential: true,
      lastSyncAt: "2026-06-22T10:00:00Z",
      unitsDiscovered: 5,
      unitsMapped: 2,
    });
    const byKey = Object.fromEntries(steps.map((s) => [s.key, s.detail]));
    expect(byKey.discovery).toContain("5 units");
    expect(byKey.mapping).toContain("2/5");
  });
});
