/**
 * Shared presentation for the public legal pages (#934 / #497). Plain server
 * components (no client JS, statically rendered) so the EULA + Privacy Policy are
 * fast and reachable by an unauthenticated reviewer (e.g. Intuit's QBO app review).
 * Styling uses the app's design tokens but pulls in none of the authenticated shell.
 */
import Link from "next/link";
import type { ReactNode } from "react";

/** The legal entity these documents are published by. Confirm against counsel. */
export const LEGAL_ENTITY = "Imperion LLC";
/** Public contact for privacy / legal inquiries. Confirm the address. */
export const LEGAL_CONTACT = "privacy@imperionllc.com";
/** The product surface these terms govern. */
export const PRODUCT_NAME = "Imperion OS";
/** Effective / last-updated date shown on every document. */
export const EFFECTIVE_DATE = "June 18, 2026";

export function LegalDoc({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <header className="mb-10 border-b border-border pb-8">
        <p className="text-sm font-medium text-accent">{PRODUCT_NAME}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-3 text-base text-dim">{subtitle}</p> : null}
        <p className="mt-4 text-sm text-dim">
          Effective {EFFECTIVE_DATE} · Published by {LEGAL_ENTITY}
        </p>
      </header>
      <div className="space-y-8 text-[15px] leading-relaxed text-text/90">{children}</div>
    </article>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold text-text">{heading}</h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-text/85">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6 text-text/85 marker:text-dim">{children}</ul>;
}

export function LI({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

export function MailLink() {
  return (
    <a className="text-accent underline-offset-2 hover:underline" href={`mailto:${LEGAL_CONTACT}`}>
      {LEGAL_CONTACT}
    </a>
  );
}

export function CrossLinks({ current }: { current: "privacy" | "eula" | "index" }) {
  const items = [
    { key: "privacy", href: "/legal/privacy", label: "Privacy Policy" },
    { key: "eula", href: "/legal/eula", label: "End-User License Agreement" },
  ] as const;
  return (
    <nav className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-6 text-sm">
      {items
        .filter((i) => i.key !== current)
        .map((i) => (
          <Link key={i.key} href={i.href} className="text-accent hover:underline">
            {i.label}
          </Link>
        ))}
      <Link href="/" className="text-dim hover:text-text">
        Back to {PRODUCT_NAME}
      </Link>
    </nav>
  );
}
