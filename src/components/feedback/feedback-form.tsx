"use client";

import { useState } from "react";
import { Field, TextInput, TextArea, Select } from "@/components/ui/form";

const REPO = "markdconnelly/ImperionCRM";

/**
 * Feature feedback is coupled to GitHub (ADR-0013): submitting opens a prefilled
 * GitHub issue rather than persisting a separate copy. No backend required.
 */
export function FeedbackForm() {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [type, setType] = useState("enhancement");

  const url =
    `https://github.com/${REPO}/issues/new?` +
    new URLSearchParams({
      title: title || "",
      body: detail || "",
      labels: type,
    }).toString();

  return (
    <div className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5">
      <Field label="Title">
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary of the request"
        />
      </Field>
      <Field label="Type">
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="enhancement">Feature request</option>
          <option value="bug">Bug</option>
          <option value="documentation">Docs</option>
        </Select>
      </Field>
      <Field label="Detail">
        <TextArea
          rows={4}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="What should it do, and why?"
        />
      </Field>
      <div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={title.trim() === ""}
          className={`inline-block rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
            title.trim() === ""
              ? "pointer-events-none bg-accent/40"
              : "bg-accent hover:bg-accent/90"
          }`}
        >
          Open a GitHub issue →
        </a>
      </div>
      <p className="text-[11px] text-dim">
        Opens a prefilled issue on the project — review and submit it there. Status and
        release are tracked on GitHub (ADR-0013).
      </p>
    </div>
  );
}
