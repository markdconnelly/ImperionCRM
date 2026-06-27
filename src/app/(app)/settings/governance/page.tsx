import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { auth } from "@/auth";
import { canSeeSettings } from "@/lib/auth/roles";
import { can } from "@/lib/auth/policy";
import { getGovernanceState } from "@/lib/agent/governance-data";
import { CAP_BOUNDS } from "@/lib/agent/governance";
import { saveKillSwitchAction, saveOptoutDefaultAction, saveCapsAction } from "./actions";

/**
 * Agent-governance admin surface (#1408, ADR-0080/0081, parent epic #1038).
 *
 * Settings → AI governance: the operator tunes the v1 action-plane gates —
 * three-scope kill-switch, per-client opt-out default, rate/fan-out/cost caps,
 * circuit-breaker error rate, approval TTL — written to `agent_governance_setting`
 * (mig 0163) instead of raw SQL. The whole Settings tree is admin-only (redirect
 * below); tuning is additionally gated by `agents:operate` so the controls render
 * read-only for any non-operator, and the server actions also fail closed.
 *
 * No migration: the table + grants (web SELECT+UPDATE) ship in 0163; this is a pure
 * GUI over the seeded rows. App-native config (archetype H) — not a silver entity,
 * so no OKF concept file (`semantic-layer-not-affected`).
 */

const input =
  "rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim";
const saveBtn =
  "self-start rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50";

function Card({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="max-w-2xl rounded-xl border border-border bg-panel p-5">
      <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
      <p className="mb-3 mt-0.5 text-xs text-dim">{hint}</p>
      {children}
    </section>
  );
}

export default async function GovernancePage() {
  const session = await auth();
  const roles = session?.user?.roles ?? ["support"];
  // Settings is admin-only (ADR-0030); middleware already redirects, guard here too.
  if (!canSeeSettings(roles)) redirect("/");
  // Tuning the action plane = operating the agent layer (ADR-0050). Non-operators
  // see the persisted values read-only; the server actions also fail closed.
  const canEdit = can(roles, "agents:operate");

  const g = await getGovernanceState();
  const fieldset = canEdit ? {} : { disabled: true };
  const ks = g.killswitch;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI governance"
        description="Tune the agent action-plane gates that contain autonomous and assisted actions (ADR-0080/0081, #1064): the kill-switch, the per-client opt-out default, the rate / fan-out / cost caps, the circuit-breaker error rate, and the approval TTL. These are enforced by the backend gauntlet at dispatch — changing them here takes effect on the next run, no deploy."
      >
        <Link href="/settings?tab=ai" className="text-sm text-dim transition-colors hover:text-text">
          ← Settings
        </Link>
      </PageHeader>

      {!canEdit && (
        <p className="max-w-2xl rounded-md border border-amber/40 bg-amber/5 px-3 py-2 text-xs text-amber">
          You can view the governance gates but not change them — tuning requires the{" "}
          <code>agents:operate</code> capability (admin).
        </p>
      )}
      {g.source === "mock" && (
        <p className="max-w-2xl text-xs text-dim">
          No database is configured — showing the seeded defaults. Saving is a no-op until a DB is wired.
        </p>
      )}

      {/* ── Kill-switch (#269) ───────────────────────────────────────────────── */}
      <Card
        title="Kill-switch"
        hint="Stop the agent action plane globally, or stop specific agents / workflows. All off = normal operation. The global switch is the master stop."
      >
        <form action={saveKillSwitchAction} className="flex flex-col gap-3">
          <fieldset {...fieldset} className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="global"
                defaultChecked={ks.global}
                className="h-4 w-4 rounded border-border bg-panel-2"
              />
              <span className={ks.global ? "font-medium text-red" : "text-text"}>
                Global kill-switch {ks.global ? "— ENGAGED (all agents stopped)" : "(off)"}
              </span>
            </label>
            <label className="flex flex-col gap-1 text-xs text-dim">
              Stopped agents (comma- or newline-separated slugs, e.g. <code>felix, chase</code>)
              <textarea
                name="per_agent"
                rows={2}
                defaultValue={ks.per_agent.join(", ")}
                placeholder="none"
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-dim">
              Stopped workflows (comma- or newline-separated, e.g. <code>technician</code>)
              <textarea
                name="per_workflow"
                rows={2}
                defaultValue={ks.per_workflow.join(", ")}
                placeholder="none"
                className={input}
              />
            </label>
            <button type="submit" disabled={!canEdit} className={saveBtn}>
              Save kill-switch
            </button>
          </fieldset>
        </form>
      </Card>

      {/* ── Per-client opt-out default (#270) ────────────────────────────────── */}
      <Card
        title="Per-client autonomy default"
        hint="The default autonomy posture applied to a NEW client until an admin overrides it on that client. Opt-out means a new client's agents stay observe-only until explicitly enabled."
      >
        <form action={saveOptoutDefaultAction} className="flex items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-dim">
            Default for new clients
            <select
              name="optout_default"
              defaultValue={g.optoutDefault}
              disabled={!canEdit}
              className={input}
            >
              <option value="opt_in">Opt-in (autonomy on by default)</option>
              <option value="opt_out">Opt-out (observe-only until enabled)</option>
            </select>
          </label>
          <button type="submit" disabled={!canEdit} className={saveBtn}>
            Save default
          </button>
        </form>
      </Card>

      {/* ── Caps + circuit breaker + approval TTL (#271/#272/#273) ───────────── */}
      <Card
        title="Caps, circuit breaker & approvals"
        hint="Per-agent throughput and spend ceilings, the rolling error rate that trips the breaker, and how long a pending approval lives before the reaper expires it. Out-of-range values are clamped to the allowed bounds on save."
      >
        <form action={saveCapsAction} className="flex flex-col gap-3">
          <fieldset {...fieldset} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-dim">
                Rate cap (actuations / agent / minute)
                <input
                  type="number"
                  name="rate_per_minute"
                  defaultValue={g.ratePerMinute}
                  min={CAP_BOUNDS.ratePerMinute.min}
                  max={CAP_BOUNDS.ratePerMinute.max}
                  className={input}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-dim">
                Fan-out cap (actions / run)
                <input
                  type="number"
                  name="fanout_per_run"
                  defaultValue={g.fanoutPerRun}
                  min={CAP_BOUNDS.fanoutPerRun.min}
                  max={CAP_BOUNDS.fanoutPerRun.max}
                  className={input}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-dim">
                Cost cap (USD / run)
                <input
                  type="number"
                  name="cost_usd_per_run"
                  step="0.01"
                  defaultValue={g.costUsdPerRun}
                  min={CAP_BOUNDS.costUsdPerRun.min}
                  max={CAP_BOUNDS.costUsdPerRun.max}
                  className={input}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-dim">
                Circuit-breaker error rate (0–1)
                <input
                  type="number"
                  name="error_rate"
                  step="0.01"
                  defaultValue={g.circuitBreakerErrorRate}
                  min={CAP_BOUNDS.circuitBreakerErrorRate.min}
                  max={CAP_BOUNDS.circuitBreakerErrorRate.max}
                  className={input}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-dim">
                Approval TTL (days)
                <input
                  type="number"
                  name="approval_ttl_days"
                  defaultValue={g.approvalTtlDays}
                  min={CAP_BOUNDS.approvalTtlDays.min}
                  max={CAP_BOUNDS.approvalTtlDays.max}
                  className={input}
                />
              </label>
            </div>
            <button type="submit" disabled={!canEdit} className={saveBtn}>
              Save caps
            </button>
          </fieldset>
        </form>
      </Card>
    </div>
  );
}
