import { signIn } from "@/auth";

/**
 * Sign-in page (CLAUDE.md §7.3). Primary path is Entra SSO (ADR-0002/0005).
 * The emergency bypass lives behind the /break-glass link (ADR-0008).
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-text">
      <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-2 text-sm font-bold text-white">
            I
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            Imperion CRM
          </span>
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-dim">
          Access is scoped to your Entra permissions.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Sign in with Microsoft
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-4 text-center">
          <a
            href="/break-glass"
            className="text-xs text-dim underline-offset-2 hover:text-text hover:underline"
          >
            Emergency access (break-glass)
          </a>
        </div>
      </div>
    </main>
  );
}
