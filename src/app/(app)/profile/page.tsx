import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { ConnectAccount } from "@/components/integrations/connect-account";
import { ConnectionCard } from "@/components/integrations/connection-card";
import { getRepositories } from "@/lib/data";
import { roleLabel } from "@/lib/auth/roles";
import {
  CONNECT_RESULT_NOTICES,
  isConnectResult,
} from "@/lib/integrations/personal-oauth";
import { connectAction } from "./actions";
import { disconnectAction, setPollIntervalAction } from "../settings/actions";

export const dynamic = "force-dynamic";

/**
 * The signed-in user's profile (#796). Visible to ALL authenticated users (no group
 * guard) — it is the avatar chip's destination from the sidebar. It carries the
 * user's personal (per-user) OAuth connections, moved here off the admin-only
 * Settings page: a personal connection is the employee's own account, so it belongs
 * on their profile. Company/global credentials stay under Settings (admin-only).
 */

/** A headed card — the page's visual building block. */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="max-w-2xl rounded-xl border border-border bg-panel p-5">
      <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-dim">{label}</span>
      <span className="text-text">{value}</span>
    </div>
  );
}

/** Friendly names for the connect-flow notice (falls back to the raw key). */
const PROVIDER_LABEL: Record<string, string> = {
  m365: "Microsoft 365",
  google: "Google",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  plaud: "Plaud",
};

const NOTICE_TONE: Record<"success" | "warning" | "error", string> = {
  success: "border-green/40 text-green",
  warning: "border-amber/40 text-amber",
  error: "border-red/40 text-red",
};

/**
 * One-shot notice for an OAuth connect outcome (backend ADR-0038). The connect
 * action and the `/api/connections/[provider]/callback` route both land on
 * `/profile?connect=<result>`; this renders it.
 */
function ConnectNotice({ connect, provider }: { connect?: string; provider?: string }) {
  if (!connect || !isConnectResult(connect)) return null;
  const notice = CONNECT_RESULT_NOTICES[connect];
  const label = provider ? (PROVIDER_LABEL[provider] ?? provider) : "The account";
  return (
    <p
      role="status"
      className={`rounded-md border bg-panel-2 px-3 py-2 text-sm ${NOTICE_TONE[notice.tone]}`}
    >
      {notice.message(label)}
    </p>
  );
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string; provider?: string }>;
}) {
  const { connect, provider: connectProvider } = await searchParams;
  const session = await auth();
  // The (app) layout already gates on an authenticated session; this is
  // defense-in-depth so the page never renders without one.
  if (!session?.user) redirect("/login");

  const name = session.user.name ?? "Unknown user";
  const email = session.user.email ?? "—";
  const roles = session.user.roles ?? ["support"];
  const rolesLabel = roles.map((r) => roleLabel(r)).join(", ");

  const { connections } = getRepositories();
  const personal = email !== "—" ? await connections.listUserConnections(email) : [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Profile"
        description="Your account, appearance, and the personal connections that flow into your timeline."
      />

      <Card title="Profile">
        <div className="flex flex-col gap-1.5">
          <Row label="Name" value={name} />
          <Row label="Email" value={email} />
          <Row label="Roles" value={rolesLabel} />
          <Row label="Identity provider" value="Microsoft Entra ID (SSO)" />
        </div>
        <p className="mt-3 text-[11px] text-dim">
          Profile and roles come from Entra (ADR-0002/0016). To change them, update your
          Entra account — they sync on sign-in.
        </p>
      </Card>

      <Card title="Appearance">
        <AppearanceSettings />
      </Card>

      {/* Personal (per-user) OAuth connections (ADR-0024), moved here from
          Settings (#796). The generic disconnect / poll actions are shared with the
          company-credential cards and live in settings/actions.ts. */}
      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold tracking-tight">
            Your connected accounts
          </h3>
          <p className="mt-0.5 text-sm text-dim">
            Connect your own 365 / social accounts so your communications flow into the
            timeline — attributed first to you, then to the company. Tokens live in Key Vault.
          </p>
        </div>
        <ConnectNotice connect={connect} provider={connectProvider} />
        <ConnectAccount connectAction={connectAction} />
        {personal.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {personal.map((c) => (
              <ConnectionCard
                key={c.id}
                connection={c}
                disconnectAction={disconnectAction}
                pollAction={setPollIntervalAction}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-dim">No personal accounts connected yet.</p>
        )}
      </section>
    </div>
  );
}
