/**
 * Resolve the app's public origin for building redirect URLs (#931).
 *
 * Behind Azure App Service's reverse proxy, `req.nextUrl.origin` reflects the
 * INTERNAL listen address (e.g. `https://0.0.0.0:8080`), which is not browsable —
 * an OAuth callback that redirects there strands the user even though the connect
 * succeeded. The public host arrives in the `x-forwarded-host` / `x-forwarded-proto`
 * headers, the same source NextAuth already trusts via `trustHost: true`
 * (auth.config.ts). `nextUrl.origin` does not honour those headers, so callbacks
 * must resolve the origin explicitly.
 *
 * Precedence:
 *  1. `APP_PUBLIC_ORIGIN` env override (ops escape hatch; trailing slashes trimmed).
 *  2. `x-forwarded-host` (+ `x-forwarded-proto`, default https) — the proxied case.
 *  3. `req.nextUrl.origin` — local dev, where no proxy sits in front.
 *
 * Forwarded headers may carry a comma-separated chain (proxy hops); the first entry
 * is the original client-facing value.
 */
import type { NextRequest } from "next/server";

export function requestOrigin(req: NextRequest): string {
  const override = process.env.APP_PUBLIC_ORIGIN?.trim();
  if (override) return override.replace(/\/+$/, "");

  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return `${proto}://${forwardedHost}`;
  }

  return req.nextUrl.origin;
}
