"use client";

import { useState } from "react";
import Link from "next/link";
import type { MessageTemplateChannel, MessageTemplateRow } from "@/types";
import { createTemplateAction, updateTemplateAction } from "@/app/(app)/message-templates/actions";

// Message-template composer (#731, ADR-0073). Channel-typed content the journey runner
// (BE #174) renders against: email → subject + html, sms → body. Channel toggles which
// fields are shown/submitted; the server action + the migration's CHECK enforce the
// channel-gated contract independently of the UI.

const inputClass =
  "w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none";

type Props = { template?: MessageTemplateRow };

export function TemplateForm({ template }: Props) {
  const isEdit = Boolean(template);
  const [channel, setChannel] = useState<MessageTemplateChannel>(template?.channel ?? "email");

  return (
    <form
      action={isEdit ? updateTemplateAction : createTemplateAction}
      className="flex max-w-2xl flex-col gap-4"
    >
      {isEdit && <input type="hidden" name="id" value={template!.id} />}

      <label className="block">
        <span className="mb-1 block text-xs text-dim">Template name</span>
        <input
          name="name"
          defaultValue={template?.name ?? ""}
          placeholder="Welcome email"
          className={inputClass}
          required
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-dim">Channel</span>
        <select
          name="channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as MessageTemplateChannel)}
          className={inputClass}
        >
          <option value="email">email</option>
          <option value="sms">sms</option>
        </select>
      </label>

      {channel === "email" ? (
        <>
          <label className="block">
            <span className="mb-1 block text-xs text-dim">Subject</span>
            <input
              name="subject"
              defaultValue={template?.subject ?? ""}
              placeholder="Welcome to {{company}}"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-dim">HTML body</span>
            <textarea
              name="html"
              defaultValue={template?.html ?? ""}
              rows={8}
              placeholder="<p>Hi {{firstName}}…</p>"
              className={`${inputClass} font-mono text-xs`}
            />
          </label>
        </>
      ) : (
        <label className="block">
          <span className="mb-1 block text-xs text-dim">SMS body</span>
          <textarea
            name="body"
            defaultValue={template?.body ?? ""}
            rows={4}
            placeholder="Hi {{firstName}}, a quick reminder…"
            className={inputClass}
          />
        </label>
      )}

      <label className="block">
        <span className="mb-1 block text-xs text-dim">
          Merge fields <span className="text-dim/70">(comma-separated, e.g. firstName, company)</span>
        </span>
        <input
          name="mergeFields"
          defaultValue={(template?.mergeFields ?? []).join(", ")}
          placeholder="firstName, company"
          className={inputClass}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          {isEdit ? "Save template" : "Create template"}
        </button>
        <Link href="/message-templates" className="text-sm text-dim hover:text-text">
          Cancel
        </Link>
      </div>
    </form>
  );
}
