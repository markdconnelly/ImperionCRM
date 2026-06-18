import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { OutOfPocketForm } from "@/components/expenses/out-of-pocket-form";
import { getRepositories } from "@/lib/data";
import { parsePeriod, periodKey, periodLabel, periodOf } from "@/lib/expenses/overview";

/**
 * Add an out-of-pocket expense (ADR-0083, #487) — the one item kind the employee hand-
 * enters (mileage comes from MileIQ). Drilled into from the month's expense report. The
 * category list is the visible mapped subset (`listExpenseCategories`, comp-free); the
 * write action takes the employee from the session and re-checks the report is Open + owned.
 */
export default async function NewOutOfPocketPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  // Default to the month being viewed, falling back to the current calendar month.
  const period = sp.period && parsePeriod(sp.period) ? sp.period : periodKey(periodOf(today));
  const p = parsePeriod(period)!;

  const { crm } = getRepositories();
  const categories = await crm.listExpenseCategories();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={`/expenses?period=${period}`} className="text-sm text-dim hover:text-text">
          ← Back to expenses
        </Link>
        <PageHeader
          title="Add expense"
          description={`${periodLabel(p)} report · out-of-pocket item`}
        />
      </div>
      <OutOfPocketForm period={period} defaultDate={today} categories={categories} error={sp.error} />
    </div>
  );
}
