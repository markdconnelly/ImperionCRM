import { Icon } from "@/components/ui/icon";

const PERSONAL_PROVIDERS = [
  { key: "m365", label: "Microsoft 365", icon: "Mail" },
  { key: "linkedin", label: "LinkedIn", icon: "Linkedin" },
  { key: "youtube", label: "YouTube", icon: "Youtube" },
  { key: "facebook", label: "Facebook", icon: "Facebook" },
  { key: "google", label: "Google", icon: "Globe" },
  { key: "plaud", label: "Plaud", icon: "Mic" },
];

/**
 * "Connect your account" buttons (ADR-0024). Each posts a stubbed OAuth connect —
 * real token exchange + Key Vault storage land later. Scope is fixed to the
 * employee's personal account.
 */
export function ConnectAccount({
  connectAction,
}: {
  connectAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERSONAL_PROVIDERS.map((p) => (
        <form key={p.key} action={connectAction}>
          <input type="hidden" name="provider" value={p.key} />
          <input type="hidden" name="scope" value="user" />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:border-accent hover:text-text"
          >
            <Icon name={p.icon} size={14} />
            Connect {p.label}
          </button>
        </form>
      ))}
    </div>
  );
}
