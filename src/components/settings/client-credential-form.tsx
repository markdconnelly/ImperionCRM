"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { Field, Select, TextInput } from "@/components/ui/form";
import type { Option } from "@/lib/data/repositories";
import type { ClientCredentialResult } from "@/app/(app)/settings/actions";

const inputClass =
  "w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none disabled:opacity-60";

/**
 * Register a managed client tenant's per-tenant M365 app credential (#950, ADR-0103 /
 * backend #217). Per-client-app model: each client tenant has its OWN Entra app
 * registration (distinct app/client id + its own secret or certificate). The admin links
 * an account, enters the tenant id + app (client) id, picks an auth method
 * (Secret default | Certificate→thumbprint), and supplies the credential. On submit the
 * server action hands the material to the backend, which custodies the secret in Key
 * Vault and writes the connection row — the value is entered once and NEVER re-rendered,
 * stored in this DB, or logged (CLAUDE.md §5). The catalog below renders names/ids only.
 */
export function ClientCredentialForm({
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
  const [authMethod, setAuthMethod] = useState<"secret" | "certificate">("secret");
  const [result, setResult] = useState<ClientCredentialResult | null>(null);
  const [pending, startTransition] = useTransition();

  const editable = canSubmit && !pending;

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const r = await registerAction(formData);
      setResult(r);
      if (r.ok) {
        // Clear the form on success — re-rendering the secret would defeat write-only entry.
        const el = document.getElementById("client-cred-form");
        if (el instanceof HTMLFormElement) el.reset();
        setAuthMethod("secret");
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
          Register a client M365 tenant
        </h3>
        <span className="flex items-center gap-1 text-[11px] text-dim">
          <Icon name="KeyRound" size={12} />
          per-client-app (ADR-0103)
        </span>
      </div>
      <p className="mb-4 text-sm text-dim">
        Each managed client tenant has its own Entra app registration. Enter the tenant&apos;s
        app (client) id and a credential; the secret is custodied in Key Vault by the backend
        and <strong>never stored here</strong>. Re-submitting the same tenant rotates the
        credential in place.
      </p>

      {accounts.length === 0 ? (
        <p className="rounded-lg border border-border bg-panel-2 p-3 text-xs text-amber">
          No accounts yet — create the managed customer account first, then link a credential.
        </p>
      ) : (
        <form id="client-cred-form" action={onSubmit} className="flex flex-col gap-4">
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
                placeholder="e.g. Contoso — M365"
                maxLength={200}
              />
            </Field>
            <Field label="Tenant id (GUID)">
              <TextInput
                name="tenantId"
                required
                disabled={!editable}
                placeholder="00000000-0000-0000-0000-000000000000"
                autoComplete="off"
              />
            </Field>
            <Field label="App (client) id (GUID)">
              <TextInput
                name="clientAppId"
                required
                disabled={!editable}
                placeholder="00000000-0000-0000-0000-000000000000"
                autoComplete="off"
              />
            </Field>
          </div>

          <fieldset disabled={!editable}>
            <legend className="mb-2 text-xs text-dim">Authentication method</legend>
            <div className="flex flex-wrap gap-2">
              {(["secret", "certificate"] as const).map((m) => {
                const active = authMethod === m;
                return (
                  <label
                    key={m}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
                      active
                        ? "border-accent bg-panel-2"
                        : "border-border bg-panel-2/50 hover:border-accent/50"
                    } ${editable ? "" : "cursor-default opacity-80"}`}
                  >
                    <input
                      type="radio"
                      name="authMethod"
                      value={m}
                      checked={active}
                      onChange={() => setAuthMethod(m)}
                      className="sr-only"
                    />
                    <span className="text-sm text-text capitalize">{m}</span>
                    {active && <Icon name="Check" size={13} className="text-accent" />}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {authMethod === "secret" ? (
            <Field label="Client secret (write-only — custodied in Key Vault, never shown again)">
              <input
                type="password"
                name="clientSecret"
                required
                disabled={!editable}
                placeholder="Paste the client secret value"
                autoComplete="off"
                className={inputClass}
              />
            </Field>
          ) : (
            <Field label="Certificate thumbprint (40-char hex SHA-1)">
              <TextInput
                name="certThumbprint"
                required
                disabled={!editable}
                placeholder="0123456789ABCDEF0123456789ABCDEF01234567"
                autoComplete="off"
              />
            </Field>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!editable}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
            >
              {pending ? "Registering…" : "Register credential"}
            </button>
            {pending && (
              <span className="flex items-center gap-2 text-xs text-accent">
                <Icon name="Loader2" size={14} className="animate-spin" />
                Custodying the credential in Key Vault…
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
