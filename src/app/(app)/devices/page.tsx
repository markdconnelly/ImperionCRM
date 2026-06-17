import { redirect } from "next/navigation";

/**
 * `/devices` (the former "Devices & Assets" surface) is folded into CMDB (#795,
 * Wave 1 menu+RBAC re-plan, ADR-0078). Device inventory now lives as a tab inside
 * `/cmdb`; CMDB is the single hardware/asset nav entry. The route is kept so old
 * links / bookmarks resolve — it redirects to the CMDB device inventory, which
 * carries the admin|technician guard (set in #794).
 */
export default function DevicesPage() {
  redirect("/cmdb");
}
