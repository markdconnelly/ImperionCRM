import Link from "next/link";
import type { IntelStrip } from "@/types";

const fmt = new Intl.NumberFormat("en-US");

/**
 * Cross-domain intelligence strip (ADR-0062, #292): one glance over the BI-hub
 * domains, each card deep-linking to its /reporting anchor (or /security).
 * Null values render as "—" with a no-coverage hint — sources that haven't
 * started flowing yet (server bringup, local #102) are never shown as zero.
 */
export function IntelStripRow({ intel }: { intel: IntelStrip }) {
  const cards = [
    {
      label: "New leads (7d)",
      value: fmt.format(intel.newLeads7d),
      hint: "all capture sources",
      href: "/reporting#marketing",
    },
    {
      label: "Tickets opened (30d)",
      value: fmt.format(intel.ticketsOpened30d),
      hint: "service desk",
      href: "/reporting#service-desk",
    },
    {
      label: "Defender incidents open",
      value: intel.defenderOpen != null ? fmt.format(intel.defenderOpen) : "—",
      hint: intel.defenderOpen != null ? "fleet-wide" : "no coverage yet",
      href: "/reporting#security",
      alert: intel.defenderOpen != null && intel.defenderOpen > 0,
    },
    {
      label: "MFA registered",
      value: intel.mfaPct != null ? `${intel.mfaPct}%` : "—",
      hint: intel.mfaPct != null ? "fleet-wide" : "no coverage yet",
      href: "/reporting#security",
    },
    {
      label: "Social engagement (30d)",
      value: intel.socialEngagement30d != null ? fmt.format(intel.socialEngagement30d) : "—",
      hint: intel.socialEngagement30d != null ? "organic FB + IG" : "no posts yet",
      href: "/reporting#marketing",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="rounded-lg border border-border bg-panel p-4 transition-colors hover:bg-panel-2"
        >
          <div className="text-xs text-dim">{c.label}</div>
          <div
            className={`mt-2 font-display text-2xl font-semibold tracking-tight ${
              c.alert ? "text-red" : ""
            }`}
          >
            {c.value}
          </div>
          <div className="mt-1 text-xs text-dim">{c.hint}</div>
        </Link>
      ))}
    </div>
  );
}
