import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { EsignEnvelopeRow } from "@/types";
import {
  activeEnvelope,
  esignStatusMeta,
  hasSignedDocument,
  signerStates,
} from "@/lib/esign";

/**
 * The e-signature status surface on the proposal / contract detail (ADR-0071,
 * #395). Headlines the active envelope's status badge, lists the per-signer
 * states, and offers a signed-document affordance when the envelope is signed
 * (`completed`) and a signed PDF exists. Read-only: the DocuSign send is a
 * backend process (JWT/Key Vault, ADR-0034/0042) and status arrives via the
 * pipeline Connect webhook (ADR-0012) — both dormant until DocuSign consent lands
 * (#318/#392). So this degrades to an honest empty/unwired state and never fails
 * the page (the readers return [] when migration 0113 is unapplied or no envelope
 * has been sent; `proposal.esign_status` may be null until the backend sends).
 *
 * The envelope is the source of record for signature state; ADR-0019 owns the
 * proposal lifecycle enum (proposal.status), separately.
 */
export function SignatureStatusPanel({
  envelopes,
  emptyHint = "No signature requested yet. Sending a proposal for signature is a backend process (DocuSign) — it wires when DocuSign consent lands.",
}: {
  envelopes: EsignEnvelopeRow[];
  emptyHint?: string;
}) {
  const active = activeEnvelope(envelopes);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-text">Signature</h2>
        <span className="text-[11px] text-dim">DocuSign e-signature (ADR-0071)</span>
      </div>

      {active == null ? (
        <div className="rounded-lg border border-border bg-panel px-4 py-6 text-center text-sm text-dim">
          {emptyHint}
        </div>
      ) : (
        <SignatureCard envelope={active} priorCount={envelopes.length - 1} />
      )}
    </section>
  );
}

function SignatureCard({
  envelope,
  priorCount,
}: {
  envelope: EsignEnvelopeRow;
  priorCount: number;
}) {
  const meta = esignStatusMeta(envelope.status);
  const signers = signerStates(envelope);
  const canDownload = hasSignedDocument(envelope);

  return (
    <div className="rounded-lg border border-border bg-panel-2 p-3">
      {/* Header: status badge · provider · timestamps */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded border border-border px-2 py-0.5 font-medium",
            meta.tone,
          )}
        >
          <Icon name={meta.icon} size={12} />
          {meta.label}
        </span>
        <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-dim">
          {envelope.provider === "docusign" ? "DocuSign" : envelope.provider}
        </span>
        {envelope.sentAt && <span className="text-dim">Sent {envelope.sentAt}</span>}
        {envelope.completedAt && (
          <span className="text-dim">Completed {envelope.completedAt}</span>
        )}
        {priorCount > 0 && (
          <span className="text-[11px] text-dim">
            +{priorCount} earlier {priorCount === 1 ? "attempt" : "attempts"}
          </span>
        )}
      </div>

      {/* Per-signer states */}
      {signers.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
          {signers.map((s, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2">
                {s.order != null && (
                  <span className="text-[11px] text-dim">{s.order}.</span>
                )}
                <span className="truncate text-text">{s.name ?? "Signer"}</span>
                {s.role && <span className="text-[11px] text-dim">· {s.role}</span>}
              </span>
              <span className={cn("flex items-center gap-1.5 font-medium", s.meta.tone)}>
                <Icon name={s.meta.icon} size={12} />
                {s.meta.label}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Signed-document affordance (only when completed + a signed PDF exists) */}
      {canDownload && (
        <div className="mt-3 border-t border-border pt-3">
          <a
            href={`/api/proposals/esign/${envelope.id}/document`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
          >
            <Icon name="FileDown" size={12} />
            Signed document
          </a>
          <p className="mt-1 text-[11px] text-dim">
            Retrieval is served by the backend from secured storage (ADR-0071) —
            available when the signed-document fetch is wired.
          </p>
        </div>
      )}
    </div>
  );
}
