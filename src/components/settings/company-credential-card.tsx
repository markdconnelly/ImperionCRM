"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { PollFrequency } from "@/components/integrations/poll-frequency";
import { HealthDot } from "@/components/integrations/health-dot";
import { credentialCardState } from "@/lib/integrations/credential-card-state";
import {
  providerIsPollable,
  type CompanyProvider,
} from "@/lib/integrations/company-providers";
import type { HealthVerdict } from "@/lib/integrations/connection-health";
import type { CapabilitySummary } from "@/lib/integrations/ingest-summary";
import type { DocusignTestResult, DocusignTestTone } from "@/lib/integrations/docusign-test";
import type { ConnectionRow } from "@/types";

const TEST_TONE: Record<DocusignTestTone, string> = {
  green: "text-green",
  amber: "text-amber",
  red: "text-red",
  dim: "text-dim",
};

/**
 * One company system's credential card (ADR-0036). Renders either a write-only
 * credential form or the consent-connect button (QBO). Stored secrets are NEVER shown
 * — only the Key Vault reference and status. Re-submitting rotates the credential.
 * A `provider.adminConsent` credential (DocuSign, #862) renders BOTH: the secret
 * form AND a separate "Grant admin consent" button (`consentAction`).
 */
export function CompanyCredentialCard({
  provider,
  connection,
  health,
  capabilities,
  saveAction,
  connectAction,
  disconnectAction,
  pollAction,
  refreshAction,
  refreshable = false,
  consentAction,
  testAction,
}: {
  provider: CompanyProvider;
  connection: ConnectionRow | null;
  /** Inferred health verdict (server-computed, ADR-0122 S2); null when no manifest/health. */
  health?: HealthVerdict | null;
  /** What this connector ingests/writes/enriches, from its manifest (ADR-0122 S2). */
  capabilities?: CapabilitySummary | null;
  saveAction: (formData: FormData) => void | Promise<void>;
  /** Consent-connect action for a `kind: "consent"` provider (QuickBooks OAuth). */
  connectAction: (formData: FormData) => void | Promise<void>;
  disconnectAction: (formData: FormData) => void | Promise<void>;
  pollAction: (formData: FormData) => void | Promise<void>;
  /** On-demand pipeline sync (pipeline ADR-0011); only rendered when `refreshable`. */
  refreshAction?: (formData: FormData) => void | Promise<void>;
  refreshable?: boolean;
  /** Admin-consent action for an `adminConsent` credential provider (DocuSign). */
  consentAction?: (formData: FormData) => void | Promise<void>;
  /** Live readiness probe for an `adminConsent` provider (DocuSign, #867). */
  testAction?: () => Promise<DocusignTestResult>;
}) {
  const configured = connection != null;
  // A row with a failed/never-completed save must not hide the entry form (#176).
  const { stored, defaultOpen, statusLabel } = credentialCardState(connection);
  const [open, setOpen] = useState(defaultOpen);
  // Poll cadence + on-demand refresh are only meaningful for polled sources (#531,
  // ADR-0038 / pollDue()); consent/OAuth providers (QBO) have nothing polling them.
  const pollable = providerIsPollable(provider);
  // DocuSign's store writes each field to its own Key Vault secret, so a stored secret
  // can be rotated one-at-a-time. The generic providers store ONE JSON blob, so a partial
  // submit would clobber the unentered fields — they must always re-enter everything.
  const partialRotation = provider.adminConsent === true;
  // Live "Test connection" probe state (#867) — calls the backend status endpoint
  // through the server action and renders the mapped result inline on the card.
  const [testResult, setTestResult] = useState<DocusignTestResult | null>(null);
  const [testing, startTest] = useTransition();

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
        {health ? (
          <HealthDot health={health} />
        ) : (
          configured && <span className="text-xs font-medium text-dim">{connection.status}</span>
        )}
      </div>

      <p className="text-xs leading-relaxed text-dim">{provider.description}</p>

      {/* What this connector pulls in — highlights the ingested items (ADR-0122 S2). */}
      {capabilities && capabilities.ingests.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[11px]">
          <span className="font-medium text-dim">Ingests</span>
          {capabilities.ingests.map((n) => (
            <span
              key={n}
              className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-[10px] text-dim"
            >
              {n}
            </span>
          ))}
        </div>
      )}
      {capabilities && capabilities.ingests.length === 0 && capabilities.enriches.length > 0 && (
        <p className="text-[11px] text-dim">
          <span className="font-medium">Enriches:</span> {capabilities.enriches.join(", ")}
        </p>
      )}

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

      {/* Consent / OAuth-connect flow (QuickBooks OAuth) — no secret fields */}
      {provider.kind === "consent" ? (
        <form action={connectAction} className="flex items-center gap-3">
          <input type="hidden" name="provider" value={provider.key} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:border-accent hover:text-text"
          >
            <Icon name="Plug" size={14} />
            {configured ? "Reconnect QuickBooks" : "Connect QuickBooks"}
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
              ) : f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  required={f.required && !(stored && partialRotation)}
                  rows={4}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={
                    f.secret && stored ? "•••••••• (stored — paste to rotate)" : f.placeholder
                  }
                  className="rounded-md border border-border bg-panel-2 px-2.5 py-1.5 font-mono text-xs text-text outline-none focus:border-accent"
                />
              ) : (
                <input
                  type={f.secret ? "password" : "text"}
                  name={f.name}
                  required={f.required && !(f.secret && stored && partialRotation)}
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

      {/* DocuSign-style credential that ALSO needs a one-time admin grant (#862) — the
          form above stores the secrets; this grants JWT impersonation consent. */}
      {provider.adminConsent && consentAction && (
        <form action={consentAction} className="border-t border-border pt-2">
          <input type="hidden" name="provider" value={provider.key} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:border-accent hover:text-text"
            title="Open DocuSign to grant the one-time admin impersonation consent (per environment)"
          >
            <Icon name="ShieldCheck" size={14} />
            Grant admin consent
          </button>
        </form>
      )}

      {/* Live readiness probe (#867) — calls the backend status endpoint via the web
          app's managed identity (boundary-clean) and verifies a token actually mints. */}
      {provider.adminConsent && testAction && (
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            disabled={testing}
            onClick={() => startTest(async () => setTestResult(await testAction()))}
            className="inline-flex items-center gap-1.5 self-start rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:border-accent hover:text-text disabled:opacity-50"
            title="Call the backend and verify DocuSign admin consent + token mint"
          >
            <Icon
              name={testing ? "Loader2" : "PlugZap"}
              size={14}
              className={testing ? "animate-spin" : undefined}
            />
            {testing ? "Testing…" : "Test connection"}
          </button>
          {testResult && (
            <p className={`text-xs leading-relaxed ${TEST_TONE[testResult.tone]}`}>
              <span className="font-medium">{testResult.label}.</span>{" "}
              <span className="text-dim">{testResult.detail}</span>
              {testResult.consentUrl && (
                <>
                  {" "}
                  <a
                    href={testResult.consentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline hover:text-text"
                  >
                    Grant consent
                  </a>
                </>
              )}
            </p>
          )}
        </div>
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
