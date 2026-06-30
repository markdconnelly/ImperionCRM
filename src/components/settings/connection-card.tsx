"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { PollFrequency } from "@/components/integrations/poll-frequency";
import { HealthDot } from "@/components/integrations/health-dot";
import { RemoveCredentialButton } from "@/components/settings/remove-credential-button";
import { credentialCardState } from "@/lib/integrations/credential-card-state";
import { providerIsPollable, type CompanyProvider } from "@/lib/integrations/company-providers";
import type { ConnectionCardModel } from "@/lib/integrations/connection-cards";
import type { HealthVerdict } from "@/lib/integrations/connection-health";
import type { CapabilitySummary } from "@/lib/integrations/ingest-summary";
import {
  cadenceLabel,
  STATUS_LABEL,
  STATUS_TONE,
  type ConnectorCatalogEntry,
  type StatusTone,
} from "@/lib/integrations/connector-catalog";
import {
  type ChainStepStatus,
  type ConnectorChainStep,
} from "@/lib/integrations/connector-chain";
import type { DocusignTestResult, DocusignTestTone } from "@/lib/integrations/docusign-test";
import {
  enableConnectorAction,
  setConnectorCadenceAction,
  disableConnectorAction,
} from "@/app/(app)/connectors/actions";

const TEST_TONE: Record<DocusignTestTone, string> = {
  green: "text-green",
  amber: "text-amber",
  red: "text-red",
  dim: "text-dim",
};

/** Catalog status-badge classes per tone (dark token palette). */
const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-border bg-panel-2 text-dim",
  pending: "border-amber/40 bg-amber/10 text-amber",
  active: "border-green/40 bg-green/10 text-green",
  error: "border-red/40 bg-red/10 text-red",
};

