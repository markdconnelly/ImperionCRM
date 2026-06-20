"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { Field, Select, TextInput } from "@/components/ui/form";
import type { Option } from "@/lib/data/repositories";
import type { ClientCredentialResult } from "@/app/(app)/settings/actions";

const inputClass =
  "w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none disabled:opacity-60";

/**
 * Register a managed client's per-console UniFi credential (#964, ADR-0103 / backend
 * #229/#233) — the api-key twin of the client-M365 form. The admin links an account, names
 * the console/site, picks the API family (Console → on-prem Network Integration API at a
 * controller host | Cloud → UniFi's hosted API), supplies the controller host when it's a
 * console, and pastes the API key. On submit the server action hands the key to the backend,
 * which custodies it in Key Vault and writes the connection row — the value is entered once
 * and NEVER re-rendered, stored in this DB, or logged (CLAUDE.md §5). The non-secret
 * connectionType/controllerHost land on `connection.provider_config`. The catalog renders
 * names/ids only.
 */
export function ClientUnifiCredentialForm({
  accounts,
  canSubmit,
  sourceNote,
  registerAction,
}: {
  accounts: Option[];
  /** Backend reachable — registration can actually custody + write. */
  canSubmit: boolean;
  /** Degradation notice ('' when live). */
  sourceNote: string;
  registerAction: (formData: FormData) => Promise<ClientCredentialResult>;
}) {
  const [connectionType, setConnectionType] = useState<"console" | "cloud">("console");
  const [result, setResult] = useState<ClientCredentialResult | null>(null);
  const [pending, startTransition] = useTransition();

  const editable = canSubmit && !pending;

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const r = await registerAction(formData);
      setResult(r);
      if (r.ok) {
        // Clear the form on success — re-rendering the key would defeat write-only entry.
        const el = document.getElementById("client-unifi-form");
        if (el instanceof HTMLFormElement) el.reset();
        setConnectionType("console");
      }
    });
  }

  const resultTone =
    result == null
      ? ""
      : result.tone === "green"
        ? "border-green/40 text-green"
        : result.tone === "amber"
          ? "border-amber/40 text-amber"
          : "border-red/40 text-red";

  return (
    <section className="rounded-xl border border-border bg-panel p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-tight">
          Register a client UniFi console
        </h3>
        <span className="flex items-center gap-1 text-[11px] text-dim">
          <Icon name="KeyRound" size={12} />
          api-key (ADR-0103)
        </span>
      </div>
      <p className="mb-4 text-sm text-dim">
        Each managed client&apos;s UniFi console authenticates by API key. The key is custodied
        in Key Vault by the backend and <strong>never stored here</strong>. Re-submitting the
        same console rotates the key in place.
      </p>

      {accounts.length === 0 ? (
        <p className="rounded-lg border border-border bg-panel-2 p-3 text-xs text-amber">
          No accounts yet — create the managed customer account first, then link a credential.
        </p>
      ) : (
        <form id="client-unifi-form" action={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Linked account (the managed customer)">
              <Select name="accountId" required disabled={!editable} defaultValue="">
                <option value="" disabled>
                  Select an account…
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Display name (optional)">
              <TextInput
                name="displayName"
                disabled={!editable}
                placeholder="e.g. Contoso — UniFi HQ"
                maxLength={200}
              />
            </Field>
            <Field label="Console / site id">
              <TextInput
                name="consoleId"
                required
                disabled={!editable}
                placeholder="e.g. default-site-01"
                autoComplete="off"
                maxLength={64}
              />
            </Field>
          </div>

          <fieldset disabled={!editable}>
            <legend className="mb-2 text-xs text-dim">Connection type</legend>
            <div className="flex flex-wrap gap-2">
              {(["console", "cloud"] as const).map((t) => {
                const active = connectionType === t;
                return (
                  <label
                    key={t}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
                      active
                        ? "border-accent bg-panel-2"
                        : "border-border bg-panel-2/50 hover:border-accent/50"
                    } ${editable ? "" : "cursor-default opacity-80"}`}
                  >
                    <input
                      type="radio"
                      name="connectionType"
                      value={t}
                      checked={active}
                      onChange={() => setConnectionType(t)}
                      className="sr-only"
                    />
                    <span className="text-sm text-text capitalize">{t}</span>
                    {active && <Icon name="Check" size={13} className="text-accent" />}
                  </label>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-dim">
              {connectionType === "console"
                ? "On-prem Network Integration API on the customer console — needs the controller host."
                : "UniFi's hosted Site Manager API (api.ui.com) — no host needed."}
            </p>
          </fieldset>

          {connectionType === "console" && (
            <Field label="Controller host (the console hostname / IP)">
              <TextInput
                name="controllerHost"
                required
                disabled={!editable}
                placeholder="e.g. unifi.contoso.local"
                autoComplete="off"
                maxLength={255}
              />
            </Field>
          )}

          <Field label="API key (write-only — custodied in Key Vault, never shown again)">
            <input
              type="password"
              name="apiKey"
              required
              disabled={!editable}
              placeholder="Paste the UniFi API key"
              autoComplete="off"
              className={inputClass}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!editable}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
            >
              {pending ? "Registering…" : "Register console"}
            </button>
            {pending && (
              <span className="flex items-center gap-2 text-xs text-accent">
                <Icon name="Loader2" size={14} className="animate-spin" />
                Custodying the API key in Key Vault…
              </span>
            )}
            {!pending && !canSubmit && sourceNote && (
              <span className="text-xs text-amber">{sourceNote}</span>
            )}
          </div>
        </form>
      )}

      {result && !pending && (
        <div className={`mt-4 rounded-lg border bg-panel-2 p-3 ${resultTone}`}>
          <div className="flex items-center gap-2 text-sm">
            <Icon
              name={
                result.tone === "green"
                  ? "CheckCircle2"
                  : result.tone === "amber"
                    ? "AlertTriangle"
                    : "XCircle"
              }
              size={14}
            />
            {result.message}
          </div>
        </div>
      )}
    </section>
  );
}
