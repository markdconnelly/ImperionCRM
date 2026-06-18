import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { MileageForm } from "@/components/expenses/mileage-form";
import { parsePeriod, periodKey, periodLabel, periodOf } from "@/lib/expenses/overview";

/**
 * Add manual mileage (ADR-0083, #853) — the v1 interim while the MileIQ API is paywalled
 * (full MileIQ → v2). Drilled into from the month's expense report. The employee enters
 * miles only; the reimbursement $ is derived on approval (the mileage rate is comp data),
 * so no dollar figure is shown. Self-scoped — the write action takes the employee from the
 * session and re-checks the report is Open + owned.
 */
export default async function NewMileagePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  // Default to the month being viewed, falling back to the current calendar month.
  const period = sp.period && parsePeriod(sp.period) ? sp.period : periodKey(periodOf(today));
  const p = parsePeriod(period)!;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={`/expenses?period=${period}`} className="text-sm text-dim hover:text-text">
          ← Back to expenses
        </Link>
        <PageHeader
          title="Add mileage"
          description={`${periodLabel(p)} report · MileIQ is unavailable — log drives manually`}
        />
      </div>
      <MileageForm period={period} defaultDate={today} error={sp.error} />
    </div>
  );
}
