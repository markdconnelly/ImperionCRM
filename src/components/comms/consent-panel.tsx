import type { CurrentConsentRow } from "@/types";

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  call_recording: "Call recording",
  data_enrichment: "Data enrichment",
  ad_targeting: "Ad targeting",
};

const ALL_CHANNELS = ["email", "sms", "call_recording", "data_enrichment", "ad_targeting"];

/**
 * Per-contact consent, derived from the append-only ledger (ADR-0014). Each
 * channel is a boolean toggle: ON = current opt-in, OFF = opt-out / no event.
 * Toggling appends a new opt_in/opt_out event via `action` (history is never
 * mutated). These gates drive outbound sends and ad targeting.
 */
export function ConsentPanel({
  current,
  contactId,
  action,
}: {
  current: CurrentConsentRow[];
  contactId: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const byChannel = new Map(current.map((c) => [c.channel, c]));
  return (
    <ul className="flex flex-col gap-2">
      {ALL_CHANNELS.map((ch) => {
        const state = byChannel.get(ch)?.state;
        const optedIn = state === "opt_in";
        const next = optedIn ? "opt_out" : "opt_in";
        const statusLabel = optedIn ? "Opt-in" : state === "opt_out" ? "Opt-out" : "Unknown";
        return (
          <li key={ch} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <span className="text-dim">{CHANNEL_LABEL[ch] ?? ch}</span>
              <span
                className={`ml-2 text-[11px] ${
                  optedIn ? "text-green" : state === "opt_out" ? "text-red" : "text-dim"
                }`}
              >
                {statusLabel}
              </span>
            </div>
            <form action={action}>
              <input type="hidden" name="contactId" value={contactId} />
              <input type="hidden" name="channel" value={ch} />
              <input type="hidden" name="state" value={next} />
              <button
                type="submit"
                role="switch"
                aria-checked={optedIn}
                title={`Set ${next === "opt_in" ? "opt-in" : "opt-out"} for ${CHANNEL_LABEL[ch] ?? ch}`}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  optedIn ? "bg-green" : "bg-panel-2 border border-border"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    optedIn ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
