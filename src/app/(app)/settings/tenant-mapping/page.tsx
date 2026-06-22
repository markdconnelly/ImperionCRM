import { redirect } from "next/navigation";

/**
 * Retired route (ADR-0112, epic #1141 unit E3). Tenant Mapping is now the **M365 instance of
 * Client Mapping** — the reusable mapping surface at `/settings/client-mapping/m365`. This path
 * is kept only as a permanent redirect so existing links / bookmarks still resolve; all tenant
 * mapping happens on the unified Client Mapping page now.
 */
export default function TenantMappingSettingsPage() {
  redirect("/settings/client-mapping/m365");
}
