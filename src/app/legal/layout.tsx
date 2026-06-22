import type { Metadata } from "next";

/**
 * Public legal layout (#934 / #497). Deliberately OUTSIDE the `(app)` route group
 * so it never calls `auth()` / renders the authenticated AppShell — the EULA and
 * Privacy Policy must be reachable by an unauthenticated visitor (Intuit's
 * QuickBooks app review fetches the URLs without an Entra login). It is also
 * excluded from the sign-in gate in `src/middleware.ts` (the `legal(?:$|/)` anchor).
 */
export const metadata: Metadata = {
  title: "Legal — Imperion OS",
  description:
    "Privacy Policy and End-User License Agreement for Imperion OS.",
  robots: { index: true, follow: true },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg text-text">{children}</div>;
}
