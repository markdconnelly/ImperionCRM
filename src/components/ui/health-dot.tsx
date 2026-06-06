import { cn } from "@/lib/cn";
import type { Health } from "@/types";

const tone: Record<Health, string> = {
  green: "bg-green",
  amber: "bg-amber",
  red: "bg-red",
};

export function HealthDot({ health }: { health: Health }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full", tone[health])} />
    </span>
  );
}
