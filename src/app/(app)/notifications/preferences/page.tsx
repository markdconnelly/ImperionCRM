import { PageHeader } from "@/components/ui/page-header";
import { NotificationPrefsGrid } from "@/components/notifications/notification-prefs-grid";
import { getRepositories } from "@/lib/data";
import { resolveActingUser } from "@/lib/services/acting-user";
import { buildPrefGrid } from "@/lib/notifications/prefs";
import { setNotificationPrefAction } from "../actions";

/**
 * Notification preferences (ADR-0064 A3, #601) — a per-USER surface, not the
 * admin-only Settings page (every employee tunes their own notifications). The
 * acting user is resolved server-side; the grid shows their effective state per
 * (trigger × channel), defaulting to the schema default (in-app ON) wherever no
 * explicit row exists. Sign-in gated by middleware; no capability gate — a user
 * owns their own preferences.
 *
 * `in_app` toggles are honoured by the FE bell (a muted kind is suppressed at
 * dispatch); `email`/`teams` are recorded here but DISPATCHED by the backend
 * (no provider key in the FE — ADR-0064). The backend dispatch + the scheduled
 * due-soon/overdue evaluation are a separate backend lane (#601 parts 1+2).
 */
export default async function NotificationPreferencesPage() {
  const acting = await resolveActingUser();
  const explicit = acting.ok
    ? await getRepositories().notifications.listPrefs(acting.id)
    : [];
  const cells = buildPrefGrid(explicit);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Notification preferences"
        description="Choose how you're notified for each trigger. In-app drives the bell; email and Teams are sent by the backend."
      />

      {!acting.ok && (
        <p
          role="status"
          className="max-w-2xl rounded-md border border-amber/40 bg-panel-2 px-3 py-2 text-sm text-amber"
        >
          Preferences can&apos;t be loaded for your account yet — toggles will save once
          your profile is provisioned. Defaults (in-app on) apply meanwhile.
        </p>
      )}

      <section className="max-w-2xl rounded-xl border border-border bg-panel p-5">
        <NotificationPrefsGrid cells={cells} saveAction={setNotificationPrefAction} />
        <p className="mt-4 text-[11px] text-dim">
          Unchecked = muted for that trigger and channel. An untouched cell uses the
          default (in-app on). Email and Teams delivery is performed by the backend
          dispatcher; this page records your preference (the front end holds no
          provider key, ADR-0064).
        </p>
      </section>
    </div>
  );
}
