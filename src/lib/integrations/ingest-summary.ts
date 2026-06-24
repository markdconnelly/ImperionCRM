/**
 * Capability summary for a connector card (ADR-0122, epic #1256 S2). Turns a connector
 * manifest's `verb:noun` capabilities (connector-manifest.ts) into readable, grouped noun
 * lists so a card can show "Ingests: tickets · companies" — highlighting exactly what each
 * connection pulls in (the user's "highlight all of the items being ingested").
 *
 * PURE / edge-safe: no pg, no node:*, no env.
 */

/** A capability noun, humanized (`ingest:credential-exposures` → "credential exposures"). */
function nounOf(capability: string): string {
  const noun = capability.includes(":") ? capability.slice(capability.indexOf(":") + 1) : capability;
  return noun.replace(/-/g, " ");
}

export interface CapabilitySummary {
  /** What the connector pulls into bronze→silver (`ingest:*`). */
  ingests: string[];
  /** What it pushes back to the source (`write:*`). */
  writes: string[];
  /** What it augments on existing records (`enrich:*`). */
  enriches: string[];
}

/**
 * Group a manifest's capabilities by verb into humanized noun lists. Unknown verbs are
 * ignored (forward-compatible: a new verb won't crash the card, it just won't render).
 */
export function describeCapabilities(capabilities: readonly string[]): CapabilitySummary {
  const summary: CapabilitySummary = { ingests: [], writes: [], enriches: [] };
  for (const cap of capabilities) {
    const noun = nounOf(cap);
    if (cap.startsWith("ingest:")) summary.ingests.push(noun);
    else if (cap.startsWith("write:")) summary.writes.push(noun);
    else if (cap.startsWith("enrich:")) summary.enriches.push(noun);
  }
  return summary;
}
