import type { NavItem } from "@/types";

/**
 * Application navigation. Each item maps to a real route (App Router). The
 * sidebar renders these as links and the top bar derives the page title from the
 * active route. Icons are lucide-react names resolved by <Icon />.
 */
export const navPrimary: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", href: "/" },
  { key: "accounts", label: "Accounts", icon: "Building2", href: "/accounts" },
  { key: "pipeline", label: "Pipeline", icon: "GitBranch", href: "/pipeline" },
  { key: "proposals", label: "Proposals", icon: "FileText", href: "/proposals" },
  { key: "onboarding", label: "Onboarding", icon: "Rocket", href: "/onboarding" },
  { key: "campaigns", label: "Campaigns", icon: "Megaphone", href: "/campaigns" },
  { key: "communications", label: "Communications", icon: "MessagesSquare", href: "/communications" },
  { key: "reporting", label: "Reporting", icon: "BarChart3", href: "/reporting" },
];

export const navSecondary: NavItem[] = [
  { key: "knowledge", label: "Knowledge", icon: "BrainCircuit", href: "/knowledge" },
  { key: "integrations", label: "Integrations", icon: "Plug", href: "/integrations" },
  { key: "board", label: "Board of Directors", icon: "Users", href: "/board" },
  { key: "feedback", label: "Feedback", icon: "Lightbulb", href: "/feedback" },
  { key: "security", label: "Security", icon: "ShieldCheck", href: "/security" },
  { key: "settings", label: "Settings", icon: "Settings", href: "/settings" },
];

export const navAll: NavItem[] = [...navPrimary, ...navSecondary];

/** Title for the current path: exact match, else longest matching prefix. */
export function titleForPath(pathname: string): string {
  const exact = navAll.find((n) => n.href === pathname);
  if (exact) return exact.label;
  const nested = navAll
    .filter((n) => n.href !== "/" && pathname.startsWith(n.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return nested?.label ?? "Imperion CRM";
}

/** Active-state test for a nav item against the current path. */
export function isActivePath(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
