import { Icon } from "@/components/ui/icon";

/**
 * Empty-state for a module whose backend isn't built yet. Keeps the app fully
 * navigable and communicates intent (what the module will do) rather than a
 * blank screen. Most functions are powered by external services (ADR-0018).
 */
export function ModulePlaceholder({
  icon,
  title,
  description,
  points,
}: {
  icon: string;
  title: string;
  description: string;
  points?: string[];
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-panel/40 px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-panel-2 text-accent">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-dim">{description}</p>
      {points && points.length > 0 && (
        <ul className="mt-5 space-y-1.5 text-left text-sm text-dim">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <Icon name="Check" size={14} className="mt-0.5 shrink-0 text-accent" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
      <span className="mt-6 rounded-full border border-border px-3 py-1 text-xs text-dim">
        Planned
      </span>
    </div>
  );
}
