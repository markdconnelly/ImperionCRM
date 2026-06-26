/**
 * Look-ahead window vocabulary for the expiry radar (#1323, renewals epic #1304).
 *
 * Side-effect-free (no `server-only`, no DB) so it is safe to import from both the
 * server read-model (`expiry-radar.ts`) and unit tests. The radar's only tunable
 * input is which window to look ahead by.
 */

/** The look-ahead windows the radar offers, in days. First entry is the smallest. */
export const EXPIRY_WINDOWS = [30, 60, 90] as const;
export type ExpiryWindow = (typeof EXPIRY_WINDOWS)[number];

/** Default window when none (or an unsupported value) is requested. */
export const DEFAULT_EXPIRY_WINDOW: ExpiryWindow = 90;

/** Coerce an arbitrary query-string value to a supported window, else the default. */
export function parseExpiryWindow(raw: string | string[] | undefined): ExpiryWindow {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return (EXPIRY_WINDOWS as readonly number[]).includes(n)
    ? (n as ExpiryWindow)
    : DEFAULT_EXPIRY_WINDOW;
}
