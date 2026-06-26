import Link from "next/link";
import { cn } from "@/lib/cn";

/** The Social plane surfaces (ADR-0124): inbox + publishing (#1340) + analytics (#1342). */
const TABS = [
  { key: "inbox", label: "Inbox", href: "/social" },
  { key: "publishing", label: "Publishing", href: "/social/publishing" },
  { key: "analytics", label: "Analytics", href: "/social/analytics" },
] as const;

export function SocialTabs({ active }: { active: "inbox" | "publishing" | "analytics" }) {
  return (
    <div className="flex gap-1 border-b border-border">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cn(
            "border-b-2 px-3 py-2 text-sm",
            active === t.key
              ? "border-accent font-medium text-text"
              : "border-transparent text-dim hover:text-text",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
