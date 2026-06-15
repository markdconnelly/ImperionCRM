"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { TagChip, TAG_COLORS } from "@/components/tags/tag-chip";
import type { AppliedTag, Tag } from "@/types";

/**
 * Inline tag editor for one work object (ADR-0065 B6, #340): shows the applied
 * tag chips (each removable) plus a "+ Tag" control that opens a small popover to
 * apply an existing vocabulary tag or create a new colour-coded one. All mutations
 * go through the passed server actions (FormData); the parent page revalidates.
 */
export function TaskTagEditor({
  parentType,
  parentId,
  applied,
  vocabulary,
  applyAction,
  applyExistingAction,
  removeAction,
}: {
  parentType: "task" | "project";
  parentId: string;
  applied: AppliedTag[];
  vocabulary: Tag[];
  applyAction: (formData: FormData) => void | Promise<void>;
  applyExistingAction: (formData: FormData) => void | Promise<void>;
  removeAction: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState<string>("slate");
  const appliedIds = new Set(applied.map((t) => t.id));
  const unapplied = vocabulary.filter((t) => !appliedIds.has(t.id));

  return (
    <div className="flex flex-wrap items-center gap-1">
      {applied.map((t) => (
        <form key={t.id} action={removeAction} className="inline-flex">
          <input type="hidden" name="parentType" value={parentType} />
          <input type="hidden" name="parentId" value={parentId} />
          <input type="hidden" name="tagId" value={t.id} />
          <TagChip tag={t} onRemove={undefined} />
          <button
            type="submit"
            aria-label={`Remove tag ${t.label}`}
            className="-ml-1 mr-0.5 self-center text-[11px] text-dim hover:text-red"
          >
            ×
          </button>
        </form>
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-dim hover:text-text"
        >
          + Tag
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-56 rounded-lg border border-border bg-panel p-2 shadow-lg">
            {/* Apply an existing vocabulary tag. */}
            {unapplied.length > 0 && (
              <div className="mb-2 max-h-32 overflow-y-auto">
                <p className="mb-1 px-1 text-[10px] uppercase tracking-wide text-dim">Existing</p>
                {unapplied.map((t) => (
                  <form key={t.id} action={applyExistingAction}>
                    <input type="hidden" name="parentType" value={parentType} />
                    <input type="hidden" name="parentId" value={parentId} />
                    <input type="hidden" name="tagId" value={t.id} />
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-panel-2"
                    >
                      <TagChip tag={t} />
                      <span className="ml-auto text-[10px] text-dim">{t.usageCount}</span>
                    </button>
                  </form>
                ))}
              </div>
            )}

            {/* Create a new tag + apply it. */}
            <form action={applyAction} className="border-t border-border pt-2">
              <input type="hidden" name="parentType" value={parentType} />
              <input type="hidden" name="parentId" value={parentId} />
              <input type="hidden" name="color" value={color} />
              <p className="mb-1 px-1 text-[10px] uppercase tracking-wide text-dim">New tag</p>
              <input
                name="label"
                placeholder="e.g. urgent"
                className="mb-1 w-full rounded border border-border bg-panel-2 px-2 py-1 text-xs text-text outline-none focus:border-accent"
              />
              <div className="mb-2 flex gap-1">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Colour ${c}`}
                    className={cn(
                      "h-4 w-4 rounded-full border",
                      color === c ? "ring-2 ring-text/60" : "",
                    )}
                  >
                    <TagChip tag={{ label: "", color: c }} className="block h-4 w-4 p-0" />
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="w-full rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent/90"
              >
                Add tag
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
