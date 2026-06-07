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
 * Current consent per channel, derived from the append-only ledger (ADR-0014). Drives
 * the send/ad gates. Channels with no event show as "unknown" (treated as no consent).
 */
export function ConsentPanel({ current }: { current: CurrentConsentRow[] }) {
  const byChannel = new Map(current.map((c) => [c.channel, c]));
  return (
    <ul className="flex flex-col gap-1.5">
      {ALL_CHANNELS.map((ch) => {
        const row = byChannel.get(ch);
        const state = row?.state;
        const tone =
          state === "opt_in" ? "text-green" : state === "opt_out" ? "text-red" : "text-dim";
        const label = state === "opt_in" ? "Opt-in" : state === "opt_out" ? "Opt-out" : "Unknown";
        return (
          <li key={ch} className="flex items-center justify-between text-sm">
            <span className="text-dim">{CHANNEL_LABEL[ch] ?? ch}</span>
            <span className={`text-xs font-medium ${tone}`}>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
