import { redirect } from "next/navigation";

/**
 * Personal (per-user) connections moved to the all-auth Profile page (#796);
 * company credentials live under Settings → Company credentials (ADR-0036, admin-only).
 * This legacy `/integrations` entry point now lands on the personal connections.
 */
export default function IntegrationsPage() {
  redirect("/profile");
}
