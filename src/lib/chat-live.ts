/**
 * Live-chat / agent-console presentation helpers (ADR-0074 §6, #407).
 *
 * Pure, dependency-free, NOT server-only — safe to import from the server-rendered
 * agent console, the customer-facing widget (client), and the vitest suite alike.
 * The DERIVED telemetry rollups live in `lib/chat-session.ts` (the read-model lib,
 * #403); this module holds only the DISPLAY layer for the live console + widget:
 * status/channel badge metadata, relative-time formatting, and the honest "live
 * transport isn't wired" posture this surface degrades to (ADR-0074 §7 / ADR-0018:
 * real-time chat transport + the bot/live reply path are a backend PROCESS, not the
 * front end — until that seam exists the console is a poll/read view).
 *
 * Nothing here is random or time-dependent except `timeAgo`, which takes an explicit
 * `now` so it stays pure and testable; identical input → identical output.
 */

import type {
  ChatDeflectionKind,
  ChatSessionChannel,
  ChatSessionStatus,
} from "@/types";

/** A status badge's label + Tailwind tone class (matches the dark token set). */
export interface BadgeMeta {
  label: string;
  /** Tailwind text-color class for the badge. */
  tone: string;
}

/** Display metadata for a session lifecycle status (ADR-0074 §4). */
export function chatStatusMeta(status: ChatSessionStatus): BadgeMeta {
  switch (status) {
    case "bot":
      return { label: "Bot", tone: "text-accent-2" };
    case "live":
      return { label: "Live", tone: "text-green" };
    case "deflected":
      return { label: "Deflected", tone: "text-green" };
    case "escalated":
      return { label: "Escalated", tone: "text-amber" };
    case "closed":
      return { label: "Closed", tone: "text-dim" };
    default:
      return { label: status, tone: "text-dim" };
  }
}

/** Human label for an inbound channel (ADR-0074 §6 unified-routing surface). */
export function chatChannelLabel(channel: ChatSessionChannel): string {
  switch (channel) {
    case "web_chat":
      return "Web chat";
    case "social":
      return "Social";
    case "email":
      return "Email";
    case "sms":
      return "SMS";
    case "voice":
      return "Voice";
    case "other":
      return "Other";
    default:
      return channel;
  }
}

/** lucide-react icon name for a channel, for the routing/session list. */
export function chatChannelIcon(channel: ChatSessionChannel): string {
  switch (channel) {
    case "web_chat":
      return "MessageSquare";
    case "social":
      return "Share2";
    case "email":
      return "Mail";
    case "sms":
      return "Smartphone";
    case "voice":
      return "Phone";
    default:
      return "MessageCircle";
  }
}

/** Human phrase for how a session deflected, or null when it did not deflect. */
export function chatDeflectionLabel(kind: ChatDeflectionKind | null): string | null {
  switch (kind) {
    case "self_served":
      return "Self-served";
    case "bot_resolved":
      return "Bot resolved";
    default:
      return null;
  }
}

/**
 * Relative-time label from an ISO timestamp, given an explicit `now` (kept pure for
 * tests). Coarse buckets — the console never needs second precision.
 */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const secs = Math.max(0, Math.floor((now.getTime() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** A label for either side of a transcript line. */
export type ChatRole = "visitor" | "agent" | "bot";

/** One rendered transcript line (parsed from the stored transcript pointer/preview). */
export interface ChatTranscriptLine {
  role: ChatRole;
  text: string;
}

/**
 * Best-effort parse of a transcript PREVIEW into role-tagged lines for the console
 * stub. The authoritative transcript body lives in governed blob (migration 0117 —
 * never inlined in a row), so the console only ever has the `summary` to show until
 * the backend transcript-fetch seam exists. We accept the convention
 * `role: text` per line (visitor/agent/bot, case-insensitive); anything else is
 * attributed to the visitor. Empty input → empty array (the caller shows the
 * not-wired notice instead). Pure.
 */
export function parseTranscriptPreview(preview: string | null | undefined): ChatTranscriptLine[] {
  if (!preview) return [];
  return preview
    .split(/\r?\n/)
    .map((raw) => raw.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const m = /^(visitor|agent|bot)\s*:\s*(.*)$/i.exec(line);
      if (m) {
        const role = m[1].toLowerCase() as ChatRole;
        return { role, text: m[2] };
      }
      return { role: "visitor" as ChatRole, text: line };
    });
}

/**
 * The single honest "live transport isn't wired" notice the console + widget show
 * (ADR-0074 §7 / ADR-0018). The reply/bot path is a backend PROCESS; until
 * COMMS_SERVICE_URL (the chat transport host) is set this surface is a read/poll
 * view and replies log optimistically without delivering. Centralized so every
 * surface degrades with the same words.
 */
export const CHAT_TRANSPORT_NOT_WIRED =
  "Live chat transport isn't wired in this environment — the console shows sessions and " +
  "deflection telemetry from the database, and a reply is recorded but not delivered until " +
  "the backend chat process is configured. Escalation to an Autotask ticket still works " +
  "when the integration backend is reachable.";
