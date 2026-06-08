"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { navPrimary, navSecondary, isActivePath } from "@/lib/nav";
import { canSeeFeature } from "@/lib/auth/roles";
import { signOutAction } from "@/lib/auth/actions";
import { Icon } from "@/components/ui/icon";
import type { NavItem, SessionUser } from "@/types";

/** Up-to-two-letter initials from a display name, for the avatar. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function NavRow({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-panel-2 text-text"
          : "text-dim hover:bg-panel-2 hover:text-text",
      )}
    >
      <Icon
        name={item.icon}
        size={18}
        className={cn(active ? "text-accent" : "text-dim group-hover:text-text")}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function Sidebar({
  collapsed,
  onExpand,
  user,
}: {
  collapsed: boolean;
  onExpand: () => void;
  user: SessionUser;
}) {
  const pathname = usePathname();

  // Role-gated nav: non-admins lose Settings + Security (canSeeFeature).
  const primary = navPrimary.filter((item) => canSeeFeature(item.key, user.roles));
  const secondary = navSecondary.filter((item) => canSeeFeature(item.key, user.roles));

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-panel transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-border px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-2 text-xs font-bold text-white">
          I
        </div>
        {!collapsed && (
          <span className="font-display text-sm font-semibold tracking-tight">
            Imperion CRM
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {primary.map((item) => (
          <NavRow
            key={item.key}
            item={item}
            collapsed={collapsed}
            active={isActivePath(item.href, pathname)}
          />
        ))}
        <div className="my-2 border-t border-border" />
        {secondary.map((item) => (
          <NavRow
            key={item.key}
            item={item}
            collapsed={collapsed}
            active={isActivePath(item.href, pathname)}
          />
        ))}

        {collapsed && (
          <button
            onClick={onExpand}
            title="Expand sidebar"
            className="mt-1 flex items-center justify-center rounded-md py-2 text-dim hover:bg-panel-2 hover:text-text"
          >
            <Icon name="ChevronsRight" size={18} />
          </button>
        )}
      </nav>

      <div className="border-t border-border p-2">
        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-2 py-2",
            collapsed && "flex-col gap-2 px-0",
          )}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel-2 text-xs font-medium"
            title={user.name}
          >
            {initialsOf(user.name)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{user.name}</div>
              <div className="truncate text-xs text-dim">
                {user.email || "Entra · SSO"}
              </div>
            </div>
          )}
          <form action={signOutAction} className={cn(!collapsed && "shrink-0")}>
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="flex items-center justify-center rounded-md p-1.5 text-dim transition-colors hover:bg-panel-2 hover:text-red"
            >
              <Icon name="LogOut" size={16} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
