import type { DirectoryGroupRow } from "@/types";

// Directory groups on the Contact 360 (#257) — bronze m365_groups joined
// through m365_group_members on the contact's Entra user object id (Mark's
// 2026-06-12 verdict: groups are bronze to the USER object). Server-rendered;
// drill is a plain <details> per group (same pattern as the Company 360's
// SharePoint sites, #255).

/** Bronze is all-text — case-folded boolean check. */
function isTrue(value: string | null): boolean {
  return (value ?? "").toLowerCase() === "true";
}

/** Group kind from the raw Graph fields: Unified → M365, else security/distribution. */
function groupKind(g: DirectoryGroupRow): string {
  if ((g.groupTypes ?? "").includes("Unified")) return "Microsoft 365";
  if (isTrue(g.securityEnabled)) return isTrue(g.mailEnabled) ? "Mail-enabled security" : "Security";
  if (isTrue(g.mailEnabled)) return "Distribution";
  return "Group";
}

function fmtDate(value: string | null): string {
  return value ? value.slice(0, 10) : "—";
}

export function DirectoryGroups({ groups }: { groups: DirectoryGroupRow[] }) {
  const multiTenant = new Set(groups.map((g) => g.tenantId)).size > 1;

  return (
    <div className="flex flex-col gap-1.5">
      {groups.map((g) => (
        <details
          key={`${g.tenantId}:${g.externalId}`}
          className="group rounded-md border border-border/60"
        >
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-sm">
            <span className="font-medium text-text">{g.displayName ?? g.externalId}</span>
            <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[11px] text-dim">
              {groupKind(g)}
            </span>
            {g.membershipRuleProcessingState === "On" && (
              <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[11px] text-dim">
                dynamic
              </span>
            )}
          </summary>
          <div className="flex flex-col gap-1.5 border-t border-border/60 px-3 py-2.5 text-sm">
            {g.description && <p className="text-text">{g.description}</p>}
            {g.mail && <p className="text-dim">{g.mail}</p>}
            <p className="text-[11px] text-dim">
              {g.visibility && <>{g.visibility} · </>}
              {multiTenant && <>tenant {g.tenantId} · </>}
              collected {fmtDate(g.collectedAt)}
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}
