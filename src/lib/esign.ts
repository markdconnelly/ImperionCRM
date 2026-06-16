/**
 * Presentation helpers for the e-signature status surface on the proposal /
 * contract detail (ADR-0071, #395). Pure data + formatting — safe to import from
 * a server or client component, and unit-tested in `esign.test.ts`.
 *
 * The surface reads `EsignEnvelopeRow` (silver `esign_envelope`, migration 0113)
 * via `crm.listEsignEnvelopesForProposal()` and shows the envelope status badge,
 * the per-signer states, and a signed-document affordance when the envelope is
 * `completed` and a signed PDF exists. This is label + tone mapping only — no
 * row-level data is shaped here, and (per the accessor) the raw signed-PDF blob
 * URI is never exposed to the client, only the `hasSignedPdf` flag.
 *
 * The send (backend, JWT/Key Vault — ADR-0034/0042) and the status webhook
 * (pipeline DocuSign Connect — ADR-0012) are dormant until DocuSign consent lands
 * (#318/#392); until then the reader returns an empty list and the surface shows
 * an honest empty state. The envelope is the source of record for signature state;
 * ADR-0019 owns the proposal lifecycle enum, separately.
 */
import type { EsignEnvelopeRow } from "@/types";

export type EsignStatus = EsignEnvelopeRow["status"];

export interface StatusMeta {
  label: string;
  /** Tailwind text-token class (globals.css palette). */
  tone: string;
  /** lucide-react icon name (resolved by <Icon/>). */
  icon: string;
  /** A terminal/non-actionable state — render the badge muted-prominent. */
  terminal: boolean;
}

/**
 * Envelope lifecycle (ADR-0071 decision 3): created → sent → delivered →
 * completed | declined | voided. Tone maps to the dark-theme tokens
 * (accent / green / amber / red / dim) in globals.css.
 */
const STATUS_META: Record<EsignStatus, StatusMeta> = {
  created: { label: "Created", tone: "text-dim", icon: "FileText", terminal: false },
  sent: { label: "Sent for signature", tone: "text-accent", icon: "Send", terminal: false },
  delivered: { label: "Delivered", tone: "text-accent", icon: "MailCheck", terminal: false },
  completed: { label: "Signed", tone: "text-green", icon: "CheckCircle2", terminal: true },
  declined: { label: "Declined", tone: "text-red", icon: "XCircle", terminal: true },
  voided: { label: "Voided", tone: "text-amber", icon: "Ban", terminal: true },
};

const UNKNOWN_STATUS: StatusMeta = {
  label: "Unknown",
  tone: "text-dim",
  icon: "HelpCircle",
  terminal: false,
};

/** Map an envelope status to its badge label / tone / icon. Unknown → safe default. */
export function esignStatusMeta(status: string): StatusMeta {
  return STATUS_META[status as EsignStatus] ?? UNKNOWN_STATUS;
}

/** True when the envelope is signed AND a signed document is retrievable (ADR-0071 decision 5). */
export function hasSignedDocument(env: EsignEnvelopeRow): boolean {
  return env.status === "completed" && env.hasSignedPdf;
}

/**
 * A normalized signer extracted defensively from the `recipients` jsonb
 * (ADR-0071 sketch — signer order/role/status as jsonb, grows without a
 * migration). Every field is optional in the payload, so each is coalesced.
 */
export interface SignerState {
  name: string | null;
  role: string | null;
  status: string | null;
  order: number | null;
  meta: StatusMeta;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Normalize the envelope's recipients into ordered signer states. Tolerant of a
 * heterogeneous DocuSign payload: missing fields coalesce to null, signers sort
 * by routing `order` (nulls last), and the per-signer status reuses the envelope
 * status-meta map so a signer badge tones the same way as the envelope badge.
 */
export function signerStates(env: EsignEnvelopeRow): SignerState[] {
  return env.recipients
    .map((r) => {
      const status = str(r.status);
      return {
        name: str(r.name) ?? str(r.email),
        role: str(r.role),
        status,
        order: num(r.order),
        meta: status ? esignStatusMeta(status) : UNKNOWN_STATUS,
      };
    })
    .sort((a, b) => {
      if (a.order == null && b.order == null) return 0;
      if (a.order == null) return 1;
      if (b.order == null) return -1;
      return a.order - b.order;
    });
}

/** The envelope a detail surface should headline: the newest (accessor sorts created DESC). */
export function activeEnvelope(envelopes: EsignEnvelopeRow[]): EsignEnvelopeRow | null {
  return envelopes[0] ?? null;
}
