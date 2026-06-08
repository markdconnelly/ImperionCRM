import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import type { Option, TaskEditable } from "@/lib/data/repositories";

export function TaskForm({
  action,
  task,
  accounts,
}: {
  action: (formData: FormData) => void | Promise<void>;
  task?: TaskEditable | null;
  accounts: Option[];
}) {
  return (
    <form
      action={action}
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      {task && <input type="hidden" name="id" value={task.id} />}

      <Field label="Title">
        <TextInput name="title" defaultValue={task?.title ?? ""} required />
      </Field>

      <Field label="Account">
        <Select name="accountId" defaultValue={task?.accountId ?? ""}>
          <option value="">— None —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Status">
        <Select name="status" defaultValue={task?.status ?? "open"}>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </Select>
      </Field>

      <Field label="Category">
        <Select name="category" defaultValue={task?.category ?? "general"}>
          <option value="general">General</option>
          <option value="sales">Sales</option>
          <option value="project">Project</option>
          <option value="onboarding">Onboarding</option>
        </Select>
      </Field>

      <Field label="Due date">
        <TextInput type="date" name="dueAt" defaultValue={task?.dueAt ?? ""} />
      </Field>

      <Field label="Detail">
        <TextArea name="detail" rows={3} defaultValue={task?.detail ?? ""} />
      </Field>

      <FormActions cancelHref="/tasks" />
    </form>
  );
}
