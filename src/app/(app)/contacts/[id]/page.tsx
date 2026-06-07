import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { Timeline } from "@/components/comms/timeline";
import { EnrichmentDossier } from "@/components/comms/enrichment-dossier";
import { SocialIdentities } from "@/components/comms/social-identities";
import { ConsentPanel } from "@/components/comms/consent-panel";
import { ActionItems } from "@/components/comms/action-items";
import { Compose } from "@/components/comms/compose";
import { sendMessageAction, completeActionItemAction } from "../actions";

/** A headed panel used across the detail page. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-panel p-4">
      <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

const LIFECYCLE_LABEL: Record<string, string> = {
  stranger: "Stranger",
  known: "Known",
  engaged: "Engaged",
  customer: "Customer",
};

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; blocked?: string }>;
}) {
  const { id } = await params;
  const { sent, blocked } = await searchParams;
  const { contacts, comms, consent } = getRepositories();

  const profile = await contacts.getProfile(id);
  if (!profile) notFound();

  const [enrichment, social, currentConsent, timeline, actions, canEmail, canSms] =
    await Promise.all([
      contacts.listEnrichment(id),
      contacts.listSocialIdentities(id),
      consent.currentConsent(id),
      comms.listInteractionsByContact(id),
      comms.listActionItems(id),
      consent.canSend(id, "email"),
      consent.canSend(id, "sms"),
    ]);

  const back = `/contacts/${id}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-panel-2 font-display text-lg text-dim">
            {profile.fullName.slice(0, 1)}
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {profile.fullName}
            </h2>
            <p className="mt-0.5 text-sm text-dim">
              {[profile.title, profile.account].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-md border border-border px-2 py-1 text-xs text-dim">
            {LIFECYCLE_LABEL[profile.lifecycleStatus] ?? profile.lifecycleStatus}
          </span>
          <Link
            href={`/contacts/${id}/edit`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
          >
            Edit
          </Link>
        </div>
      </div>

      {sent && (
        <div className="rounded-md border border-green/40 bg-green/10 px-4 py-2 text-sm text-green">
          Sent via {sent} — logged to the timeline.
        </div>
      )}
      {blocked && (
        <div className="rounded-md border border-amber/40 bg-amber/10 px-4 py-2 text-sm text-amber">
          Blocked — this contact has no current {blocked} consent. Record consent first.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main column: communications */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Section title="Send a message">
            <Compose
              action={sendMessageAction}
              contactId={id}
              canEmail={canEmail}
              canSms={canSms}
            />
          </Section>

          <Section title="Communications timeline">
            <Timeline items={timeline} emptyHint="No communications recorded for this contact yet." />
          </Section>

          <Section title="Action items">
            <ActionItems items={actions} completeAction={completeActionItemAction} back={back} />
          </Section>
        </div>

        {/* Sidebar: profile intelligence */}
        <div className="flex flex-col gap-4">
          <Section title="Profile">
            <dl className="flex flex-col gap-1.5 text-sm">
              <Row label="Email" value={profile.email} />
              <Row label="Phone" value={profile.phone} />
              <Row label="Headline" value={profile.headline} />
              <Row label="Location" value={profile.location} />
              <Row label="Last enriched" value={profile.lastEnrichedAt} />
            </dl>
          </Section>

          <Section title="Enrichment dossier">
            <EnrichmentDossier facts={enrichment} />
          </Section>

          <Section title="Social profiles">
            <SocialIdentities identities={social} />
          </Section>

          <Section title="Consent">
            <ConsentPanel current={currentConsent} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-dim">{label}</dt>
      <dd className="text-right text-text">{value ?? "—"}</dd>
    </div>
  );
}
