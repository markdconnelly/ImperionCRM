import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { SOCIAL_CHANNELS } from "@/lib/social";

/**
 * Channel filter chips for the Social inbox (server-side via ?channel=). Mirrors the
 * Communications ChannelFilter. "All" clears the filter.
 */
export function SocialChannelFilter({
  active,
  basePath,
}: {
  active?: string;
  basePath: string;
}) {
  const chip = (key: string, href: string, label: string, isActive: boolean, icon?: string) => (
    <Link
      key={key}
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
      {chip("all", basePath, "All", !active)}
      {SOCIAL_CHANNELS.map((c) =>
        chip(c.key, `${basePath}?channel=${c.key}`, c.label, active === c.key, c.icon),
      )}
    </div>
  );
}
