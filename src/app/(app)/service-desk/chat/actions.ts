"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/guard";
import { ticketsService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";

/** Backend Autotask title/description limits we mirror client-side (backend #19). */
const TITLE_MAX = 250;
const BODY_MAX = 8000;
const REPLY_MAX = 8000;

/** What the console renders after an escalate-to-ticket attempt. */
export interface EscalateChatResult {
  ok: boolean;
  /** 'created' = a new Autotask ticket was filed; 'existing' = idempotent replay. */
  status: "created" | "existing" | "error";
  message: string;
  /** The Autotask ticket id once filed (text — Autotask owns the id). */
  ticketRef: string | null;
}

/** What the console renders after a (stubbed-until-wired) agent reply. */
export interface ChatReplyResult {
  ok: boolean;
  /** 'sent' is only reachable once the transport seam exists; today → 'recorded'. */
  status: "sent" | "recorded" | "error";
  message: string;
}

/**
 * Escalate a pre-ticket chat session into an Autotask ticket (ADR-0074 §4/§5).
 *
 * This is a PROCESS, so it goes through the backend (ADR-0042): the existing
 * idempotent Autotask seam (`ticketsService.createTicket`, backend #19) files the
 * ticket and rounds it back through the pull → bronze → silver `ticket`. The
 * idempotency identity is the originating session (`origin = chat-session / sessionId`),
 * so a double-click or read-after-write retry can never file two tickets — it returns
 * the existing `ticketRef` with `created:false`. The backend chat process owns writing
 * the resulting ref onto the `chat_session` row (this repo has no INSERT/UPDATE grant
 * on `chat_session`, migration 0117), so the console reflects it on the next refresh.
 *
 * Capability: `tickets:write` (support∨sales∨project_manager∨admin, ADR-0045) — the
 * service-desk write a support agent owns.
 */
export async function escalateChatToTicketAction(formData: FormData): Promise<EscalateChatResult> {
  await requireCapability("tickets:write");

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!sessionId) {
    return { ok: false, status: "error", message: "Missing the chat session to escalate.", ticketRef: null };
  }
  if (!accountId) {
    // A pre-ticket session is often anonymous (migration 0117 nullable FK); a ticket
    // needs an account, so the agent must attach one before escalating.
    return {
      ok: false,
      status: "error",
      message: "Attach an account to this session before escalating — a ticket needs an account.",
      ticketRef: null,
    };
  }
  if (!title) {
    return { ok: false, status: "error", message: "Give the ticket a title.", ticketRef: null };
  }
  if (title.length > TITLE_MAX) {
    return { ok: false, status: "error", message: `Keep the title under ${TITLE_MAX} characters.`, ticketRef: null };
  }
  if (description.length > BODY_MAX) {
    return { ok: false, status: "error", message: `Keep the description under ${BODY_MAX} characters.`, ticketRef: null };
  }

  const outcome = await callServiceWithFallback(
    () =>
      ticketsService.createTicket({
        // 'service-desk' resolves through the backend's AUTOTASK_QUEUE_IDS map; an
        // unmapped name falls back to the backend default queue (backend #19).
        queue: "service-desk",
        title,
        ...(description ? { description } : {}),
        accountId,
        // Idempotency identity: this chat session. Retrying the same session is a no-op.
        origin: { type: "chat-session", id: sessionId },
      }),
    {
      label: "escalateChatToTicketAction",
      notConfigured:
        "The Autotask integration backend isn't wired in this environment (INTEGRATION_SERVICE_URL unset) — escalation can't file a ticket yet.",
      failed: "Something went wrong filing the Autotask ticket — try again in a moment.",
    },
  );

  if (!outcome.ok) {
    return { ok: false, status: "error", message: outcome.message, ticketRef: null };
  }

  revalidatePath("/service-desk/chat");
  const { ticketRef, created } = outcome.value;
  return {
    ok: true,
    status: created ? "created" : "existing",
    message: created
      ? `Filed Autotask ticket ${ticketRef}. The transcript is handed to the ticket; it appears under Tickets after the next Autotask sync.`
      : `This session already escalated to Autotask ticket ${ticketRef} — no duplicate filed.`,
    ticketRef,
  };
}

/**
 * Post an agent reply into a live chat session (ADR-0074 §6).
 *
 * Real-time chat transport (delivering the reply to the visitor + the bot/live
 * handover) is a backend PROCESS (ADR-0042 / ADR-0018) hosted off this repo; it is
 * not wired yet. So this action validates + accepts the reply and degrades HONESTLY
 * (like the composer's send stub, #183): it records the intent and tells the agent it
 * was not delivered, rather than failing the page or pretending it sent. When the
 * transport seam lands this becomes a real `callServiceWithFallback` to the chat host.
 *
 * Capability: `tickets:write` — same service-desk write the console is gated on.
 */
export async function sendChatReplyAction(formData: FormData): Promise<ChatReplyResult> {
  await requireCapability("tickets:write");

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!sessionId) {
    return { ok: false, status: "error", message: "Missing the chat session to reply to." };
  }
  if (!body) {
    return { ok: false, status: "error", message: "Type a reply to send." };
  }
  if (body.length > REPLY_MAX) {
    return { ok: false, status: "error", message: `Keep the reply under ${REPLY_MAX} characters.` };
  }

  // Transport not wired (ADR-0074 §7): record the intent, do not claim delivery.
  return {
    ok: true,
    status: "recorded",
    message:
      "Reply recorded. Live delivery is disabled until the backend chat transport is wired — the visitor won't see it yet.",
  };
}
