"use client";

import { useState } from "react";
import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import type { AudienceRow } from "@/types";

/** CTA options mirroring the common Meta call-to-action set. */
const CTAS = ["Learn more", "Sign up", "Book now", "Contact us", "Download", "Get offer"];

function hostOf(url: string): string {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

/**
 * FB ads builder (ADR-0053 §3, #111): structured creative form — headline, body,
 * image ref, CTA, landing URL, UTM — rendered live as an ad-card preview, plus an
 * audience picker showing the ad-eligible (ad_targeting consent) count per ADR-0026.
 * The typed shape lands in `ad.creative`; the Meta push stays a backend slice.
 */
export function AdBuilder({
  action,
  campaignId,
  audiences,
}: {
  action: (formData: FormData) => void | Promise<void>;
  campaignId: string;
  audiences: AudienceRow[];
}) {
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [imageRef, setImageRef] = useState("");
  const [cta, setCta] = useState(CTAS[0]);
  const [landingUrl, setLandingUrl] = useState("");
  const [audienceId, setAudienceId] = useState("");
  const audience = audiences.find((a) => a.id === audienceId) ?? null;

  return (
    <div className="flex flex-wrap items-start gap-6">
      <form
        action={action}
        className="flex max-w-lg flex-1 basis-96 flex-col gap-4 rounded-xl border border-border bg-panel p-5"
      >
        <input type="hidden" name="campaignId" value={campaignId} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ad name">
            <TextInput name="name" required placeholder="e.g. Carousel — what attackers see" />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </Select>
          </Field>
        </div>

        <Field
          label={
            audience
              ? `Audience · ${audience.adReadyCount} of ${audience.memberCount} ad-eligible (ad_targeting opt-in)`
              : "Audience"
          }
        >
          <Select
            name="audienceId"
            value={audienceId}
            onChange={(e) => setAudienceId(e.target.value)}
          >
            <option value="">No audience yet</option>
            {audiences.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.adReadyCount}/{a.memberCount} eligible
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Headline">
          <TextInput
            name="headline"
            required
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Is your business one click from ransomware?"
          />
        </Field>
        <Field label="Body">
          <TextArea
            name="body"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Primary text shown above the card"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Image ref (URL or asset path)">
            <TextInput
              name="imageRef"
              value={imageRef}
              onChange={(e) => setImageRef(e.target.value)}
              placeholder="https://… (upload pipeline is backend work)"
            />
          </Field>
          <Field label="Call to action">
            <Select name="cta" value={cta} onChange={(e) => setCta(e.target.value)}>
              {CTAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Landing URL">
            <TextInput
              name="landingUrl"
              value={landingUrl}
              onChange={(e) => setLandingUrl(e.target.value)}
              placeholder="https://imperion.example/security-assessment"
            />
          </Field>
          <Field label="UTM">
            <TextInput name="utm" placeholder="utm_campaign=q3-webinar" />
          </Field>
        </div>

        <p className="rounded-md border border-border bg-panel-2 p-2.5 text-xs text-dim">
          Only audience members with a current <code>ad_targeting</code> opt-in are eligible
          (ADR-0026). The push to Meta is a backend slice — saving here persists the typed
          creative and never contacts the platform.
        </p>

        <FormActions cancelHref={`/campaigns/${campaignId}`} />
      </form>

      {/* Ad-card preview (ADR-0053 §3: structured form + preview, not a canvas). */}
      <aside className="w-80 shrink-0 overflow-hidden rounded-xl border border-border bg-panel-2">
        <p className="px-4 pt-3 text-[11px] uppercase tracking-wide text-dim">Card preview</p>
        {body ? <p className="px-4 pt-2 text-sm">{body}</p> : null}
        <div className="mt-3 flex h-36 items-center justify-center bg-panel text-xs text-dim">
          {imageRef ? `🖼 ${imageRef}` : "Image placeholder"}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border p-4">
          <div className="min-w-0">
            <p className="truncate text-[11px] uppercase text-dim">
              {landingUrl ? hostOf(landingUrl) : "yourdomain.example"}
            </p>
            <p className="truncate text-sm font-medium">
              {headline || <span className="text-dim">Headline appears here</span>}
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs font-medium">
            {cta}
          </span>
        </div>
        {audience ? (
          <p className="border-t border-border px-4 py-2 text-xs text-dim">
            Targets <span className="text-text">{audience.name}</span> ·{" "}
            {audience.adReadyCount} eligible of {audience.memberCount}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
