import { PageHeader } from "@/components/ui/page-header";
import { HookForm } from "@/components/leads/hook-form";
import { getRepositories } from "@/lib/data";
import { createHookAction } from "../../actions";

export default async function NewHookPage() {
  const { events } = getRepositories();
  const eventList = await events.listEvents();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New capture hook"
        description="A hook pulls a new person into the system and starts a profile."
      />
      <HookForm
        action={createHookAction}
        events={eventList.filter((e) => e.status !== "completed" && e.status !== "canceled")}
      />
    </div>
  );
}
