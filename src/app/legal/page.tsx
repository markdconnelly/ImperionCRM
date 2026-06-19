import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc, LEGAL_ENTITY, P, PRODUCT_NAME } from "./legal-ui";

export const metadata: Metadata = {
  title: "Legal — Imperion Business Manager",
  description: `Legal documents for ${PRODUCT_NAME}.`,
  robots: { index: true, follow: true },
};

const docs = [
  {
    href: "/legal/privacy",
    label: "Privacy Policy",
    blurb: "How we collect, use, store, and protect information, including QuickBooks Online data.",
  },
  {
    href: "/legal/eula",
    label: "End-User License Agreement",
    blurb: "The terms governing access to and use of the Application.",
  },
];

export default function LegalIndexPage() {
  return (
    <LegalDoc title="Legal" subtitle={`Legal documents for ${PRODUCT_NAME}, published by ${LEGAL_ENTITY}.`}>
      <div className="grid gap-4 sm:grid-cols-2">
        {docs.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="rounded-lg border border-border bg-panel p-5 transition-colors hover:border-accent"
          >
            <h2 className="font-display text-lg font-semibold text-text">{d.label}</h2>
            <p className="mt-2 text-sm text-dim">{d.blurb}</p>
          </Link>
        ))}
      </div>
      <P>
        For questions about these documents, see the contact details within each page.
      </P>
    </LegalDoc>
  );
}
