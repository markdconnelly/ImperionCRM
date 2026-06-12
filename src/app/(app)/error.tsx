"use client";

import { Icon } from "@/components/ui/icon";

/**
 * Route error boundary for the app shell (#193). The main reason a page throws here
 * in production is `DataUnavailableError` — a repository call failed against the
 * configured database and refused to substitute demo data. Show an honest outage
 * state instead of fake numbers, and offer a retry.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <Icon name="AlertTriangle" size={28} className="text-amber" />
      <div>
        <h2 className="font-display text-lg text-text">Live data is unavailable</h2>
        <p className="mt-1 max-w-md text-sm text-dim">
          This page could not load from the database, so nothing is shown rather than
          showing stale or demo data. Try again in a moment — if it persists, check the
          database and app logs.
        </p>
        {error.digest && (
          <p className="mt-2 text-[11px] text-dim">Error reference: {error.digest}</p>
        )}
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-border px-4 py-1.5 text-sm text-text hover:border-accent"
      >
        Try again
      </button>
    </div>
  );
}
