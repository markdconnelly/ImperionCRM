"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { PollFrequency } from "@/components/integrations/poll-frequency";
import { credentialCardState } from "@/lib/integrations/credential-card-state";
import {
  providerIsPollable,
  type CompanyProvider,
} from "@/lib/integrations/company-providers";
import type { ConnectionRow } from "@/types";

const STATUS_TONE: Record<string, string> = {
  active: "text-green",
  pending: "text-amber",
  expired: "text-amber",
  revoked: "text-red",
  error: "text-red",
};

/**
 * One company system's credential card (ADR-0036). Renders either a write-only
 * credential form or the GDAP admin-consent button. Stored secrets are NEVER shown
 * — only the Key Vault reference and status. Re-submitting rotates the credential.
 */
export function CompanyCredentialCard({
  provider,
  connection,
  saveAction,
  gdapAction,
  disconnectAction,
  pollAction,
  refreshAction,
  refreshable = false,
}: {
  provider: CompanyProvider;
  connection: ConnectionRow | null;
  saveAction: (formData: FormData) => void | Promise<void>;
  gdapAction: (formData: FormData) => void | Promise<void>;
  disconnectAction: (formData: FormData) => void | Promise<void>;
  pollAction: (formData: FormData) => void | Promise<void>;
  /** On-demand pipeline sync (pipeline ADR-0011); only rendered when `refreshable`. */
  refreshAction?: (formData: FormData) => void | Promise<void>;
  refreshable?: boolean;
}) {
  const configured = connection != null;
  // A row with a failed/never-completed save must not hide the entry form (#176).
  const { stored, defaultOpen, statusLabel } = credentialCardState(connection);
  const [open, setOpen] = useState(defaultOpen);
  // Poll cadence + on-demand refresh are only meaningful for polled sources (#531,
  // ADR-0038 / pollDue()); consent/OAuth providers (QBO, GDAP) have nothing polling them.
  const pollable = providerIsPollable(provider);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-panel-2 text-dim">
            <Icon name={provider.icon} size={15} />
          </div>
          <div>
            <p className="text-sm font-medium text-text">{provider.label}</p>
            <p className="text-xs text-dim">{statusLabel}</p>
          </div>
        </div>
        {configured && (
          <span className={`text-xs font-medium ${STATUS_TONE[connection.status] ?? "text-dim"}`}>
            {connection.status}
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed text-dim">{provider.description}</p>

      {configured && (
        <dl className="flex flex-col gap-0.5 text-[11px] text-dim">
          <div className="flex justify-between gap-2">
            <dt>Key Vault</dt>
            <dd className="truncate font-mono">{connection.keyvaultSecretRef ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Configured</dt>
            <dd>{connection.connectedAt ?? "—"}</dd>
          </div>
        </dl>
      )}

      {configured && pollable && (
        <PollFrequency
          connectionId={connection.id}
          value={connection.pollIntervalMinutes}
          action={pollAction}
        />
      )}

      {configured && pollable && refreshable && refreshAction && (
        <form action={refreshAction}>
          <input type="hidden" name="provider" value={provider.key} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:border-accent hover:text-text"
            title="Pull fresh data from this source now (bypasses the poll cadence)"
          >
            <Icon name="RefreshCw" size={14} />
            Refresh now
          </button>
        </form>
      )}

      {/* Consent / OAuth-connect flow (GDAP admin consent, QuickBooks OAuth) — no secret fields */}
      {provider.kind === "consent" ? (
        <form action={gdapAction} className="flex items-center gap-3">
          <input type="hidden" name="provider" value={provider.key} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:border-accent hover:text-text"
          >
            <Icon name={provider.key === "qbo" ? "Plug" : "ShieldCheck"} size={14} />
            {provider.key === "qbo"
              ? configured
                ? "Reconnect QuickBooks"
                : "Connect QuickBooks"
              : configured
                ? "Re-grant admin consent"
                : "Grant admin consent"}
          </button>
        </form>
      ) : stored && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="self-start rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:border-accent hover:text-text"
        >
          Rotate credential
        </button>
      ) : (
        <form action={saveAction} className="flex flex-col gap-2.5">
          <input type="hidden" name="provider" value={provider.key} />
          {provider.fields?.map((f) => (
            <label key={f.name} className="flex flex-col gap-1 text-xs text-dim">
              <span>
                {f.label}
                {f.required && <span className="text-red"> *</span>}
              </span>
              {f.type === "select" ? (
                <select
                  name={f.name}
                  required={f.required}
                  defaultValue=""
                  className="rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.secret ? "password" : "text"}
                  name={f.name}
                  required={f.required}
                  autoComplete="off"
                  placeholder={
                    f.secret && stored ? "•••••••• (stored — enter to rotate)" : f.placeholder
                  }
                  className="rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
                />
              )}
              {f.help && <span className="text-[10px] text-dim">{f.help}</span>}
            </label>
          ))}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm text-text hover:bg-accent/20"
            >
              <Icon name="Save" size={14} />
              {stored ? "Rotate credential" : "Save credential"}
            </button>
            {stored && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-dim hover:text-text"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {configured && (
        <form action={disconnectAction} className="border-t border-border pt-2">
          <input type="hidden" name="id" value={connection.id} />
          <button type="submit" className="text-xs text-dim hover:text-red">
            Remove credential
          </button>
        </form>
      )}
    </div>
  );
}
