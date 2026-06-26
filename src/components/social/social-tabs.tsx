import Link from "next/link";
import { cn } from "@/lib/cn";

/** The two Social plane surfaces (ADR-0124, #1340): the inbound inbox + publishing. */
const TABS = [
  { key: "inbox", label: "Inbox", href: "/social" },
  { key: "publishing", label: "Publishing", href: "/social/publishing" },
] as const;

export function SocialTabs({ active }: { active: "inbox" | "publishing" }) {
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
