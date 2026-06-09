"use client";

import { useState } from "react";
import type { SourceRecordRow } from "@/types";
import { Icon } from "@/components/ui/icon";

/** Human labels for the per-source bronze origins (ADR-0039). */
const SOURCE_LABEL: Record<string, string> = {
  website: "Website (manual)",
  imperion_crm_entered: "Imperion (manual)", // legacy key, pre-ADR-0039
  apollo: "Apollo",
  m365_synced: "Microsoft 365",
  autotask: "Autotask",
  itglue: "IT Glue",
  // Related local-pipeline bronze citations (migration 0038)
  autotask_contract: "Autotask contract",
  autotask_ticket: "Autotask ticket",
  itglue_doc: "IT Glue documentation",
};

function label(source: string): string {
  return SOURCE_LABEL[source] ?? source;
}

/**
 * Lists the source records that fed a unified contact/company (the "single view, sources
 * cited" model — pipeline ADR-0006) and lets the user open the raw payload in a popup.
 */
export function SourceRecords({ sources }: { sources: SourceRecordRow[] }) {
  const [open, setOpen] = useState<SourceRecordRow | null>(null);

  if (sources.length === 0) {
    return (
      <p className="text-sm text-dim">
        No source records yet. Connect an integration under Settings → Company credentials to
        populate this record.
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {sources.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-panel-2 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-text">
                <span className="font-medium">{s.title ?? label(s.source)}</span>
                {s.title && (
                  <span className="rounded bg-panel px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-dim">
                    {label(s.source)}
                  </span>
                )}
                {s.matchConfidence != null && (
                  <span className="text-xs text-dim">
                    {Math.round(s.matchConfidence * 100)}% match
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-dim">
                {s.externalRef ? `ref ${s.externalRef}` : "—"}
                {s.lastSeenAt ? ` · seen ${s.lastSeenAt}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(s)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-dim hover:border-accent hover:text-text"
            >
              <Icon name="Code" size={13} /> View raw
            </button>
          </li>
        ))}
      </ul>
      {open && <RawDialog source={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function RawDialog({ source, onClose }: { source: SourceRecordRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-panel"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="font-display text-sm font-semibold tracking-tight">
            {label(source.source)} — raw source record
          </h4>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-dim hover:text-text"
          >
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-3 overflow-auto px-4 py-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <Meta label="Source" value={label(source.source)} />
            <Meta label="External ref" value={source.externalRef} />
            <Meta
              label="Match confidence"
              value={source.matchConfidence != null ? `${Math.round(source.matchConfidence * 100)}%` : null}
            />
            <Meta label="Matched at" value={source.matchedAt} />
            <Meta label="Last seen" value={source.lastSeenAt} />
          </dl>
          <JsonBlock title="Bronze — raw payload" value={source.payloadBronze} />
          <JsonBlock title="Silver — normalized" value={source.normalizedSilver} />
        </div>
      </div>
    </div>
  );
}

function Meta({ label: l, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col">
      <dt className="text-dim">{l}</dt>
      <dd className="text-text">{value ?? "—"}</dd>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-dim">{title}</span>
      <pre className="max-h-64 overflow-auto rounded-md border border-border bg-panel-2 p-3 text-xs text-text">
        {value == null ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
