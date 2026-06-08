import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Leads ⟷ Contacts toggle (ADR-0031). Both are filtered views of the ONE
 * normalized contact object: Leads = not-yet-signed (audience|lead|prospect),
 * Contacts = signed clients. The toggle flips between the two routes.
 */
export function PeopleToggle({ current }: { current: "leads" | "contacts" }) {
  const tabs = [
    { key: "leads", label: "Leads", href: "/leads", hint: "Not yet signed" },
    { key: "contacts", label: "Contacts", href: "/contacts", hint: "Signed clients" },
  ] as const;

  return (
    <div className="inline-flex rounded-lg border border-border bg-panel p-1">
      {tabs.map((t) => {
        const active = t.key === current;
        return (
          <Link
            key={t.key}
            href={t.href}
            title={t.hint}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active ? "bg-panel-2 text-text" : "text-dim hover:text-text",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
