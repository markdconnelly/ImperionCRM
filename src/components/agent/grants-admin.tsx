"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import type { AgentGrants } from "@/lib/agent/grants-data";
import type { GrantMutationResult } from "@/app/(app)/agents/actions";

/**
 * Per-agent tool-grant admin (#1005 / 2D, ADR-0107 D3). Lists each CRM sub-agent's
 * granted tools + scope; grant a new tool, edit a grant's scope, or revoke. Writes go
 * through server actions → backend `/agent/grants` (ADR-0042). Read-only for non-admins
 * and when the backend isn't reachable.
 */
export function GrantsAdmin({
  agents,
  canEdit,
  upsertAction,
  revokeAction,
}: {
  agents: AgentGrants[];
  /** Admin (settings:write) AND backend reachable — controls whether writes are enabled. */
  canEdit: boolean;
  upsertAction: (formData: FormData) => Promise<GrantMutationResult>;
  revokeAction: (formData: FormData) => Promise<GrantMutationResult>;
}) {
  const [notice, setNotice] = useState<GrantMutationResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: (fd: FormData) => Promise<GrantMutationResult>, fd: FormData) {
    startTransition(async () => setNotice(await action(fd)));
  }

  return (
    <div className="flex flex-col gap-4">
      {notice && (
        <p
          className={`rounded-lg border px-3 py-2 text-xs ${
            notice.ok ? "border-green/40 text-green" : "border-red/40 text-red"
          }`}
          role="status"
        >
          {notice.message}
        </p>
      )}

      {agents.map((agent) => (
        <section key={agent.agentId} className="rounded-xl border border-border bg-panel p-5">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="Bot" size={14} className="text-dim" />
            <h3 className="font-display text-sm font-semibold tracking-tight">{agent.name}</h3>
            <span className="text-[11px] text-dim">{agent.tools.length} granted</span>
          </div>

          {agent.tools.length === 0 && (
            <p className="mb-3 text-xs text-dim">No tools granted — deny-by-default (all calls refused).</p>
          )}

          <ul className="flex flex-col gap-2">
            {agent.tools.map((g) => (
              <li
                key={g.tool}
                className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <code className="text-xs font-medium">{g.tool}</code>
                  <form
                    action={(fd) => run(upsertAction, fd)}
                    className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center"
                  >
                    <input type="hidden" name="agentId" value={agent.agentId} />
                    <input type="hidden" name="tool" value={g.tool} />
                    <input
                      type="text"
                      name="scope"
                      defaultValue={JSON.stringify(g.scope)}
                      aria-label={`Scope for ${g.tool}`}
                      disabled={!canEdit || pending}
                      spellCheck={false}
                      className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 font-mono text-[11px] disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={!canEdit || pending}
                      className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-bg disabled:opacity-50"
                    >
                      Save scope
                    </button>
                  </form>
                </div>
                <form action={(fd) => run(revokeAction, fd)} className="shrink-0">
                  <input type="hidden" name="agentId" value={agent.agentId} />
                  <input type="hidden" name="tool" value={g.tool} />
                  <button
                    type="submit"
                    disabled={!canEdit || pending}
                    className="rounded-md border border-red/40 px-2 py-1 text-[11px] text-red hover:bg-red/10 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>

          {/* Grant a new tool */}
          <form
            action={(fd) => run(upsertAction, fd)}
            className="mt-3 flex flex-col gap-1.5 border-t border-border/60 pt-3 sm:flex-row sm:items-center"
          >
            <input type="hidden" name="agentId" value={agent.agentId} />
            <input
              type="text"
              name="tool"
              placeholder="tool name, e.g. crm_add_note"
              aria-label={`New tool for ${agent.name}`}
              disabled={!canEdit || pending}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-xs disabled:opacity-60"
            />
            <input
              type="text"
              name="scope"
              placeholder='scope (optional), e.g. {"accountId":["a1"]}'
              aria-label={`Scope for new tool on ${agent.name}`}
              disabled={!canEdit || pending}
              spellCheck={false}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 font-mono text-[11px] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!canEdit || pending}
              className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-bg disabled:opacity-50"
            >
              Grant tool
            </button>
          </form>
        </section>
      ))}
    </div>
  );
}
