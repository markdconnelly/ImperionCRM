import { Icon } from "@/components/ui/icon";

/**
 * "Feed back into" panel (ADR-0023). Renders buttons that spawn downstream records
 * (opportunity / project / ticket) carrying a source_* FK back to this engagement —
 * the downstream record points at its origin, the data is never copied.
 */
export function ProvenancePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl rounded-xl border border-border bg-panel p-5">
      <div className="mb-1 flex items-center gap-2">
        <Icon name="GitFork" size={15} className="text-accent" />
        <h3 className="font-display text-sm font-semibold tracking-tight">
          Generate downstream work
        </h3>
      </div>
      <p className="mb-3 text-xs text-dim">
        Creates a record linked back to this engagement (provenance) — no data is copied.
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function SpawnButton({
  action,
  hidden,
  label,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
  label: string;
}) {
  return (
    <form action={action}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-panel-2"
      >
        {label}
      </button>
    </form>
  );
}
