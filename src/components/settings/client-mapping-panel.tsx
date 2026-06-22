import type { Account, ClientMappingUnit } from "@/types";
import {
  suggestAccountForUnit,
  type ClientMappingAdapter,
} from "@/lib/integrations/client-mapping";

function AccountSelect({ accounts }: { accounts: Account[] }) {
  return (
    <select
      name="accountId"
      required
      defaultValue=""
      className="rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
    >
      <option value="" disabled>
        Select account…
      </option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}

/**
 * Client Mapping admin surface (ADR-0112, epic #1141). Reusable across connectors — the
 * `adapter` carries the connector's labels + source_system. Server-rendered: every mutation is a
 * plain form posting to a server action, so the settings:write gate stays server-side and writes
 * go through the backend (the web role is SELECT-only on entity_xref, migration 0160). Each
 * accepted suggestion or manual override is recorded `match_method='manual'`; automatic
 * resolution stays the backend resolver's job (epic #1049).
 */
export function ClientMappingPanel({
  adapter,
  units,
  accounts,
  linkAction,
  unlinkAction,
}: {
  adapter: ClientMappingAdapter;
  units: ClientMappingUnit[];
  accounts: Account[];
  linkAction: (formData: FormData) => void | Promise<void>;
  unlinkAction: (formData: FormData) => void | Promise<void>;
}) {
  const mapped = units.filter((u) => u.mappedAccountId);
  const unmapped = units.filter((u) => !u.mappedAccountId);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-display text-sm font-semibold tracking-tight">
          {adapter.label} client mapping
        </h3>
        <p className="mt-0.5 text-sm text-dim">
          Link each {adapter.label} {adapter.unitNoun} to its Imperion account. Accept a suggested
          match or pick one manually — every link is admin-curated (never guessed), and the
          resolver treats it as authoritative (ADR-0112).
        </p>
      </div>

      {unmapped.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber/40 bg-panel p-4">
          <p className="text-sm font-medium text-text">
            Unmapped {adapter.unitNoun}s <span className="text-amber">({unmapped.length})</span>
          </p>
          <p className="text-xs text-dim">
            These {adapter.unitNoun}s have no account link — they stay invisible on account pages
            until mapped.
          </p>
          <ul className="flex flex-col gap-2">
            {unmapped.map((u) => {
              const suggestion = suggestAccountForUnit(u.name, accounts);
              return (
                <li
                  key={u.sourceKey}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-panel-2 px-3 py-2"
                >
                  <span className="flex flex-col">
                    <span className="text-sm text-text">{u.name}</span>
                    <span className="font-mono text-[11px] text-dim">{u.sourceKey}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {suggestion && (
                      <form action={linkAction}>
                        <input type="hidden" name="connector" value={adapter.connector} />
                        <input type="hidden" name="sourceKey" value={u.sourceKey} />
                        <input type="hidden" name="accountId" value={suggestion.id} />
                        <button
                          type="submit"
                          title={`Accept suggested match: ${suggestion.name}`}
                          className="rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm text-text hover:bg-accent/20"
                        >
                          Accept “{suggestion.name}”
                        </button>
                      </form>
                    )}
                    <form action={linkAction} className="flex items-center gap-2">
                      <input type="hidden" name="connector" value={adapter.connector} />
                      <input type="hidden" name="sourceKey" value={u.sourceKey} />
                      <AccountSelect accounts={accounts} />
                      <button
                        type="submit"
                        className="rounded-md border border-border bg-panel px-3 py-1.5 text-sm text-text hover:border-accent"
                      >
                        Map
                      </button>
                    </form>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-border bg-panel p-4">
        <p className="mb-2 text-sm font-medium text-text">Mapped {adapter.unitNoun}s</p>
        {mapped.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-dim">
                  <th className="py-1.5 pr-4 font-medium">{adapter.label} {adapter.unitNoun}</th>
                  <th className="py-1.5 pr-4 font-medium">Account</th>
                  <th className="py-1.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {mapped.map((u) => (
                  <tr key={u.sourceKey} className="border-t border-border">
                    <td className="py-2 pr-4">
                      <span className="text-text">{u.name}</span>{" "}
                      <span className="font-mono text-[11px] text-dim">{u.sourceKey}</span>
                    </td>
                    <td className="py-2 pr-4">{u.mappedAccountName ?? "—"}</td>
                    <td className="py-2 text-right">
                      <form action={unlinkAction}>
                        <input type="hidden" name="connector" value={adapter.connector} />
                        <input type="hidden" name="sourceKey" value={u.sourceKey} />
                        <button type="submit" className="text-xs text-dim hover:text-red">
                          Unlink
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-dim">
            No {adapter.unitNoun}s mapped yet. Map one above as its bronze hydrates.
          </p>
        )}
      </div>
    </section>
  );
}
