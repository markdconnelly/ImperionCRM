import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeMarketing, canManageCampaigns } from "@/lib/auth/roles";
import { getRepositories } from "@/lib/data";
import { deleteTemplateAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Message templates — the render-content store for marketing journey sends (#731,
 * ADR-0073). A journey send step (and each A/B variant) references a template by id;
 * the backend journey runner (BE #174) renders subject/html (email) or body (sms)
 * against it. List-first surface, gated by the Marketing group (admin | sales); writes
 * gated by `canManageCampaigns`. Reads degrade to empty under schema-lag (migration 0134
 * not yet applied) — the page shows an empty state, never a 500.
 */
export default async function MessageTemplatesPage() {
  const roles = await getSessionRoles();
  if (!canSeeMarketing(roles)) redirect("/");
  const canWrite = canManageCampaigns(roles);

  const { messageTemplates } = getRepositories();
  const rows = await messageTemplates.listTemplates();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Message templates"
        description="Reusable email (subject + HTML) and SMS (body) content for marketing journey sends. A journey send step references a template by id; the journey runner renders it at send time (ADR-0073)."
      >
        {canWrite && (
          <Link
            href="/message-templates/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New template
          </Link>
        )}
      </PageHeader>

      {rows.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-panel p-8 text-sm text-dim">
          <Icon name="Mail" size={16} />
          No templates yet.{canWrite ? " Create one to use in a journey send step." : ""}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((t) => (
            <li key={t.id} className="rounded-xl border border-border bg-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/message-templates/${t.id}`}
                  className="font-medium hover:text-accent"
                >
                  {t.name}
                </Link>
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-dim">
                  {t.channel}
                </span>
              </div>
              <div className="mt-1 truncate text-xs text-dim">
                {t.channel === "email" ? (t.subject ?? "—") : (t.body ?? "—")}
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-dim">
                <code className="text-[11px]">{t.id}</code>
                {t.mergeFields.length > 0 && <span>· {t.mergeFields.length} merge field(s)</span>}
                <Link
                  href={`/message-templates/${t.id}`}
                  className="ml-auto text-accent transition-colors hover:underline"
                >
                  Edit →
                </Link>
                {canWrite && (
                  <form action={deleteTemplateAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="text-red transition-colors hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
