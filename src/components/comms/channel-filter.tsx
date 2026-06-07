import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { CHANNEL_FILTERS } from "@/lib/comms";

/** Channel filter chips for the Communications feed (server-side via ?source=). */
export function ChannelFilter({ active }: { active?: string }) {
  const chip = (href: string, label: string, isActive: boolean, icon?: string) => (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
        isActive
          ? "border-accent bg-accent/10 text-text"
          : "border-border text-dim hover:text-text",
      )}
    >
      {icon && <Icon name={icon} size={12} />}
      {label}
    </Link>
  );

  return (
    <div className="flex flex-wrap gap-2">
      {chip("/communications", "All", !active)}
      {CHANNEL_FILTERS.map((c) =>
        chip(`/communications?source=${c.key}`, c.label, active === c.key, c.icon),
      )}
    </div>
  );
}
