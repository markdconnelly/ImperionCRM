import { Icon } from "@/components/ui/icon";
import { PollFrequency } from "@/components/integrations/poll-frequency";
import type { ConnectionRow } from "@/types";

const PROVIDER_META: Record<string, { label: string; icon: string }> = {
  m365: { label: "Microsoft 365", icon: "Mail" },
  google: { label: "Google", icon: "Globe" },
  youtube: { label: "YouTube", icon: "Youtube" },
  linkedin: { label: "LinkedIn", icon: "Linkedin" },
  facebook: { label: "Facebook", icon: "Facebook" },
  plaud: { label: "Plaud", icon: "Mic" },
  autotask: { label: "Autotask", icon: "Ticket" },
  itglue: { label: "IT Glue", icon: "BookText" },
  apollo: { label: "Apollo", icon: "Sparkles" },
};

const STATUS_TONE: Record<string, string> = {
  active: "text-green",
  expired: "text-amber",
  revoked: "text-red",
  error: "text-red",
};

export function ConnectionCard({
  connection,
  disconnectAction,
  pollAction,
}: {
  connection: ConnectionRow;
  disconnectAction: (formData: FormData) => void | Promise<void>;
  pollAction: (formData: FormData) => void | Promise<void>;
}) {
  const meta = PROVIDER_META[connection.provider] ?? { label: connection.provider, icon: "Plug" };
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-panel-2 text-dim">
            <Icon name={meta.icon} size={15} />
          </div>
          <div>
            <p className="text-sm font-medium text-text">{meta.label}</p>
            {connection.displayName && (
              <p className="text-xs text-dim">{connection.displayName}</p>
            )}
          </div>
        </div>
        <span className={`text-xs font-medium ${STATUS_TONE[connection.status] ?? "text-dim"}`}>
          {connection.status}
        </span>
      </div>

      {connection.scopes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {connection.scopes.map((s) => (
            <span key={s} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-dim">
              {s}
            </span>
          ))}
        </div>
      )}

      <dl className="mt-1 flex flex-col gap-0.5 text-[11px] text-dim">
        {connection.owner && (
          <div className="flex justify-between gap-2">
            <dt>Owner</dt>
            <dd className="text-text">{connection.owner}</dd>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <dt>Key Vault</dt>
          <dd className="truncate font-mono">{connection.keyvaultSecretRef ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Last sync</dt>
          <dd>{connection.lastSync ?? "never"}</dd>
        </div>
      </dl>

      <PollFrequency
        connectionId={connection.id}
        value={connection.pollIntervalMinutes}
        action={pollAction}
      />

      <form action={disconnectAction} className="mt-1">
        <input type="hidden" name="id" value={connection.id} />
        <button type="submit" className="text-xs text-dim hover:text-red">
          Disconnect
        </button>
      </form>
    </div>
  );
}
