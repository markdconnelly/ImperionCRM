import { redirect } from "next/navigation";

/**
 * Integrations moved under Settings (ADR-0036): personal connects live on the
 * "Your connections" tab and company credentials on "Company credentials".
 */
export default function IntegrationsPage() {
  redirect("/settings?tab=connections");
}
