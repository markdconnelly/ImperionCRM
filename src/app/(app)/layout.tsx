import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import type { SessionUser } from "@/types";

/**
 * Layout for all authenticated app routes. The middleware gate guarantees a
 * session by the time this renders, so we read the Entra user and the agent feed
 * once and wrap every page in the three-column shell.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user: SessionUser = {
    name: session?.user?.name ?? "Unknown user",
    email: session?.user?.email ?? "",
    roles: session?.user?.roles ?? ["support"],
  };

  const { agent } = getRepositories();
  const agentMessages = await agent.getConversation();

  return (
    <AppShell user={user} agentMessages={agentMessages}>
      {children}
    </AppShell>
  );
}
