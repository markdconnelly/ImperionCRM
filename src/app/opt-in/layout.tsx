import type { Metadata } from "next";

/**
 * Public opt-in layout (#217). Deliberately OUTSIDE the `(app)` route group so
 * it never calls `auth()` / renders the authenticated AppShell — the page must
 * be reachable by an unauthenticated visitor (it is also excluded from the
 * sign-in gate in `src/middleware.ts`). The submit writes only an append-only
 * bronze `lead_capture_event` (ADR-0024); the backend later resolves it to a
 * contact and writes the consent event (ADR-0028).
 */
export const metadata: Metadata = {
  title: "Stay in touch — Imperion",
  description: "Opt in to receive updates and text messages from Imperion.",
  robots: { index: true, follow: false },
};

export default function OptInLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg text-text">{children}</div>;
}
