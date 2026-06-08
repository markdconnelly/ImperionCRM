import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  call_recording: "Call recording",
  data_enrichment: "Data enrichment",
  ad_targeting: "Ad targeting",
};

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="text-xs text-dim">{label}</div>
      <div className="mt-1 font-display text-2xl">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-dim">{hint}</div>}
    </div>
  );
}

export default async function SecurityPage() {
  // Security lives under Settings — admin-only (ADR-0030). Middleware redirects
  // too; this is defense-in-depth.
  if (!canSeeSettings(await getSessionRoles())) redirect("/");

  const { security } = getRepositories();
  const p = await security.getPosture();
  const consentPct =
    p.totalContacts > 0 ? Math.round((p.contactsWithConsent / p.totalContacts) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Security"
        description="Posture at a glance — consent coverage, connection health, and the controls behind them."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Contacts" value={String(p.totalContacts)} />
        <Metric
          label="With current consent"
          value={`${consentPct}%`}
          hint={`${p.contactsWithConsent} of ${p.totalContacts}`}
        />
        <Metric label="Ad-eligible" value={String(p.adEligible)} hint="current ad-targeting opt-in" />
        <Metric
          label="Active connections"
          value={`${p.connectionsActive}/${p.connectionsTotal}`}
          hint="tokens in Key Vault"
        />
      </div>

      <section className="max-w-2xl rounded-xl border border-border bg-panel p-5">
        <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">
          Consent coverage by channel
        </h3>
        {p.consentByChannel.length === 0 ? (
          <p className="text-sm text-dim">No consent recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {p.consentByChannel.map((c) => (
              <li key={c.label} className="flex items-center justify-between text-sm">
                <span className="text-dim">{CHANNEL_LABEL[c.label] ?? c.label}</span>
                <span className="text-green">{c.count} opt-in</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="max-w-2xl rounded-xl border border-border bg-panel p-5">
        <h3 className="mb-2 font-display text-sm font-semibold tracking-tight">Controls</h3>
        <ul className="flex flex-col gap-1.5 text-sm text-dim">
          <li>· Identity: Microsoft Entra ID only, certificate client auth (ADR-0002/0005).</li>
          <li>· DB: managed-identity auth — no stored password.</li>
          <li>· Secrets: Azure Key Vault; OAuth tokens referenced, never stored (ADR-0024).</li>
          <li>· Consent gate on outbound sends and ad targeting (ADR-0014/0026).</li>
          <li>· PII access is audit-logged (ADR-0016).</li>
        </ul>
        <p className="mt-3 text-[11px] text-dim">
          Threat models, Sentinel monitoring, and the pre-go-live secret rotation are
          tracked in the security docs.
        </p>
      </section>
    </div>
  );
}
