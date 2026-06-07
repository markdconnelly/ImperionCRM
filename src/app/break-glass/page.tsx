import { signIn } from "@/auth";

/**
 * Break-glass emergency access (ADR-0008). A non-Entra account that can sign in
 * when SSO is unavailable. Gated by the break-glass credentials provider, which
 * is disabled unless BREAKGLASS_* env is set and audit-logs every use.
 *
 * `force-dynamic` so the page is never statically cached.
 */
export const dynamic = "force-dynamic";

export default function BreakGlassPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-text">
      <div className="w-full max-w-sm rounded-xl border border-amber/40 bg-panel p-8">
        <div className="mb-2 flex items-center gap-2 text-amber">
          <span className="font-display text-sm font-semibold tracking-tight">
            Break-glass access
          </span>
        </div>
        <p className="text-sm text-dim">
          Emergency bypass of Entra SSO. Use only when single sign-on is
          unavailable. This sign-in is audit-logged.
        </p>

        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("break-glass", {
              username: String(formData.get("username") ?? ""),
              password: String(formData.get("password") ?? ""),
              redirectTo: "/",
            });
          }}
          className="mt-6 flex flex-col gap-3"
        >
          <input
            name="username"
            placeholder="Username"
            autoComplete="off"
            required
            className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="off"
            required
            className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="mt-1 rounded-md bg-amber px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-amber/90"
          >
            Break-glass sign in
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-4 text-center">
          <a
            href="/login"
            className="text-xs text-dim underline-offset-2 hover:text-text hover:underline"
          >
            ← Back to SSO
          </a>
        </div>
      </div>
    </main>
  );
}
