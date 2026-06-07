import type { ConsentEventRow, CurrentConsentRow } from "@/types";

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  call_recording: "Call recording",
  data_enrichment: "Data enrichment",
  ad_targeting: "Ad targeting",
};

const ALL_CHANNELS = ["email", "sms", "call_recording", "data_enrichment", "ad_targeting"];

/** Current consent summary chips + the append-only event history. */
export function ConsentLedger({
  current,
  events,
}: {
  current: CurrentConsentRow[];
  events: ConsentEventRow[];
}) {
  const byChannel = new Map(current.map((c) => [c.channel, c]));
  return (
    <div className="flex flex-col gap-4">
      {/* Derived current state */}
      <div className="flex flex-wrap gap-2">
        {ALL_CHANNELS.map((ch) => {
          const state = byChannel.get(ch)?.state;
          const tone =
            state === "opt_in"
              ? "border-green/40 text-green"
              : state === "opt_out"
                ? "border-red/40 text-red"
                : "border-border text-dim";
          const label = state === "opt_in" ? "opt-in" : state === "opt_out" ? "opt-out" : "unknown";
          return (
            <span
              key={ch}
              className={`rounded-full border px-2.5 py-1 text-xs ${tone}`}
            >
              {CHANNEL_LABEL[ch] ?? ch}: {label}
            </span>
          );
        })}
      </div>

      {/* Append-only history */}
      <div className="rounded-lg border border-border bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Channel</th>
              <th className="px-4 py-2 font-medium">State</th>
              <th className="px-4 py-2 font-medium">Lawful basis</th>
              <th className="px-4 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-4 py-2.5 tabular-nums text-dim">{e.occurredAt ?? "—"}</td>
                <td className="px-4 py-2.5">{CHANNEL_LABEL[e.channel] ?? e.channel}</td>
                <td className={`px-4 py-2.5 ${e.state === "opt_in" ? "text-green" : "text-red"}`}>
                  {e.state === "opt_in" ? "Opt-in" : "Opt-out"}
                </td>
                <td className="px-4 py-2.5 text-dim">{e.lawfulBasis.replace(/_/g, " ")}</td>
                <td className="px-4 py-2.5 text-dim">{e.source ?? "—"}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-dim">
                  No consent events recorded for this contact yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
