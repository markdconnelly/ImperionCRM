import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { ConversationPanel } from "@/components/comms/conversation-panel";
import { OpportunityKnowledge } from "@/components/pipeline/opportunity-knowledge";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeRevenue, REDACTED_MONEY } from "@/lib/auth/roles";
import { filterConversationsForOpportunity } from "@/lib/conversations";

const STAGE_LABEL: Record<string, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-dim">{label}</span>
      <span className="text-right text-text">{value}</span>
    </div>
  );
}

/** A headed panel with an icon — the page's visual building block (mirrors the 360s). */
function Section({
  title,
  icon,
  hint,
  className,
  children,
}: {
  title: string;
  icon: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-border bg-panel p-4 ${className ?? ""}`}>
      <h3 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
        <Icon name={icon} size={15} />
        {title}
      </h3>
      {hint ? <p className="mb-3 text-xs text-dim">{hint}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

/**
 * Deal / Opportunity 360 (ADR-0068, #681) — the dedicated detail route that hosts
 * the conversational-intelligence panel for a single deal. Conversations are keyed
 * by account (silver `conversation`, migration 0112), each carrying an optional
 * `opportunityId`; this page reads the account-wide list and filters it to THIS
 * deal — account-wide voice (no deal link) stays on the Company 360 (#379). The
 * data layer is already wired (this route is pure GUI over it, ADR-0042): the
 * conversation reads degrade to an empty state when the backend capture/analyze
 * pipeline is unwired, so the page never fails.
 */
export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const { crm } = getRepositories();
  const [roles, opportunity, knowledge] = await Promise.all([
    getSessionRoles(),
    crm.getOpportunity(id),
    crm.getOpportunityKnowledge(id),
  ]);
  if (!opportunity) notFound();

  // Support cannot see revenue (ADR-0030): blank deal MRR server-side.
  const mrr = canSeeRevenue(roles) ? opportunity.mrr : REDACTED_MONEY;

  // Conversational intelligence (ADR-0068, #379) — conversations are keyed by the
  // deal's account; keep only the rows tied to THIS opportunity, then resolve each
  // one's insights server-side so the panel renders them inline. Read-only; returns
  // [] when the pipeline is unwired (ADR-0042), so this never fails the page.
  const accountConversations = await crm.listConversationsForAccount(opportunity.accountId);
  const conversations = filterConversationsForOpportunity(accountConversations, id);
  const conversationDetails = Object.fromEntries(
    await Promise.all(
      conversations.map(async (c) => [c.id, await crm.getConversation(c.id)] as const),
    ),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={opportunity.name} description="Deal 360" />
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/pipeline"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
          >
            <Icon name="ArrowLeft" size={14} />
            Pipeline
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section title="Deal" icon="Handshake">
          <div className="flex flex-col gap-1.5">
            <Row label="Sales stage" value={STAGE_LABEL[opportunity.stage] ?? opportunity.stage} />
            <Row label="MRR" value={mrr} />
            <Row label="Company" value={opportunity.account} />
          </div>
        </Section>

        <Section
          title="Company"
          icon="Building2"
          hint="The account this deal belongs to — open the Company 360 for the full dossier."
          className="lg:col-span-2"
        >
          <Link
            href={`/accounts/${opportunity.accountId}`}
            className="flex items-center gap-2 text-sm text-accent underline-offset-2 hover:underline"
          >
            <Icon name="Building2" size={15} />
            {opportunity.account}
          </Link>
        </Section>

        {/* Conversational intelligence (#379, ADR-0068) — voice conversations
            (ACS / Teams / upload) tied to THIS deal with their AI insights.
            Read-only; renders an empty state until the backend capture/analyze
            pipeline (ADR-0042) is wired. */}
        <Section
          title="Conversations"
          icon="Mic"
          hint="Call & meeting intelligence (ADR-0068) — summary, action items, sentiment, and deal-risk from transcribed voice, scoped to this deal. Read-only."
          className="lg:col-span-3"
        >
          <ConversationPanel
            conversations={conversations}
            details={conversationDetails}
            emptyHint="No conversations captured for this deal yet."
          />
        </Section>

        {/* Sales knowledge (#429, epic #425) — manual notes + uploaded customer
            knowledge the sales team captures, written to the website opportunity
            bronze (source='website', highest merge precedence; ADR-0039). Feeds the
            gold layer for the orchestrator. */}
        <Section
          title="Sales knowledge"
          icon="NotebookPen"
          hint="Notes & uploaded documents the sales team captures about this deal — the context a machine feed can't. Written to the website opportunity bronze (highest merge precedence) and fed to the orchestrator."
          className="lg:col-span-3"
        >
          <OpportunityKnowledge opportunityId={id} knowledge={knowledge} notice={notice} />
        </Section>
      </div>
    </div>
  );
}
