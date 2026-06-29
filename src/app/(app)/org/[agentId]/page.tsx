import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { loadOrgGraph, loadAgentProcedures, readOrgLiveState } from "@/lib/org/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeAgentPages } from "@/lib/auth/roles";
import type {
  OrgLiveState,
  OrgNode,
  OrgNodeLive,
  Procedure,
  ProcedureStage,
} from "@/lib/org/types";

export const dynamic = "force-dynamic"; // live dial/queue overlay, never prerendered

/**
 * /org/[agentId] — the full agent transparency surface (#1612, epic #1534). For one
 * agent it renders, from the icm/ SoT (generated into src/data/agent-procedures.json):
 * identity + settings (ceiling, reports-to, tools, OKF rooms, live dial/rung/queue) and
 * every PROCEDURE it performs (workflow) with the STEPS of each (stages) — each stage's
 * job, process steps (with their script/haiku/sonnet execution tier), inputs, outputs,
 * audit checks, and human-approval checkpoint. Read-only; admin-gated to the same
 * predicate as /org. Procedures are propose-only until the substrate hydrates (#389/#119).
 */
export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const roles = await getSessionRoles();
  if (!canSeeAgentPages(roles)) redirect("/");

  const { agentId } = await params;
  const node = loadOrgGraph().nodes.find((n) => n.id === agentId);
  const agent = loadAgentProcedures(agentId);
  if (!node || !agent) notFound();

  const live = liveFor(await readOrgLiveState(), node);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${node.persona ?? node.id} · ${node.id}`}
        description={describe(node)}
      >
        <Link href="/org" className="text-sm text-accent hover:underline">
          ← Org chart
        </Link>
      </PageHeader>

      <SettingsCard node={node} live={live} />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">
            Procedures{" "}
            <span className="text-muted">
              ({agent.procedures.length}
              {agent.procedures.length > 0
                ? ` · ${agent.procedures.reduce((n, p) => n + p.stages.length, 0)} steps`
                : ""}
              )
            </span>
          </h3>
        </div>
        {agent.procedures.length === 0 ? (
          <p className="rounded-xl border border-border bg-panel p-5 text-sm text-muted">
            No procedures authored yet — this agent is scaffolded (identity + budget) but its
            playbooks are a later build wave.
          </p>
        ) : (
          agent.procedures.map((proc) => <ProcedureCard key={proc.slug} proc={proc} />)
        )}
      </section>
    </div>
  );
}

function describe(node: OrgNode): string {
  const bits: string[] = [node.kind];
  if (node.division) bits.push(node.division);
  if (node.reportsTo) bits.push(`reports to ${node.reportsTo}`);
  if (node.ceiling) bits.push(`ceiling ${node.ceiling}`);
  return bits.join(" · ");
}

function liveFor(live: OrgLiveState, node: OrgNode): OrgNodeLive | null {
  return (
    live.byKey[node.id] ??
    (node.persona ? live.byKey[node.persona.toLowerCase()] : undefined) ??
    null
  );
}

function SettingsCard({ node, live }: { node: OrgNode; live: OrgNodeLive | null }) {
  return (
    <section className="rounded-xl border border-border bg-panel p-5">
      <h3 className="mb-3 text-sm font-semibold">Settings</h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-1 text-sm">
          <Row label="Ceiling" value={node.ceiling ?? "—"} />
          <Row label="Reports to" value={node.reportsTo ?? "—"} />
          {node.serves && <Row label="Serves" value={node.serves} />}
          <Row label="Status" value={node.built ? "built" : "scaffold"} />
        </div>
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">Live state</p>
          {live ? (
            <div className="flex flex-wrap gap-1.5">
              {live.rung && <Chip tone="accent">rung {live.rung}</Chip>}
              {live.level != null && <Chip tone="accent">dial {live.level}/5</Chip>}
              {live.gated && <Chip tone="amber">mark-gated</Chip>}
              <Chip tone={live.pending ? "red" : "muted"}>{live.pending} pending</Chip>
            </div>
          ) : (
            <p className="text-sm text-muted">
              No live data — propose-only / dormant until the substrate hydrates.
            </p>
          )}
        </div>
      </div>
      {node.tools.length > 0 && (
        <ChipSection title="Tool budget" items={node.tools} />
      )}
      {node.okfRooms.length > 0 && (
        <ChipSection title="OKF rooms" items={node.okfRooms} />
      )}
    </section>
  );
}

function ProcedureCard({ proc }: { proc: Procedure }) {
  return (
    <article className="rounded-xl border border-border bg-panel p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">
          {proc.slug}
          {proc.title && proc.title !== proc.slug ? (
            <span className="ml-2 font-normal text-dim">{proc.title}</span>
          ) : null}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {proc.autonomyRung && <Chip tone="accent">auto ≤ {proc.autonomyRung}</Chip>}
          {proc.model && <Chip tone="muted">{modelLabel(proc.model)}</Chip>}
          <Chip tone="muted">{proc.stages.length} steps</Chip>
        </div>
      </div>

      {proc.job && <p className="mt-2 text-sm text-dim">{proc.job}</p>}
      {proc.trigger && (
        <p className="mt-2 text-xs text-muted">
          <span className="uppercase tracking-wide">Trigger</span> · {proc.trigger}
        </p>
      )}
      {proc.autoMaySelfApprove && (
        <p className="mt-2 text-xs text-muted">
          <span className="uppercase tracking-wide">Auto may self-approve</span> ·{" "}
          {proc.autoMaySelfApprove}
        </p>
      )}

      <ol className="mt-4 space-y-3">
        {proc.stages.map((stage, i) => (
          <StageItem key={stage.slug} stage={stage} index={i + 1} />
        ))}
      </ol>
    </article>
  );
}

function StageItem({ stage, index }: { stage: ProcedureStage; index: number }) {
  return (
    <li className="rounded-lg border border-border bg-panel-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          <span className="text-muted">{String(index).padStart(2, "0")}</span> {stage.name}
        </p>
        {stage.checkpoint && <Chip tone="amber">checkpoint</Chip>}
      </div>
      {stage.job && <p className="mt-1 text-sm text-dim">{stage.job}</p>}

      {stage.process.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {stage.process.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="select-none text-muted">{i + 1}.</span>
              {step.tag && <StepTag tag={step.tag} />}
              <span className="text-text">{step.text}</span>
            </li>
          ))}
        </ol>
      )}

      {stage.inputs.rows.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs uppercase tracking-wide text-muted">
            Inputs ({stage.inputs.rows.length})
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {stage.inputs.headers.map((h) => (
                    <th
                      key={h}
                      className="border border-border px-2 py-1 text-left font-medium text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stage.inputs.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} className="border border-border px-2 py-1 align-top text-dim">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {stage.outputs && (
        <p className="mt-3 text-xs text-muted">
          <span className="uppercase tracking-wide">Outputs</span> · {stage.outputs}
        </p>
      )}

      {stage.audit.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {stage.audit.map((a, i) => (
            <li key={i} className="text-xs text-muted">
              ☐ {a}
            </li>
          ))}
        </ul>
      )}

      {stage.checkpoint && (
        <p className="mt-2 rounded border border-amber/40 px-2 py-1 text-xs text-amber">
          Checkpoint · {stage.checkpoint}
        </p>
      )}
    </li>
  );
}

// ── small presentational helpers ─────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

const TONE: Record<string, string> = {
  accent: "border-accent/40 text-accent",
  amber: "border-amber/40 text-amber",
  red: "border-red/40 text-red",
  green: "border-green/40 text-green",
  muted: "border-border text-muted",
};

function Chip({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] ${TONE[tone] ?? TONE.muted}`}>
      {children}
    </span>
  );
}

function ChipSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((it) => (
          <span key={it} className="rounded border border-border px-1.5 py-0.5 text-[11px]">
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The execution tier of a Process step → a coloured chip. */
const STEP_TONE: Record<string, keyof typeof TONE> = {
  script: "muted",
  haiku: "green",
  sonnet: "accent",
  opus: "amber",
  hybrid: "amber",
  "gui-step": "amber",
};

function StepTag({ tag }: { tag: string }) {
  return <Chip tone={STEP_TONE[tag] ?? "muted"}>{tag}</Chip>;
}

function modelLabel(model: string): string {
  if (model.includes("haiku")) return "Haiku";
  if (model.includes("sonnet")) return "Sonnet";
  if (model.includes("opus")) return "Opus";
  return model;
}
