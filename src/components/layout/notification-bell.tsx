"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/(app)/notifications/actions";
import type { Notification } from "@/types";

/**
 * In-app notification bell (ADR-0064 A3, #332).
 *
 * Reads the signed-in employee's notifications from `GET /api/notifications`
 * (recipient-scoped server-side), shows an unread badge, and a dropdown list that
 * deep-links to each work object. Clicking an item marks it read (server action)
 * and navigates; a "mark all read" clears the badge. Polls every 30s so a freshly
 * dispatched notification (assignment / @mention / comment) appears "within one
 * refresh" (acceptance) without a full reload.
 *
 * Degrades gracefully: the API returns an empty, zero-count payload in mock mode /
 * before the user is provisioned, so the bell simply shows nothing — it never
 * fails the shell (house style).
 */
const POLL_MS = 30_000;

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: Notification[]; unreadCount: number };
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      /* network blip — keep the last known state */
    }
  }, []);

  // Initial load + poll.
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function openItem(n: Notification) {
    setOpen(false);
    if (!n.read) {
      // Optimistic: clear locally, then persist.
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      await markNotificationReadAction(n.id);
    }
    router.push(hrefFor(n));
  }

  async function markAll() {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
    await markAllNotificationsReadAction();
    void load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        className="relative rounded-md border border-border bg-panel-2 p-1.5 text-dim hover:text-text"
      >
        <Icon name="Bell" size={16} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-panel shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="font-display text-xs font-semibold tracking-tight">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1 text-[11px] text-dim hover:text-text"
              >
                <Icon name="Check" size={12} /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-dim">You&apos;re all caught up.</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => void openItem(n)}
                    className={cn(
                      "flex w-full items-start gap-2 border-b border-border px-3 py-2 text-left text-xs hover:bg-panel-2",
                      !n.read && "bg-panel-2/60",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                        n.read ? "bg-transparent" : "bg-accent",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-text">{n.title}</span>
                      <span className="mt-0.5 block text-[10px] text-dim">
                        {n.actor ? `${n.actor} · ` : ""}
                        {relativeTime(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-border px-3 py-2 text-right">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/notifications/preferences");
              }}
              className="text-[11px] text-dim hover:text-text"
            >
              Notification preferences →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Deep-link target for a notification's work object (acceptance: bell deep-links). */
function hrefFor(n: Notification): string {
  if (n.parentType === "task") return `/tasks/${n.parentId}/edit`;
  if (n.parentType === "project") return `/projects/${n.parentId}`;
  return "/tasks";
}

/** Compact relative time ("3m", "2h", "5d") for the notification row. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
