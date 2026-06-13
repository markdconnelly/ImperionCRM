import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { Icon } from "@/components/ui/icon";
import { Timeline } from "@/components/comms/timeline";
import { EnrichmentDossier } from "@/components/comms/enrichment-dossier";
import { SocialIdentities } from "@/components/comms/social-identities";
import { SourceRecords } from "@/components/comms/source-records";
import { IntegrationHealth } from "@/components/comms/integration-health";
import { ConsentPanel } from "@/components/comms/consent-panel";
import { DirectoryGroups } from "@/components/contacts/directory-groups";
import { ActionItems } from "@/components/comms/action-items";
import { Compose } from "@/components/comms/compose";
import { sendMessageAction, completeActionItemAction, setConsentAction } from "../actions";

/** A headed panel with an icon, used across the detail page. */
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-panel p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
        <Icon name={icon} size={15} />
        {title}
      </h3>
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

const CRM_STAGE_LABEL: Record<string, string> = {
  audience: "Audience",
  lead: "Lead",
  prospect: "Prospect",
  client: "Client",
};

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    sent?: string;
    blocked?: string;
    /** 'real' = delivered via the backend send path; 'logged' = stub timeline entry (#183). */
    mode?: string;
    /** Why a send fell back to the stub: no_address | no_app_user | no_connection | backend_unconfigured. */
    reason?: string;
    /** A REAL send attempt failed — nothing was sent or logged. */
    error?: string;
  }>;
}) {
  const { id } = await params;
  const { sent, blocked, mode, reason, error } = await searchParams;
  const { contacts, comms, consent } = getRepositories();

  const profile = await contacts.getProfile(id);
  if (!profile) notFound();

  const [
    enrichment,
    social,
    sources,
    currentConsent,
    timeline,
    actions,
    canEmail,
    canSms,
    relatedBronze,
    directoryGroups,
  ] = await Promise.all([
    contacts.listEnrichment(id),
    contacts.listSocialIdentities(id),
    contacts.listContactSources(id),
    consent.currentConsent(id),
    comms.listInteractionsByContact(id),
    comms.listActionItems(id),
    consent.canSend(id, "email"),
    consent.canSend(id, "sms"),
    contacts.listContactRelatedBronze(id),
    contacts.listDirectoryGroups(id),
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
          {profile.crmStage && (
            <span className="rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent">
              {CRM_STAGE_LABEL[profile.crmStage] ?? profile.crmStage}
            </span>
          )}
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

      {sent && mode === "real" && (
        <div className="rounded-md border border-green/40 bg-green/10 px-4 py-2 text-sm text-green">
          Sent via {sent} — consent re-checked at send, delivered through the backend, and
          logged to the timeline.
        </div>
      )}
      {sent && mode !== "real" && (
        <div className="rounded-md border border-green/40 bg-green/10 px-4 py-2 text-sm text-green">
          Logged to the timeline (not delivered
          {reason === "no_connection" &&
            " — connect your Microsoft 365 account under Settings → Your connections to send real email"}
          {reason === "no_address" && ` — this contact has no ${sent === "sms" ? "phone number" : "email address"} on file`}
          {(reason === "backend_unconfigured" || reason === "no_app_user") &&
            " — the send backend isn't wired up in this environment"}
          ).
        </div>
      )}
      {blocked && (
        <div className="rounded-md border border-amber/40 bg-amber/10 px-4 py-2 text-sm text-amber">
          Blocked — this contact has no current {blocked} consent. Record consent first.
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red/40 bg-red/10 px-4 py-2 text-sm text-red">
          Send failed — nothing was sent via {error} and nothing was logged. Try again in a
          moment.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main column: act on the contact */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Section title="Send a message" icon="Send">
            <Compose
              action={sendMessageAction}
              contactId={id}
              canEmail={canEmail}
              canSms={canSms}
            />
          </Section>

          <Section title="Integrations" icon="PlugZap">
            <IntegrationHealth sources={sources} />
          </Section>

          <Section title="Action items" icon="ListChecks">
            <ActionItems items={actions} completeAction={completeActionItemAction} back={back} />
          </Section>
        </div>

        {/* Sidebar: profile intelligence */}
        <div className="flex flex-col gap-4">
          <Section title="Profile" icon="User">
            <dl className="flex flex-col gap-1.5 text-sm">
              <Row label="Email" value={profile.email} />
              <Row label="Phone" value={profile.phone} />
              <Row label="Headline" value={profile.headline} />
              <Row label="Location" value={profile.location} />
              <Row
                label="CRM stage"
                value={
                  profile.crmStage
                    ? CRM_STAGE_LABEL[profile.crmStage] ?? profile.crmStage
                    : null
                }
              />
              <Row label="Last enriched" value={profile.lastEnrichedAt} />
            </dl>
          </Section>

          <Section title="Enrichment dossier" icon="ScanSearch">
            <EnrichmentDossier facts={enrichment} />
          </Section>

          <Section title="Social profiles" icon="AtSign">
            <SocialIdentities identities={social} />
          </Section>

          <Section title="Data sources" icon="Database">
            <SourceRecords sources={sources} />
          </Section>

          {relatedBronze.length > 0 && (
            <Section title="Related source data" icon="FolderGit2">
              <SourceRecords sources={relatedBronze} />
            </Section>
          )}

          {/* Directory groups (#257) — bronze m365_groups via membership on the
              contact's Entra user id. Renders nothing until collected. */}
          {directoryGroups.length > 0 && (
            <Section title="Directory groups" icon="Users">
              <DirectoryGroups groups={directoryGroups} />
            </Section>
          )}

          <Section title="Consent" icon="ShieldCheck">
            <ConsentPanel current={currentConsent} contactId={id} action={setConsentAction} />
          </Section>
        </div>

        {/* Full-width bottom: the communications timeline */}
        <div className="lg:col-span-3">
          <Section title="Communications timeline" icon="History">
            <p className="-mt-2 mb-3 text-xs text-dim">
              Newest first. Click an entry to open the communication in a new window.
            </p>
            <Timeline
              items={timeline}
              newWindow
              emptyHint="No communications recorded for this contact yet."
            />
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
