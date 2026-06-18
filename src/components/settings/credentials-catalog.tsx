import type { ConnectionRow } from "@/types";

/**
 * Credentials catalog (ADR-0103, #905) — the governed view of every Key Vault credential
 * the system custodies, grouped by scope. Renders each connection's Key Vault secret NAME
 * (`keyvaultSecretRef`) + scope + provider + linked account + auth method + status. It
 * NEVER renders a secret value — the token/secret lives only in Key Vault (CLAUDE.md §5).
 */

const SCOPE_LABEL: Record<string, string> = {
  user: "Personal",
  company: "Company",
  client: "Client",
};

const SCOPE_STYLE: Record<string, string> = {
  client: "border-accent/40 bg-accent/10 text-accent",
  company: "border-accent-2/40 bg-accent-2/10 text-accent-2",
  user: "border-border bg-panel-2 text-dim",
};

const STATUS_STYLE: Record<string, string> = {
  active: "text-green",
  pending: "text-amber",
  expired: "text-amber",
  revoked: "text-red",
  error: "text-red",
};

function ScopeBadge({ scope }: { scope: string }) {
  const style = SCOPE_STYLE[scope] ?? SCOPE_STYLE.user;
  return (
    <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${style}`}>
      {SCOPE_LABEL[scope] ?? scope}
    </span>
  );
}

export function CredentialsCatalog({ connections }: { connections: ConnectionRow[] }) {
  if (connections.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-panel p-6 text-sm text-dim">
        No credentials registered yet. Connections appear here as employees connect personal
        accounts, admins configure company systems, and client tenants are onboarded.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-dim">
        Every custodied credential, by scope. The Key Vault secret <strong>name</strong> is
        shown for traceability — secret <strong>values are never displayed</strong> (they live
        only in Key Vault). Naming standard:{" "}
        <code className="font-mono text-[11px] text-text">
          conn-&lt;scope&gt;-&lt;provider&gt;[-&lt;tenant|user&gt;]
        </code>
        .
      </p>
      <div className="overflow-hidden rounded-xl border border-border bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-dim">
              <th className="px-3 py-2 font-medium">Key Vault secret name</th>
              <th className="px-3 py-2 font-medium">Scope</th>
              <th className="px-3 py-2 font-medium">Provider</th>
              <th className="px-3 py-2 font-medium">Account / owner</th>
              <th className="px-3 py-2 font-medium">Auth</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((c) => (
              <tr key={c.id} className="border-t border-border align-top">
                <td className="px-3 py-2">
                  <div className="font-mono text-xs text-text">{c.keyvaultSecretRef ?? "—"}</div>
                  {c.displayName ? (
                    <div className="text-xs text-dim">{c.displayName}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <ScopeBadge scope={c.scope} />
                </td>
                <td className="px-3 py-2 text-text">{c.provider}</td>
                <td className="px-3 py-2 text-text">
                  {c.accountName ?? c.owner ?? <span className="text-dim">—</span>}
                </td>
                <td className="px-3 py-2 text-text">
                  {c.authMethod
                    ? c.authMethod === "certificate"
                      ? `cert${c.certThumbprint ? ` · ${c.certThumbprint}` : ""}`
                      : "secret"
                    : <span className="text-dim">OAuth</span>}
                </td>
                <td className={`px-3 py-2 ${STATUS_STYLE[c.status] ?? "text-dim"}`}>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
