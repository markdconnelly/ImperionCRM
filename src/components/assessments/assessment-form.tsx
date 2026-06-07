import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import {
  ASSESSMENT_DIMENSIONS,
  ASSESSMENT_RATINGS,
  RATING_LABEL,
} from "@/lib/assessment";
import type { AssessmentEditable, Option } from "@/lib/data/repositories";

export function AssessmentForm({
  action,
  assessment,
  accounts,
  opportunities,
}: {
  action: (formData: FormData) => void | Promise<void>;
  assessment?: AssessmentEditable | null;
  accounts: Option[];
  opportunities: Option[];
}) {
  return (
    <form
      action={action}
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      {assessment && <input type="hidden" name="id" value={assessment.id} />}

      <Field label="Name">
        <TextInput
          name="name"
          defaultValue={assessment?.name ?? ""}
          placeholder="e.g. Acme — AI Security Readiness Assessment"
          required
        />
      </Field>

      <Field label="Account">
        <Select name="accountId" defaultValue={assessment?.accountId ?? ""} required>
          <option value="" disabled>
            — Select an account —
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Opportunity">
        <Select name="opportunityId" defaultValue={assessment?.opportunityId ?? ""}>
          <option value="">— None —</option>
          {opportunities.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Status">
        <Select name="status" defaultValue={assessment?.status ?? "proposed"}>
          <option value="proposed">Proposed</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In progress</option>
          <option value="delivered">Delivered</option>
          <option value="closed">Closed</option>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fee (USD, one-time)">
          <TextInput
            type="number"
            name="feeAmount"
            min="0"
            step="1"
            placeholder="e.g. 2500"
            defaultValue={assessment?.feeAmount ?? ""}
          />
        </Field>
        <Field label="Kickoff date">
          <TextInput type="date" name="kickoffAt" defaultValue={assessment?.kickoffAt ?? ""} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="creditToOnboarding"
          defaultChecked={assessment ? assessment.creditToOnboarding : true}
          className="h-4 w-4 rounded border-border bg-panel-2 accent-accent"
        />
        <span>Credit fee toward onboarding on conversion</span>
      </label>

      <fieldset className="rounded-lg border border-border p-3">
        <legend className="px-1 text-xs text-dim">Scorecard — six dimensions</legend>
        <div className="flex flex-col gap-3">
          {ASSESSMENT_DIMENSIONS.map((d) => (
            <Field key={d.key} label={d.label}>
              <Select
                name={`rating_${d.key}`}
                defaultValue={assessment?.ratings?.[d.key] ?? ""}
              >
                <option value="">— Not scored —</option>
                {ASSESSMENT_RATINGS.map((r) => (
                  <option key={r} value={r}>
                    {RATING_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>
          ))}
        </div>
      </fieldset>

      <Field label="Top priorities (ranked)">
        <TextArea
          name="topPriorities"
          rows={2}
          placeholder="1) Make MFA phishing-resistant  2) Segment the network  3) …"
          defaultValue={assessment?.topPriorities ?? ""}
        />
      </Field>

      <Field label="Recommendation">
        <TextInput
          name="recommendation"
          placeholder="e.g. Managed services + SOC monitoring"
          defaultValue={assessment?.recommendation ?? ""}
        />
      </Field>

      <Field label="Report URL">
        <TextInput
          type="url"
          name="reportUrl"
          placeholder="Link to the written report / scorecard"
          defaultValue={assessment?.reportUrl ?? ""}
        />
      </Field>

      <Field label="Notes">
        <TextArea name="notes" rows={3} defaultValue={assessment?.notes ?? ""} />
      </Field>

      <FormActions cancelHref="/assessments" />
    </form>
  );
}
