import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { canSeeSettings, type AppRole } from "@/lib/auth/roles";

/** Human labels for the application roles. */
const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  finance: "Finance",
  project_manager: "Project Manager",
  sales: "Sales",
  support: "Support",
};

/** A headed settings card. */
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

export default async function SettingsPage() {
  const session = await auth();
  const roles = session?.user?.roles ?? ["support"];
  // Settings is admin-only (ADR-0030). Middleware already redirects, but guard
  // here too so the page can never render for a non-admin.
  if (!canSeeSettings(roles)) redirect("/");

  const name = session?.user?.name ?? "Unknown user";
  const email = session?.user?.email ?? "—";
  const rolesLabel = roles.map((r) => ROLE_LABEL[r] ?? r).join(", ");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Settings"
        description="Your profile, appearance, and where the platform is configured."
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

      <Card title="Connections & data">
        <p className="text-sm text-dim">
          Connect your own Microsoft 365, LinkedIn, and YouTube accounts so your
          communications and the data they grant flow into the timeline and enrich your
          contacts.
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            href="/integrations"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
          >
            Manage connections
          </Link>
          <Link
            href="/consent"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
          >
            Consent ledger
          </Link>
        </div>
      </Card>

      <Card title="Platform">
        <p className="text-sm text-dim">
          AI features run on a provider-agnostic model-routing layer (OpenAI / Azure
          OpenAI / Claude). Endpoint and routing configuration is managed in App Service
          settings, not here.
        </p>
        <a
          href="https://github.com/markdconnelly/ImperionCRM/tree/main/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm text-accent hover:underline"
        >
          Documentation library →
        </a>
      </Card>
    </div>
  );
}
