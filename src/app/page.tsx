import { AppShell } from "@/components/layout/app-shell";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import type { SessionUser } from "@/types";

// Server component: the middleware gate guarantees an authenticated session by
// the time this renders, so we read the Entra user and hand it to the shell.
// All view data flows through the repository abstraction (§7.4).
export default async function Page() {
  const session = await auth();
  const user: SessionUser = {
    name: session?.user?.name ?? "Unknown user",
    email: session?.user?.email ?? "",
  };

  const { agent } = getRepositories();
  const agentMessages = await agent.getConversation();

  return (
    <AppShell user={user} agentMessages={agentMessages}>
      <DashboardView />
    </AppShell>
  );
}
