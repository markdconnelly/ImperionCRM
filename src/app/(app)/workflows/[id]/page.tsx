import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Field, TextInput, Select } from "@/components/ui/form";
import { getRepositories } from "@/lib/data";
import { addStepAction, deleteStepAction } from "../actions";

const KIND_LABEL: Record<string, string> = {
  nurture: "Nurture",
  pre_discovery: "Pre-discovery",
  re_engagement: "Re-engagement",
};
const STEP_LABEL: Record<string, string> = {
  send_email: "Send email",
  send_sms: "Send SMS",
  chat_prompt: "Chat prompt",
  agent_enrich: "Agent enrich",
  wait: "Wait",
  branch: "Branch",
};

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workflows } = getRepositories();
  const wf = await workflows.getWorkflow(id);
  if (!wf) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={wf.name}
        description={`${KIND_LABEL[wf.kind] ?? wf.kind} · ${wf.status}${
          wf.trigger ? ` · trigger: ${wf.trigger}` : ""
        }`}
      >
        <Link href="/workflows" className="text-sm text-dim hover:text-text">
          ← Workflows
        </Link>
      </PageHeader>

      <section className="max-w-2xl">
        <h3 className="mb-2 font-display text-sm font-semibold tracking-tight">Steps</h3>
        {wf.steps.length === 0 ? (
          <p className="mb-3 text-sm text-dim">No steps yet — add the first below.</p>
        ) : (
          <ol className="mb-3 flex flex-col gap-2">
            {wf.steps.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-panel-2 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs text-dim">
                    {s.ordinal}
                  </span>
                  <div>
                    <p className="text-sm text-text">{STEP_LABEL[s.kind] ?? s.kind}</p>
                    {s.summary && <p className="text-[11px] text-dim">{s.summary}</p>}
                  </div>
                </div>
                <form action={deleteStepAction}>
                  <input type="hidden" name="stepId" value={s.id} />
                  <input type="hidden" name="workflowId" value={wf.id} />
                  <button type="submit" className="text-xs text-dim hover:text-red">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ol>
        )}

        <form
          action={addStepAction}
          className="flex flex-col gap-3 rounded-xl border border-border bg-panel p-4"
        >
          <input type="hidden" name="workflowId" value={wf.id} />
          <p className="text-xs font-medium text-dim">Add a step</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kind">
              <Select name="kind" defaultValue="send_email">
                <option value="send_email">Send email</option>
                <option value="send_sms">Send SMS</option>
                <option value="chat_prompt">Chat prompt</option>
                <option value="agent_enrich">Agent enrich</option>
                <option value="wait">Wait</option>
                <option value="branch">Branch</option>
              </Select>
            </Field>
            <Field label="Config (note)">
              <TextInput name="config" placeholder="e.g. template = welcome, wait 2 days" />
            </Field>
          </div>
          <div>
            <button
              type="submit"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Add step
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
