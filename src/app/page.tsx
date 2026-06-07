import { AppShell } from "@/components/layout/app-shell";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";

// Server component: the middleware gate guarantees an authenticated session by
// the time this renders, so we read the Entra user and hand it to the shell.
export default async function Page() {
  const session = await auth();
  const user: SessionUser = {
    name: session?.user?.name ?? "Unknown user",
    email: session?.user?.email ?? "",
  };

  return (
    <AppShell user={user}>
      <DashboardView />
    </AppShell>
  );
}
