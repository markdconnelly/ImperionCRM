"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { ChatRole, ChatTranscriptLine } from "@/lib/chat-live";

/**
 * Customer-facing live-chat widget (ADR-0074 §4/§6, #407).
 *
 * A self-contained, embeddable launcher → panel. An inbound message is first answered
 * by a bot grounded in gold knowledge (ADR-0041); on failure it escalates to a human /
 * an Autotask ticket. Those are BACKEND processes (ADR-0042 / ADR-0018) hosted off this
 * repo, so this component is the GUI shell only: it manages the open/closed panel and the
 * local transcript, and degrades HONESTLY when the transport isn't wired — it echoes an
 * honest placeholder bot turn and a notice rather than pretending to reach an agent.
 *
 * Wiring later is additive: pass an `onSend` that posts to the backend chat host and
 * resolves the bot/agent turn; the default keeps the page working with no backend.
 */
export function LiveChatWidget({
  title = "Chat with support",
  greeting = "Hi! Ask a question and our assistant will help — or connect you to a person.",
  transportWired = false,
  onSend,
}: {
  /** Panel heading. */
  title?: string;
  /** The bot's opening line. */
  greeting?: string;
  /** True once the backend chat transport is configured (drops the not-wired notice). */
  transportWired?: boolean;
  /**
   * Optional real send hook — resolves the bot/agent reply line. When omitted the
   * widget answers with an honest "not wired" placeholder so the page never breaks.
   */
  onSend?: (message: string) => Promise<ChatTranscriptLine>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [lines, setLines] = useState<ChatTranscriptLine[]>([
    { role: "bot", text: greeting },
  ]);

  async function send() {
    const message = draft.trim();
    if (!message || pending) return;
    setDraft("");
    setLines((prev) => [...prev, { role: "visitor", text: message }]);
    setPending(true);
    try {
      const reply: ChatTranscriptLine = onSend
        ? await onSend(message)
        : {
            role: "bot",
            text:
              "Thanks — I've noted your message. Live answering isn't enabled in this preview, " +
              "so a support agent will follow up. (The assistant connects once the chat backend is wired.)",
          };
      setLines((prev) => [...prev, reply]);
    } catch {
      setLines((prev) => [
        ...prev,
        { role: "bot", text: "Something went wrong reaching support — please try again shortly." },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="flex h-[28rem] w-80 flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-panel-2 px-4 py-3">
            <span className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-text">
              <Icon name="MessageSquare" size={15} className="text-accent" />
              {title}
            </span>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="text-dim hover:text-text"
            >
              <Icon name="X" size={16} />
            </button>
          </div>

          {/* Transcript */}
          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {lines.map((line, i) => (
              <Bubble key={i} role={line.role} text={line.text} />
            ))}
            {pending && (
              <div className="flex items-center gap-1.5 text-[11px] text-dim">
                <Icon name="Loader2" size={12} className="animate-spin" />
                Assistant is typing…
              </div>
            )}
          </div>

          {!transportWired && (
            <p className="border-t border-border px-4 py-1.5 text-[10px] text-dim">
              Preview mode — messages reach support but live answering isn&apos;t enabled yet.
            </p>
          )}

          {/* Composer */}
          <div className="flex items-end gap-2 border-t border-border px-3 py-2.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Type a message…"
              className="w-full resize-none rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={pending || draft.trim().length === 0}
              aria-label="Send message"
              className="shrink-0 rounded-md bg-accent p-2 text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
            >
              <Icon name="Send" size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Minimize chat" : "Open chat"}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-colors hover:bg-accent/90"
      >
        <Icon name={open ? "ChevronDown" : "MessageSquare"} size={20} />
      </button>
    </div>
  );
}

function Bubble({ role, text }: { role: ChatRole; text: string }) {
  const isVisitor = role === "visitor";
  return (
    <div className={`flex ${isVisitor ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isVisitor
            ? "bg-accent text-white"
            : role === "agent"
              ? "border border-green/40 bg-green/10 text-text"
              : "bg-panel-2 text-text"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
