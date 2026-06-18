"use client";

import { useEffect, useRef, useState } from "react";
import type { TicketRow } from "@/types";
import { formatTicketLabel, ticketRefValue } from "@/lib/tickets/ticket-label";
import { searchTicketsAction } from "@/components/tickets/actions";

// Autotask ticket-link picker (#852). A searchable typeahead over the locally-synced
// silver `ticket` (no live Autotask call) that emits the ticket NUMBER as the stored
// `ticket_ref` (mirrors website_expense_item.ticket_ref). Degrades gracefully: the box
// is also a plain text field, so a known ticket number works even if search returns
// nothing (offline-safe). Reusable — manual mileage (#853) is the first consumer.

const inputClass =
  "w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none";

type Props = {
  /** Hidden field name submitted with the form (the stored ticket_ref). */
  name?: string;
  /** Pre-filled ticket ref (edit/restore). */
  defaultValue?: string;
  /** Optional silver account id to scope the search. */
  accountId?: string;
  /** Visible field label. */
  label?: string;
  /** Mark the underlying input required. */
  required?: boolean;
};

export function TicketPicker({
  name = "ticketRef",
  defaultValue = "",
  accountId,
  label = "Ticket",
  required = false,
}: Props) {
  const [text, setText] = useState(defaultValue);
  const [results, setResults] = useState<TicketRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = text.trim();
    if (!q && !accountId) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const rows = await searchTicketsAction(q, accountId);
        setResults(rows);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, accountId]);

  function select(t: TicketRow) {
    setText(ticketRefValue(t));
    setPicked(formatTicketLabel(t));
    setOpen(false);
  }

  return (
    <label className="block">
      <span className="mb-1 block text-xs text-dim">{label}</span>
      <div className="relative">
        <input type="hidden" name={name} value={text} />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPicked(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search number, title, or account…"
          autoComplete="off"
          required={required}
          className={inputClass}
        />
        {open && (text.trim() || accountId) && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-panel-2 shadow-lg">
            {loading && <div className="px-2 py-1.5 text-xs text-dim">Searching…</div>}
            {!loading && results.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-dim">
                No matching tickets — the typed value is kept as-is.
              </div>
            )}
            {results.map((t) => (
              <button
                key={t.id}
                type="button"
                // onMouseDown (not onClick) so the pick lands before the input blur closes the list.
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(t);
                }}
                className="block w-full truncate px-2 py-1.5 text-left text-sm text-text hover:bg-panel"
              >
                {formatTicketLabel(t)}
              </button>
            ))}
          </div>
        )}
      </div>
      {picked && <span className="mt-1 block text-xs text-green">Linked: {picked}</span>}
    </label>
  );
}
