"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { credentialCardState } from "@/lib/integrations/credential-card-state";
import type { PlatformProvider } from "@/lib/integrations/platform-providers";
import type { ConnectionRow } from "@/types";
import type { PlatformCredentialResult } from "@/app/(app)/settings/actions";

const TONE_CLASS: Record<PlatformCredentialResult["tone"], string> = {
  green: "text-green",
  amber: "text-amber",
  red: "text-red",
};

/**
 * The platform-key card (ADR-0129, #1400) — seed/rotate a system-wide AI provider key (Voyage /
 * Anthropic) from the admin-only Connections page. Write-ONLY: it shows provider · last-set ·
 * validation status and NEVER the value. There is no account picker, no poll cadence, no mapping
 * (a platform credential is custody-only). On submit the backend validates the key with one cheap
 * live call and writes it to Key Vault only on success (validate-before-write); the key never
 * touches the browser-visible state beyond the in-flight form field.
 */
export function PlatformCredentialCard({
  provider,
  connection,
  action,
}: {
  provider: PlatformProvider;
  /** The persisted `scope='platform'` connection row, or null when not yet configured. */
  connection: ConnectionRow | null;
  action: (formData: FormData) => Promise<PlatformCredentialResult>;
}) {
  // Vault presence drives "configured" (no re-prompt of a stored key) — same rule as the
  // company-credential cards (#1567): a canonical ref or a stored status counts as configured.
  const { stored, defaultOpen, statusLabel } = credentialCardState(connection);
  const [open, setOpen] = useState(defaultOpen);
  const [result, setResult] = useState<PlatformCredentialResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const r = await action(formData);
      setResult(r);
      if (r.ok && r.tone === "green") setOpen(false); // collapse on a validated save
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-panel p-4">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-panel-2 text-dim">
          <Icon name={provider.icon} size={15} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">{provider.label}</p>
          <p className="text-xs text-dim">{statusLabel}</p>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-dim">{provider.description}</p>

      {connection && (
        <dl className="flex flex-col gap-0.5 text-[11px] text-dim">
          <div className="flex justify-between gap-2">
            <dt>Key Vault</dt>
            <dd className="truncate font-mono">{connection.keyvaultSecretRef ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Last set</dt>
            <dd>{connection.connectedAt ?? "—"}</dd>
          </div>
        </dl>
      )}

      <div className="border-t border-border/60 pt-3">
        {stored && !open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="self-start rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:border-accent hover:text-text"
          >
            Rotate key
          </button>
        ) : (
          <form action={onSubmit} className="flex flex-col gap-2.5">
            <input type="hidden" name="provider" value={provider.key} />
            <label className="flex flex-col gap-1 text-xs text-dim">
              <span>
                {provider.fieldLabel}
                <span className="text-red"> *</span>
              </span>
              <input
                type="password"
                name="apiKey"
                required
                autoComplete="off"
                placeholder={stored ? "•••••••• (stored — enter to rotate)" : undefined}
                className="rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
              />
              <span className="text-[10px] text-dim">{provider.help}</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm text-text hover:bg-accent/20 disabled:opacity-50"
              >
                <Icon
                  name={pending ? "Loader2" : "Save"}
                  size={14}
                  className={pending ? "animate-spin" : undefined}
                />
                {pending ? "Validating…" : stored ? "Rotate key" : "Save key"}
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
        {result && (
          <p className={`mt-2 text-xs leading-relaxed ${TONE_CLASS[result.tone]}`}>
            {result.message}
          </p>
        )}
      </div>
    </div>
  );
}
