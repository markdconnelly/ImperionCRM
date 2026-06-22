"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  navTop,
  navGroups,
  navBottom,
  isActivePath,
  isGroupActive,
} from "@/lib/nav";
import { canSeeFeature } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/auth/roles";
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
  nested = false,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  nested?: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
        collapsed && "justify-center px-0",
        nested && !collapsed && "pl-7",
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

/**
 * A collapsible group: a header row that expands/collapses its children. The
 * whole group is hidden when the role lacks the group's guard OR no child is
 * visible. When collapsed (icon-rail), children render as a flat list under the
 * group icon so every link stays reachable. The active trail keeps the group open.
 */
function NavGroup({
  group,
  collapsed,
  roles,
  pathname,
}: {
  group: NavItem;
  collapsed: boolean;
  roles: readonly AppRole[] | undefined;
  pathname: string;
}) {
  const groupVisible = canSeeFeature(group.key, roles);
  const children = (group.children ?? []).filter((c) => canSeeFeature(c.key, roles));
  const trailActive = isGroupActive(group, pathname);
  // Open by default if the active route is inside this group; otherwise collapsed.
  const [open, setOpen] = useState<boolean>(trailActive);

  if (!groupVisible || children.length === 0) return null;

  // Icon-rail mode: no headers, just the leaf icons (each still gated above).
  if (collapsed) {
    return (
      <>
        {children.map((child) => (
          <NavRow
            key={child.key}
            item={child}
            collapsed
            active={isActivePath(child.href, pathname)}
          />
        ))}
      </>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
          trailActive
            ? "text-text"
            : "text-dim hover:bg-panel-2 hover:text-text",
        )}
      >
        <Icon
          name={group.icon}
          size={18}
          className={cn(
            trailActive ? "text-accent" : "text-dim group-hover:text-text",
          )}
        />
        <span className="flex-1 truncate text-left font-medium">{group.label}</span>
        <Icon
          name={open ? "ChevronDown" : "ChevronRight"}
          size={14}
          className="text-dim"
        />
      </button>
      {open && (
        <div className="mt-0.5 flex flex-col gap-0.5">
          {children.map((child) => (
            <NavRow
              key={child.key}
              item={child}
              nested
              collapsed={false}
              active={isActivePath(child.href, pathname)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Render one band item: a collapsible group (has children) or a flat leaf link. */
function BandItem({
  item,
  collapsed,
  roles,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  roles: readonly AppRole[] | undefined;
  pathname: string;
}) {
  if (item.children) {
    return (
      <NavGroup
        group={item}
        collapsed={collapsed}
        roles={roles}
        pathname={pathname}
      />
    );
  }
  if (!canSeeFeature(item.key, roles)) return null;
  return (
    <NavRow
      item={item}
      collapsed={collapsed}
      active={isActivePath(item.href, pathname)}
    />
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
  const roles = user.roles;

  // Top band — flat links, role-gated (canSeeFeature).
  const top = navTop.filter((item) => canSeeFeature(item.key, roles));

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
            Imperion OS
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {top.map((item) => (
          <NavRow
            key={item.key}
            item={item}
            collapsed={collapsed}
            active={isActivePath(item.href, pathname)}
          />
        ))}

        <div className="my-2 border-t border-border" />

        {navGroups.map((group) => (
          <BandItem
            key={group.key}
            item={group}
            collapsed={collapsed}
            roles={roles}
            pathname={pathname}
          />
        ))}

        <div className="my-2 border-t border-border" />

        {navBottom.map((item) => (
          <BandItem
            key={item.key}
            item={item}
            collapsed={collapsed}
            roles={roles}
            pathname={pathname}
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
          {/* Avatar chip links to the user's profile (#796). The sign-out form
              stays a sibling so its button keeps working. */}
          <Link
            href="/profile"
            title="Your profile"
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-md hover:bg-panel-2",
              collapsed ? "justify-center" : "flex-1 px-1 py-0.5",
            )}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel-2 text-xs font-medium"
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
          </Link>
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
