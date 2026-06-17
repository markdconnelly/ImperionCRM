import type { Metadata } from "next";
import { submitOptInAction } from "./actions";
import {
  EMAIL_CONSENT_TEXT,
  ORG_NAME,
  PRIVACY_URL,
  SMS_CONSENT_TEXT,
  SMS_HELP_TEXT,
  TERMS_URL,
} from "./consent-language";

/**
 * Public opt-in / consent capture page (#217). The artifact submitted to (and
 * screenshotted for) the ACS toll-free SMS verification — so the opt-in language
 * is shown verbatim and in full. The form posts to a server action that records
 * an append-only bronze `lead_capture_event` (ADR-0024); no auth, no direct
 * consent-ledger or contact write (the backend owns that, ADR-0028).
 *
 * `force-dynamic` so the confirmation/error state always reflects the submit.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Stay in touch — ${ORG_NAME}`,
};

const inputCls =
  "w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none";

export default async function OptInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const submitted = params.submitted === "1";
  const error = params.error === "1";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12">
      <div className="rounded-xl border border-border bg-panel p-8">
        <h1 className="font-display text-xl font-semibold tracking-tight text-text">
          Stay in touch with {ORG_NAME}
        </h1>

        {submitted ? (
          <div className="mt-4">
            <p className="text-sm text-text">
              Thanks — your preferences have been recorded. You can reply{" "}
              <span className="font-medium">STOP</span> to any text message to
              unsubscribe at any time, or{" "}
              <span className="font-medium">HELP</span> for help.
            </p>
            <a
              href="/opt-in"
              className="mt-6 inline-block text-xs text-dim underline-offset-2 hover:text-text hover:underline"
            >
              ← Submit another response
            </a>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-dim">
              Opt in below to hear from us. Choose the channels you want — you can
              change your mind at any time.
            </p>

            {error && (
              <p className="mt-4 rounded-md border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
                Please enter your name and choose at least one channel, supplying
                the matching phone number or email.
              </p>
            )}

            <form action={submitOptInAction} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-dim">Name</span>
                <input name="name" required className={inputCls} placeholder="Your name" />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-dim">Mobile number (for texts)</span>
                <input
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className={inputCls}
                  placeholder="+1 555 555 5555"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-dim">Email</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={inputCls}
                  placeholder="you@example.com"
                />
              </label>

              {/* SMS consent — the language reviewed by ACS toll-free verification. */}
              <label className="flex items-start gap-3 rounded-md border border-border bg-panel-2 p-3">
                <input
                  name="consentSms"
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-accent"
                />
                <span className="text-xs leading-relaxed text-text">{SMS_CONSENT_TEXT}</span>
              </label>

              {/* Email consent. */}
              <label className="flex items-start gap-3 rounded-md border border-border bg-panel-2 p-3">
                <input
                  name="consentEmail"
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-accent"
                />
                <span className="text-xs leading-relaxed text-text">{EMAIL_CONSENT_TEXT}</span>
              </label>

              <button
                type="submit"
                className="mt-1 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
              >
                Opt in
              </button>
            </form>

            <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-dim">
              {SMS_HELP_TEXT}{" "}
              See our{" "}
              <a href={PRIVACY_URL} className="underline underline-offset-2 hover:text-text">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href={TERMS_URL} className="underline underline-offset-2 hover:text-text">
                Terms
              </a>
              . Consent is not a condition of purchase. Msg &amp; data rates may apply.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
