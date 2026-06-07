import { PageHeader } from "@/components/ui/page-header";
import { HookForm } from "@/components/leads/hook-form";
import { createHookAction } from "../../actions";

export default function NewHookPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New capture hook"
        description="A hook pulls a new person into the system and starts a profile."
      />
      <HookForm action={createHookAction} />
    </div>
  );
}
