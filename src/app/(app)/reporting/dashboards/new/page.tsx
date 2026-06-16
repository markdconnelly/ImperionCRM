import { PageHeader } from "@/components/ui/page-header";
import { createDashboardAction } from "../actions";

const inputCls =
  "rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none";

/**
 * Create a dashboard (ADR-0075 §3, #412). Name + visibility only — tiles are added on
 * the dashboard itself once it exists. No capability gate; the create action stamps the
 * owner from the session.
 */
export default function NewDashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New dashboard"
        description="Name it and choose visibility. Add report tiles after it's created."
      />
      <form
        action={createDashboardAction}
        className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
      >
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-dim">Name</span>
          <input name="name" required placeholder="e.g. Sales leadership" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-dim">Visibility</span>
          <select name="visibility" defaultValue="private" className={inputCls}>
            <option value="private">private</option>
            <option value="shared">shared</option>
          </select>
        </label>
        <div>
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Create dashboard
          </button>
        </div>
      </form>
    </div>
  );
}
