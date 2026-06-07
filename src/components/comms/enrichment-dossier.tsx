import { lawfulBasisTone } from "@/lib/comms";
import type { EnrichmentFactRow } from "@/types";

/**
 * The contact-360 enrichment dossier (ADR-0025): one row per discovered fact, each
 * showing confidence, source, and lawful basis so *why* we hold it is visible.
 */
export function EnrichmentDossier({ facts }: { facts: EnrichmentFactRow[] }) {
  if (facts.length === 0) {
    return (
      <p className="text-sm text-dim">
        No enrichment yet — facts arrive from connected accounts and agent enrichment.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {facts.map((f) => (
        <li key={f.id} className="rounded-md border border-border bg-panel-2 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-wide text-dim">
              {f.attributeKey.replace(/_/g, " ")}
            </span>
            <span className={`text-[11px] ${lawfulBasisTone(f.lawfulBasis)}`}>
              {f.lawfulBasis.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-text">{f.value ?? "—"}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-dim">
            {f.confidence != null && (
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-1 w-10 overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full bg-accent"
                    style={{ width: `${Math.round(f.confidence * 100)}%` }}
                  />
                </span>
                {Math.round(f.confidence * 100)}%
              </span>
            )}
            {f.sourceConnection ? (
              <span className="text-accent">· via {f.sourceConnection}</span>
            ) : (
              f.source && <span>· {f.source}</span>
            )}
            {f.observedAt && <span>· {f.observedAt}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
