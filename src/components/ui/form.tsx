import Link from "next/link";

const inputClass =
  "w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-dim">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={inputClass} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />;
}

export function FormActions({
  cancelHref,
  submitLabel = "Save",
}: {
  cancelHref: string;
  /** Submit-button label; defaults to "Save" (back-compat). */
  submitLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <button
        type="submit"
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
      >
        {submitLabel}
      </button>
      <Link
        href={cancelHref}
        className="rounded-md border border-border px-4 py-2 text-sm text-dim hover:text-text"
      >
        Cancel
      </Link>
    </div>
  );
}
