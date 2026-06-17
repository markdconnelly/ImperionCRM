"use client";

import { useMemo, useState } from "react";
import type { ContactRow, SegmentMemberRow, SegmentDetail } from "@/types";
import { parseSegmentRule, previewRuleMembers } from "@/lib/segment";
import { addSegmentMembersAction, removeSegmentMemberAction, materializeRuleAction } from "./actions";

const inputCls =
  "rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none";

/**
 * Member management for a segment detail page (#421). Three add paths over one contact
 * list (manual single, bulk multi-select, rule preview→materialize) + per-row remove. All
 * mutations post to the server actions (gate re-enforced server-side); the client only
 * filters/selects already-loaded contacts. Already-members are excluded from the picker so
 * the idempotent add never shows a contact twice.
 */
export function MemberManager({
  segment,
  members,
  contacts,
  canWrite,
}: {
  segment: SegmentDetail;
  members: SegmentMemberRow[];
  contacts: ContactRow[];
  canWrite: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const memberContactIds = useMemo(
    () => new Set(members.map((m) => m.contactId)),
    [members],
  );

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts
      .filter((c) => !memberContactIds.has(c.id))
      .filter(
        (c) =>
          q.length === 0 ||
          c.fullName.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.account ?? "").toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [contacts, memberContactIds, query]);

  const rulePreview = useMemo(() => {
    if (segment.type !== "rule") return [];
    const rule = parseSegmentRule(segment.ruleJson);
    return previewRuleMembers(rule, contacts).filter((c) => !memberContactIds.has(c.id));
  }, [segment, contacts, memberContactIds]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Current members */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">
          Members <span className="text-dim">({members.length})</span>
        </h2>
        {members.length === 0 ? (
          <p className="rounded-md border border-border bg-panel p-4 text-sm text-dim">
            No members yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border bg-panel">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="font-medium">{m.contactName}</span>
                {m.contactEmail && <span className="text-dim">{m.contactEmail}</span>}
                {m.account && <span className="text-dim">· {m.account}</span>}
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-dim">
                  {m.source}
                </span>
                {canWrite && (
                  <form action={removeSegmentMemberAction} className="ml-auto">
                    <input type="hidden" name="memberId" value={m.id} />
                    <input type="hidden" name="segmentId" value={segment.id} />
                    <button
                      type="submit"
                      className="text-xs text-dim transition-colors hover:text-red"
                    >
                      Remove
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canWrite && segment.type === "rule" && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Rule preview</h2>
          <p className="text-sm text-dim">
            {rulePreview.length} contact{rulePreview.length === 1 ? "" : "s"} match this rule and
            are not yet members.
          </p>
          {rulePreview.length > 0 && (
            <form action={materializeRuleAction}>
              <input type="hidden" name="segmentId" value={segment.id} />
              <button
                type="submit"
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
              >
                Add {rulePreview.length} matched contact{rulePreview.length === 1 ? "" : "s"}
              </button>
            </form>
          )}
        </section>
      )}

      {canWrite && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Add contacts</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts by name, email, or account…"
            className={inputCls}
          />
          {candidates.length === 0 ? (
            <p className="text-sm text-dim">No matching contacts.</p>
          ) : (
            <form action={addSegmentMembersAction} className="flex flex-col gap-2">
              <input type="hidden" name="segmentId" value={segment.id} />
              <ul className="max-h-72 divide-y divide-border overflow-auto rounded-md border border-border bg-panel">
                {candidates.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      name="contactId"
                      value={c.id}
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                    <span className="font-medium">{c.fullName}</span>
                    {c.email && <span className="text-dim">{c.email}</span>}
                    {c.account && <span className="text-dim">· {c.account}</span>}
                  </li>
                ))}
              </ul>
              <button
                type="submit"
                disabled={selected.size === 0}
                className="self-start rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-40"
              >
                Add {selected.size > 0 ? selected.size : ""}{" "}
                {selected.size === 1 ? "contact" : "contacts"}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
