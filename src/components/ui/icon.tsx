"use client";

import * as Lucide from "lucide-react";
import type { LucideProps } from "lucide-react";

// Resolve a lucide icon by name from our typed nav data, with a safe fallback.
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp =
    (Lucide as unknown as Record<string, React.ComponentType<LucideProps>>)[
      name
    ] ?? Lucide.Circle;
  return <Cmp {...props} />;
}
