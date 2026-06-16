import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Field, TextInput, FormActions } from "@/components/ui/form";
import { createJourneyAction } from "../actions";

// Start a new marketing journey (ADR-0073, #399). Creating inserts ONE workflow row
// of kind='journey' (decision 1) then redirects into the builder to author its steps.
export default function NewJourneyPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/journeys" className="text-xs text-dim hover:text-accent">
          ← Journeys
        </Link>
      </div>
      <PageHeader
        title="New journey"
        description="A journey is one object on the workflow engine (ADR-0073). Name it, then build its steps."
      />
      <form action={createJourneyAction} className="flex flex-col gap-4">
        <Field label="Journey name">
          <TextInput name="name" placeholder="New-lead nurture" required />
        </Field>
        <FormActions cancelHref="/journeys" />
      </form>
    </div>
  );
}