function StatusBadge({ entry }: { entry: ConnectorCatalogEntry }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[STATUS_TONE[entry.status]]}`}
    >
      {STATUS_LABEL[entry.status]}
    </span>
  );
}

/** A flat row of scope chips (display/audit only — no secret material, ADR-0086). */
function ScopeChips({ scopes }: { scopes: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {scopes.map((s) => (
        <span
          key={s}
          className="rounded border border-border bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-dim"
        >
          {s}
        </span>
      ))}
    </div>
  );
}

/**
 * The granted scopes for a company credential. When the provider declares `scopeGroups`
 * (Meta = Social + Ads over the one `conn-company-meta` secret, ADR-0124 #7 / Datto
 * 2-cards/1-key precedent, ADR-0122) it renders as one labelled view PER GROUP over the
 * single credential; otherwise it shows the flat scope list. Either way it is metadata for
 * display/audit — there is exactly ONE Credential and ONE Key Vault secret.
 */
function ScopeViews({ provider }: { provider: CompanyProvider }) {
  if (provider.scopes.length === 0) return null;
  const groups = provider.scopeGroups;
  return (
    <div className="flex flex-col gap-1.5 text-[11px]">
      {groups && groups.length > 0 ? (
        <>
          <span className="font-medium text-dim">Scopes (one secret, {groups.length} views)</span>
          {groups.map((g) => (
            <div key={g.label} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text">
                {g.label}
              </span>
              {g.description && <span className="text-[10px] text-dim">{g.description}</span>}
              <ScopeChips scopes={g.scopes} />
            </div>
          ))}
        </>
      ) : (
        <>
          <span className="font-medium text-dim">Scopes</span>
          <ScopeChips scopes={provider.scopes} />
        </>
      )}
    </div>
  );
}

/** Chain-step badge classes per derived status (same palette as the catalog). */
const CHAIN_TONE: Record<ChainStepStatus, string> = {
  done: "border-green/40 bg-green/10 text-green",
  active: "border-amber/40 bg-amber/10 text-amber",
  pending: "border-border bg-panel-2 text-dim",
  blocked: "border-red/40 bg-red/10 text-red",
};

/** The 4-step client-mapping pipeline icons (credential · ingestion · discovery · mapping, E2 #1146). */
function ChainIcons({ steps }: { steps: ConnectorChainStep[] }) {
  return (
    <div className="flex items-center gap-1" aria-label="Client mapping pipeline status">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1">
          <span
            title={`${step.label}: ${step.detail}`}
            className={`flex h-6 w-6 items-center justify-center rounded-md border ${CHAIN_TONE[step.status]}`}
          >
            <Icon name={step.icon} size={12} />
          </span>
          {i < steps.length - 1 && <span className="h-px w-2 bg-border" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}

/**
 * The single connections-page card (ADR-0122 S5, #1269) — ONE card per connector, replacing
 * the two stacked grids (`CompanyCredentialCard` + the catalog `ConnectorCard`). It composes,
 * in one card, every affordance a connector needs based on which halves of its
 * {@link ConnectionCardModel} are present:
 *
 *   - **Credential** (when `model.provider`): write-only secret form / OAuth consent / rotate /
 *     admin-consent / Test connection / poll cadence / refresh / remove — secrets are custodied
 *     in Key Vault by the backend; only a reference lands on the row (CLAUDE.md §5).
 *   - **Catalog** (when `model.entry` and not planned): enable / disable / cadence override for
 *     the connector instance lifecycle.
 *   - **Client mapping** (when `model.clientScoped`): the 4-step chain + "Edit client mappings".
 *   - **Planned** (when `model.planned`): a non-enterable placeholder for an unbuilt source.
 */
export function ConnectionCard({
  model,
  health,
  tokenHealth,
  capabilities,
  chain,
  refreshable = false,
  mappingAdapterExists = false,
  saveAction,
  connectAction,
  disconnectAction,
  pollAction,
  refreshAction,
  consentAction,
  testAction,
}: {
  model: ConnectionCardModel;
  /** Inferred health verdict (server-computed, ADR-0122 S2). */
  health: HealthVerdict;
  /**
   * Token-expiry lifecycle verdict for a self-expiring OAuth token (Threads, FE #1502). When
   * present, the card surfaces issued/expires + a health badge and a pre-lapse warning. Absent for
   * connectors with no self-expiring token. FE only READS/surfaces — the secret-bearing 60-day
   * refresh job is a backend/LocalPipeline concern (CLAUDE.md §1/§5).
   */
  tokenHealth?: HealthVerdict;
  /** What the connector ingests/writes/enriches, from its manifest (null when no manifest). */
  capabilities: CapabilitySummary | null;
  /** The client-mapping pipeline steps (client-scoped connectors with a catalog entry). */
  chain?: ConnectorChainStep[];
  /** On-demand pipeline refresh is wired for this connector (pipeline ADR-0011). */
  refreshable?: boolean;
  /** A client-mapping adapter exists → show the "Edit client mappings" link (else it would 404). */
  mappingAdapterExists?: boolean;
  saveAction: (formData: FormData) => void | Promise<void>;
  /** Consent-connect action for a `kind: "consent"` provider (QuickBooks OAuth). */
  connectAction: (formData: FormData) => void | Promise<void>;
  disconnectAction: (formData: FormData) => void | Promise<void>;
  pollAction: (formData: FormData) => void | Promise<void>;
  refreshAction?: (formData: FormData) => void | Promise<void>;
  /** Admin-consent action for an `adminConsent` credential provider (DocuSign). */
  consentAction?: (formData: FormData) => void | Promise<void>;
  /** Live readiness probe for an `adminConsent` provider (DocuSign, #867). */
  testAction?: () => Promise<DocusignTestResult>;
}) {
  const { provider, connection, entry, planned, clientScoped } = model;
  const configured = connection != null;
  // A row with a failed/never-completed save must not hide the entry form (#176).
  const { stored, defaultOpen, statusLabel } = credentialCardState(connection);
  const [open, setOpen] = useState(defaultOpen);
  // Poll cadence + on-demand refresh are only meaningful for polled sources (#531, ADR-0038);
  // consent/OAuth (QBO) and send/consent (Meta/DocuSign) providers have nothing polling them.
  const pollable = provider ? providerIsPollable(provider) : false;
  // DocuSign writes each field to its own Key Vault secret (rotate one-at-a-time). Generic
  // providers store ONE JSON blob, so a partial submit would clobber the unentered fields.
  const partialRotation = provider?.adminConsent === true;
  // Live "Test connection" probe state (#867).
  const [testResult, setTestResult] = useState<DocusignTestResult | null>(null);
  const [testing, startTest] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-panel p-4">
      {/* Header — icon, label, lifecycle/Planned badge, inferred health dot */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-panel-2 text-dim">
            <Icon name={model.icon} size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-text">{model.label}</p>
              {planned ? (
                <span className="rounded-full border border-dim/40 bg-panel-2 px-2 py-0.5 text-[11px] font-medium text-dim">
                  Planned
                </span>
              ) : (
                entry && <StatusBadge entry={entry} />
              )}
            </div>
            {provider && <p className="text-xs text-dim">{statusLabel}</p>}
          </div>
        </div>
        {!planned && <HealthDot health={health} showLabel={false} className="mt-1 shrink-0" />}
      </div>

      <p className="text-xs leading-relaxed text-dim">{model.description}</p>

      {/* What this connector pulls in (ADR-0122 S2) */}
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

      {/* Granted scopes — grouped into card views when the provider declares scopeGroups
          (Meta Social / Meta Ads over the one secret, ADR-0124 #7 / Datto precedent ADR-0122). */}
      {provider && <ScopeViews provider={provider} />}

      {/* Catalog facts (auth / cadence / maps-to / last sync) — manifest-backed connectors only */}
      {entry && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <dt className="text-dim">Auth</dt>
          <dd className="text-text">{entry.manifest.authType}</dd>
          <dt className="text-dim">Poll cadence</dt>
          <dd className="text-text">{cadenceLabel(entry.effectiveCadenceMinutes)}</dd>
          <dt className="text-dim">Maps to</dt>
          <dd className="truncate text-text">{entry.manifest.identityMap.join(", ")}</dd>
          {entry.instance && (
            <>
              <dt className="text-dim">Last sync</dt>
              <dd className="text-text">
                {entry.instance.lastSyncAt
                  ? entry.instance.lastSyncAt.slice(0, 16).replace("T", " ")
                  : "—"}
              </dd>
            </>
          )}
        </dl>
      )}

      {/* ── Credential half (company-credential providers) ─────────────────────── */}
      {provider && (
        <div className="flex flex-col gap-2.5 border-t border-border/60 pt-3">
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
              {/* Self-expiring token lifecycle (FE #1502) — issued/expires + health badge. Shown
                  only for connectors whose token expires (tokenHealth passed). Timestamps only,
                  never the token (§5); degrades to "Expiry unknown" until the backend reports them. */}
              {tokenHealth && (
                <>
                  <div className="flex justify-between gap-2">
                    <dt>Token issued</dt>
                    <dd>{connection.tokenIssuedAt ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Token expires</dt>
                    <dd>{connection.tokenExpiresAt ?? "—"}</dd>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <dt>Token health</dt>
                    <dd>
                      <HealthDot health={tokenHealth} showLabel />
                    </dd>
                  </div>
                </>
              )}
            </dl>
          )}

          {/* Pre-lapse warning (FE #1502) — fires when the token is expiring soon or expired so an
              operator can reconnect / let the backend refresh job renew it before it lapses. */}
          {tokenHealth && (tokenHealth.tone === "amber" || tokenHealth.tone === "red") && (
            <p
              role="status"
              className={`flex items-start gap-1.5 rounded-md border bg-panel-2 px-2.5 py-1.5 text-[11px] leading-relaxed ${
                tokenHealth.tone === "red" ? "border-red/40 text-red" : "border-amber/40 text-amber"
              }`}
            >
              <Icon name="AlertTriangle" size={13} className="mt-0.5 shrink-0" />
              <span>
                <span className="font-medium">{tokenHealth.label}.</span>{" "}
                <span className="text-dim">{tokenHealth.detail}</span>
              </span>
            </p>
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

          {/* OAuth connect for a credential provider whose token is normally obtained via an
              authorization-code flow (Threads, #1500). The connect button is the NORMAL path;
              the break-glass paste form still renders below it. Mirrors the QBO consent button
              (backend /start → provider consent → /callback exchange), but keeps the fallback. */}
          {provider.oauthConnect && (
            <div className="flex flex-col gap-2">
              <form action={connectAction} className="flex items-center gap-3">
                <input type="hidden" name="provider" value={provider.key} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm text-text hover:bg-accent/20"
                  title="Sign in via the Instagram-anchored Threads login — the backend exchanges the code and custodies the token in Key Vault (the browser never holds it)"
                >
                  <Icon name="Plug" size={14} />
                  {configured
                    ? `Reconnect${provider.connectLabel ? provider.connectLabel.replace(/^Connect/, "") : ` ${provider.label}`}`
                    : (provider.connectLabel ?? `Connect ${provider.label}`)}
                </button>
              </form>
              <p className="text-[10px] leading-relaxed text-dim">
                Normal path. Separate from the Meta (Facebook / Instagram) connection — this is the
                Instagram-anchored Threads login. The manual fields below are a break-glass fallback.
              </p>
            </div>
          )}

          {/* Consent / OAuth-connect (QuickBooks) — no secret fields */}
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

          {/* DocuSign-style credential that ALSO needs a one-time admin grant (#862) */}
          {provider.adminConsent && consentAction && (
            <form action={consentAction}>
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

          {/* Live readiness probe (#867) */}
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
            <RemoveCredentialButton action={disconnectAction} connectionId={connection.id} />
          )}
        </div>
      )}

      {/* ── Client mapping chain — credential · ingestion · discovery · mapping (E2 #1146) ── */}
      {clientScoped && chain && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-dim">
              Client mapping
            </span>
            <ChainIcons steps={chain} />
          </div>
          {mappingAdapterExists && (
            <Link
              href={`/settings/client-mapping/${model.key}`}
              className="rounded-md border border-border bg-panel-2 px-2.5 py-1 text-xs text-text transition-colors hover:border-accent"
            >
              Edit client mappings
            </Link>
          )}
        </div>
      )}

      {/* ── Catalog lifecycle controls (manifest-backed connectors) ────────────── */}
      {entry &&
        (planned ? (
          <p className="flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-dim">
            <Icon name="Clock" size={13} />
            Planned — the backend store for this source isn&apos;t built yet.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            {!entry.connected ? (
              <form action={enableConnectorAction}>
                <input type="hidden" name="connectorKey" value={model.key} />
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
                  <input type="hidden" name="id" value={entry.instance!.id} />
                  <input
                    type="number"
                    name="cadenceOverrideMinutes"
                    min={0}
                    defaultValue={entry.instance!.cadenceOverrideMinutes ?? ""}
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
                  <input type="hidden" name="id" value={entry.instance!.id} />
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
        ))}
    </div>
  );
}
