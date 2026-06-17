"use client";

import { Icon } from "@/components/ui/icon";
import {
  groupCatalogByCategory,
  cadenceLabel,
  STATUS_LABEL,
  STATUS_TONE,
  type ConnectorCatalogEntry,
  type StatusTone,
} from "@/lib/integrations/connector-catalog";
import {
  enableConnectorAction,
  setConnectorCadenceAction,
  disableConnectorAction,
} from "@/app/(app)/connectors/actions";

/** Status-badge classes per tone (matches the app's dark token palette). */
const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-border bg-panel-2 text-dim",
  pending: "border-amber/40 bg-amber/10 text-amber",
  active: "border-green/40 bg-green/10 text-green",
  error: "border-red/40 bg-red/10 text-red",
};

function StatusBadge({ entry }: { entry: ConnectorCatalogEntry }) {
  const tone = STATUS_TONE[entry.status];
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]}`}
    >
      {STATUS_LABEL[entry.status]}
    </span>
  );
}

/** A short non-secret display of the last health probe, if present. */
function healthSummary(health: Record<string, unknown>): string | null {
  const msg = health?.message ?? health?.state;
  return typeof msg === "string" && msg.trim() ? msg : null;
}

function ConnectorCard({ entry }: { entry: ConnectorCatalogEntry }) {
  const { manifest, instance, connected, effectiveCadenceMinutes } = entry;
  const health = instance ? healthSummary(instance.health) : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4">
      <div className="flex items-start gap-3">
        <span className="rounded-md border border-border bg-panel-2 p-2 text-accent">
          <Icon name={manifest.icon} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-text">{manifest.label}</h3>
            <StatusBadge entry={entry} />
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-dim">{manifest.description}</p>
        </div>
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1">
        {manifest.capabilities.map((c) => (
          <span
            key={c}
            className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-[10px] text-dim"
          >
            {c}
          </span>
        ))}
      </div>

      {/* Facts */}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-dim">Auth</dt>
        <dd className="text-text">{manifest.authType}</dd>
        <dt className="text-dim">Poll cadence</dt>
        <dd className="text-text">{cadenceLabel(effectiveCadenceMinutes)}</dd>
        <dt className="text-dim">Maps to</dt>
        <dd className="truncate text-text">{manifest.identityMap.join(", ")}</dd>
        {instance && (
          <>
            <dt className="text-dim">Last sync</dt>
            <dd className="text-text">
              {instance.lastSyncAt
                ? instance.lastSyncAt.slice(0, 16).replace("T", " ")
                : "—"}
            </dd>
          </>
        )}
        {health && (
          <>
            <dt className="text-dim">Health</dt>
            <dd className="truncate text-text">{health}</dd>
          </>
        )}
      </dl>

      {/* Controls */}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        {!connected ? (
          <form action={enableConnectorAction}>
            <input type="hidden" name="connectorKey" value={manifest.key} />
            <button
              type="submit"
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90"
            >
              Enable
            </button>
          </form>
        ) : (
          <>
            <form action={setConnectorCadenceAction} className="flex items-center gap-1">
              <input type="hidden" name="id" value={instance!.id} />
              <input
                type="number"
                name="cadenceOverrideMinutes"
                min={0}
                defaultValue={instance!.cadenceOverrideMinutes ?? ""}
                placeholder="default"
                title="Override poll cadence (minutes); blank = manifest default"
                className="w-20 rounded-md border border-border bg-panel px-2 py-1 text-xs text-text outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-md border border-border bg-panel-2 px-2.5 py-1 text-xs text-text transition-colors hover:border-accent"
              >
                Set cadence
              </button>
            </form>
            <form action={disableConnectorAction} className="ml-auto">
              <input type="hidden" name="id" value={instance!.id} />
              <button
                type="submit"
                className="rounded-md border border-border px-2.5 py-1 text-xs text-dim transition-colors hover:border-red hover:text-red"
              >
                Disable
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The connector catalog grid (#416). Browses every manifest joined to its instance,
 * grouped by category. Enable/configure/disable post to the `settings:write`-gated
 * server actions. No credential is collected here — see the page-level notice.
 */
export function ConnectorCatalog({ entries }: { entries: ConnectorCatalogEntry[] }) {
  const groups = groupCatalogByCategory(entries);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-2 rounded-md border border-border bg-panel-2 px-3 py-2 text-xs text-dim">
        <Icon name="ShieldCheck" size={13} className="mt-0.5 shrink-0 text-accent" />
        <span>
          Enabling records the connector lifecycle; the backend completes the connect and
          custodies credentials in Key Vault (no secret is stored here). Provide credentials
          under{" "}
          <span className="text-text">Settings → Company credentials</span>.
        </span>
      </div>

      {groups.map((group) => (
        <section key={group.category} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-dim">
            {group.category}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.entries.map((entry) => (
              <ConnectorCard key={entry.manifest.key} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
