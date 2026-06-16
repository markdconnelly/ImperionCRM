"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { CI_TYPE_LABEL, CI_TYPE_ICON, CI_TYPES, ciKey } from "@/lib/cmdb/ci";
import type { CiType, ConfigurationItem } from "@/types";

/**
 * The CMDB CI register (#645) — client-side list + filter over the union read-model.
 * The full CI set is projected server-side (staff already excluded); filtering by
 * type + account is purely presentational, so it runs in the browser for instant
 * response. Each row drills to `/cmdb/<type>/<id>`.
 */
export function CiRegister({ items }: { items: ConfigurationItem[] }) {
  const [ciType, setCiType] = useState<CiType | "">("");
  const [accountId, setAccountId] = useState<string>("");

  // Account filter options — distinct owning accounts present in the CI set.
  const accounts = useMemo(() => {
    const seen = new Map<string, string>();
    for (const i of items) {
      if (!seen.has(i.accountId)) seen.set(i.accountId, i.accountName ?? "—");
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (!ciType || i.ciType === ciType) &&
          (!accountId || i.accountId === accountId),
      ),
    [items, ciType, accountId],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-border bg-panel p-0.5">
          <button
            type="button"
            onClick={() => setCiType("")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              ciType === "" ? "bg-panel-2 text-text" : "text-dim hover:text-text"
            }`}
          >
            All types
          </button>
          {CI_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setCiType(t)}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                ciType === t ? "bg-panel-2 text-text" : "text-dim hover:text-text"
              }`}
            >
              <Icon name={CI_TYPE_ICON[t]} size={12} />
              {CI_TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <span className="ml-auto text-xs text-dim">
          {filtered.length} of {items.length} CI{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Register */}
      <div className="rounded-lg border border-border bg-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-dim">
                <th className="px-4 py-2 font-medium">CI</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">Key attributes</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-dim">
                    No configuration items{items.length > 0 ? " match the filters" : " yet"}.
                  </td>
                </tr>
              ) : (
                filtered.map((ci) => (
                  <tr
                    key={ciKey(ci)}
                    className="border-t border-border/60 hover:bg-panel-2"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/cmdb/${ci.ciType}/${ci.ciId}`}
                        className="flex items-center gap-2 font-medium text-text hover:text-accent"
                      >
                        <Icon name={CI_TYPE_ICON[ci.ciType]} size={14} className="text-dim" />
                        {ci.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-dim">{CI_TYPE_LABEL[ci.ciType]}</td>
                    <td className="px-4 py-2 text-dim">{ci.accountName ?? "—"}</td>
                    <td className="px-4 py-2 text-dim">
                      <span className="line-clamp-1">
                        {ci.attributes.map((a) => `${a.label}: ${a.value}`).join(" · ")}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/cmdb/${ci.ciType}/${ci.ciId}`}
                        className="text-xs text-dim hover:text-accent"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
