"use client";

import { useMemo, useState } from "react";
import {
  CHANGE_TYPES,
  CHANGE_TYPE_LABEL,
} from "@/lib/change";
import { CI_TYPE_LABEL, ciKey } from "@/lib/cmdb/ci";
import type {
  ChangeRequestDetail,
  ChangeType,
  ConfigurationItem,
} from "@/types";

/** A pickable account ({id, name}); mirrors the repositories' `Option`. */
interface AccountOption {
  id: string;
  name: string;
}

const inputCls =
  "rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none";

/**
 * Change create/edit form (#656). A server-action <form> for the working object
 * (type / title / description / account) plus an affected-CI picker sourced from the
 * CMDB register (#645): each CI is a checkbox posting `affectedCi` = `ciType:ciId`,
 * filterable by a search box. The risk/approval/schedule fields are NOT here — the
 * downstream slices (#658/#659/#660) own them. For edit, the caller passes `hiddenId`.
 */
export function ChangeForm({
  action,
  cis,
  accounts,
  initial,
  initialAffectedKeys,
  submitLabel,
  hiddenId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  cis: ConfigurationItem[];
  accounts: AccountOption[];
  initial?: ChangeRequestDetail;
  /** `ciType:ciId` keys already linked (edit), pre-checking the picker. */
  initialAffectedKeys?: string[];
  submitLabel: string;
  hiddenId?: string;
}) {
  const [type, setType] = useState<ChangeType>(initial?.changeType ?? "normal");
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(initialAffectedKeys ?? []),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cis;
    return cis.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        (c.accountName ?? "").toLowerCase().includes(q) ||
        CI_TYPE_LABEL[c.ciType].toLowerCase().includes(q),
    );
  }, [cis, query]);

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      {hiddenId && <input type="hidden" name="id" value={hiddenId} />}

      <fieldset className="flex flex-col gap-1 text-sm">
        <span className="text-dim">Change type</span>
        <div className="flex flex-col gap-1.5">
          {CHANGE_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="changeType"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
              />
              <span>{CHANGE_TYPE_LABEL[t]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-dim">Title</span>
        <input name="title" defaultValue={initial?.title ?? ""} required className={inputCls} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-dim">Description</span>
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={3}
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-dim">Account (optional)</span>
        <select name="accountId" defaultValue={initial?.accountId ?? ""} className={inputCls}>
          <option value="">— Estate-wide / none —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2 rounded-md border border-border bg-panel p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-dim">
            Affected configuration items
            {checked.size > 0 ? ` (${checked.size} selected)` : ""}
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter CIs…"
            className={`${inputCls} w-48`}
          />
        </div>

        {cis.length === 0 ? (
          <p className="text-xs text-dim">
            No configuration items available. The CMDB register is empty or not yet applied.
          </p>
        ) : (
          <ul className="max-h-64 overflow-y-auto rounded border border-border">
            {filtered.map((c) => {
              const key = ciKey(c);
              return (
                <li
                  key={key}
                  className="flex items-center gap-2 border-b border-border px-2 py-1.5 last:border-0"
                >
                  <input
                    type="checkbox"
                    name="affectedCi"
                    value={key}
                    checked={checked.has(key)}
                    onChange={() => toggle(key)}
                  />
                  <span className="font-medium">{c.displayName}</span>
                  <span className="rounded border border-border px-1 py-0.5 text-[10px] uppercase text-dim">
                    {CI_TYPE_LABEL[c.ciType]}
                  </span>
                  {c.accountName && <span className="text-xs text-dim">· {c.accountName}</span>}
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-2 py-1.5 text-xs text-dim">No CIs match “{query}”.</li>
            )}
          </ul>
        )}
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
