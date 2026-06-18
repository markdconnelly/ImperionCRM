import { safeHttpUrl } from "@/lib/safe-url";
import type { SharePointSiteRow } from "@/types";

// Drillable SharePoint site inventory for the Company 360 (#255, ADR-0051
// account_tenant scoping). Site METADATA only — Sites.Read.All; Files.Read.All
// was pruned, so there is deliberately NO file/drive/document surface here and
// none may be added. Server-rendered; the drill is a plain <details> per site
// (same pattern as the posture page's secure-score control groups).

/** Bronze is all-text — parse defensively; non-numeric → null. */
function toBytes(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fmtBytes(value: string | null): string {
  const n = toBytes(value);
  if (n === null) return "—";
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.ceil(n / 1024)} KB`;
}

/** Inventory timestamps render as dates — time of day adds nothing at-a-glance. */
function fmtDate(value: string | null): string {
  return value ? value.slice(0, 10) : "—";
}

function isTrue(value: string | null): boolean {
  return (value ?? "").toLowerCase() === "true";
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-dim">{label}</div>
      <div className="text-sm text-text">{value}</div>
    </div>
  );
}

export function SharePointSites({ sites }: { sites: SharePointSiteRow[] }) {
  const tenants = new Set(sites.map((s) => s.tenantId));
  const multiTenant = tenants.size > 1;

  return (
    <div className="flex flex-col gap-1.5">
      {sites.map((s) => {
        const title = s.displayName ?? s.webUrl ?? s.externalId;
        const used = toBytes(s.storageUsedBytes);
        // webUrl is integration-sourced bronze (untrusted) — only link http(s),
        // anything else (javascript:/data:/…) renders as nothing (#883).
        const siteHref = safeHttpUrl(s.webUrl);
        return (
          <details
            key={`${s.tenantId}:${s.externalId}`}
            className="group rounded-md border border-border/60"
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <span className="font-medium text-text">{title}</span>
              {s.template && (
                <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[11px] text-dim">
                  {s.template}
                </span>
              )}
              {isTrue(s.isPersonalSite) && (
                <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[11px] text-dim">
                  personal
                </span>
              )}
              <span className="ml-auto text-xs text-dim">
                {used !== null && <>{fmtBytes(s.storageUsedBytes)} · </>}
                modified {fmtDate(s.lastModifiedAt)}
              </span>
            </summary>
            <div className="grid grid-cols-2 gap-3 border-t border-border/60 px-3 py-2.5 md:grid-cols-4">
              <Fact label="Created" value={fmtDate(s.createdAt)} />
              <Fact label="Last modified" value={fmtDate(s.lastModifiedAt)} />
              <Fact label="Storage used" value={fmtBytes(s.storageUsedBytes)} />
              <Fact label="Storage quota" value={fmtBytes(s.storageQuotaBytes)} />
              {s.description && (
                <div className="col-span-2 md:col-span-4">
                  <div className="text-[11px] text-dim">Description</div>
                  <div className="text-sm text-text">{s.description}</div>
                </div>
              )}
              <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 md:col-span-4">
                {siteHref && (
                  <a
                    href={siteHref}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-accent underline-offset-2 hover:underline"
                  >
                    Open site ↗
                  </a>
                )}
                <span className="text-[11px] text-dim">
                  {multiTenant && <>tenant {s.tenantId} · </>}
                  collected {fmtDate(s.collectedAt)}
                </span>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
