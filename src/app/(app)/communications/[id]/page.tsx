import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionItems } from "@/components/comms/action-items";
import { getRepositories } from "@/lib/data";
import { sourceMeta, directionMeta } from "@/lib/comms";
import { completeActionItemAction } from "../../contacts/actions";

/** A headed panel. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-panel p-4">
      <h3 className="mb-2 font-display text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

/** Drill-down into a single communication (email / Teams meeting / Plaud recap). */
export default async function CommunicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { comms } = getRepositories();
  const detail = await comms.getInteraction(id);
  if (!detail) notFound();

  const meta = sourceMeta(detail.source);
  const dir = directionMeta(detail.direction);
  const back = `/communications/${id}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {detail.subject ?? meta.label}
          </h2>
          <p className="mt-0.5 text-sm text-dim">
            <span className="text-text">{meta.label}</span>
            <span className={dir.tone}> · {dir.label}</span>
            {detail.occurredAt ? ` · ${detail.occurredAt}` : ""}
          </p>
        </div>
        <Link
          href="/communications"
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
        >
          ← All communications
        </Link>
      </div>

      {/* Related contact / company */}
      <div className="flex flex-wrap gap-2 text-sm">
        {detail.contact && (
          <Link
            href={detail.contactId ? `/contacts/${detail.contactId}` : "/contacts"}
            className="rounded-md border border-border px-3 py-1.5 text-dim hover:text-text"
          >
            Contact: {detail.contact}
          </Link>
        )}
        {detail.account && (
          <Link
            href={detail.accountId ? `/accounts/${detail.accountId}` : "/accounts"}
            className="rounded-md border border-border px-3 py-1.5 text-dim hover:text-text"
          >
            Company: {detail.account}
          </Link>
        )}
        {detail.owner && (
          <span className="rounded-md border border-border px-3 py-1.5 text-dim">
            Owner: {detail.owner}
          </span>
        )}
      </div>

      {detail.summary && (
        <Section title="Summary">
          <p className="whitespace-pre-wrap text-sm text-dim">{detail.summary}</p>
        </Section>
      )}

      {detail.meeting && (
        <Section title={`Meeting${detail.meeting.platform ? ` · ${detail.meeting.platform}` : ""}`}>
          <div className="flex flex-col gap-3">
            {detail.meeting.copilotRecap && (
              <div>
                <div className="text-xs text-dim">Copilot recap</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                  {detail.meeting.copilotRecap}
                </p>
              </div>
            )}
            {detail.meeting.plaudSummary && (
              <div>
                <div className="text-xs text-dim">Plaud summary</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                  {detail.meeting.plaudSummary}
                </p>
              </div>
            )}
            {detail.meeting.transcriptRef ? (
              <div className="text-xs text-dim">
                Transcript: <span className="text-text">{detail.meeting.transcriptRef}</span>
              </div>
            ) : (
              <div className="text-xs text-dim">Transcript not yet ingested.</div>
            )}
          </div>
        </Section>
      )}

      {detail.body && !detail.meeting && (
        <Section title="Body">
          <p className="whitespace-pre-wrap text-sm text-text">{detail.body}</p>
        </Section>
      )}

      <Section title="Action items">
        <ActionItems
          items={detail.actionItems}
          completeAction={completeActionItemAction}
          back={back}
        />
      </Section>
    </div>
  );
}
