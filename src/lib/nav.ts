import type { NavItem } from "@/types";

/**
 * Application navigation. Each item maps to a real route (App Router). The
 * sidebar renders these as links and the top bar derives the page title from the
 * active route. Icons are lucide-react names resolved by <Icon />.
 */
// Order is intentional (the customer journey): companies first, then the
// contact lifecycle (Pipeline), the people in it (Leads → Contacts), how we
// reach them (Campaigns, Communications), the engagements (Discovery →
// Assessments → Proposals), delivery (Onboarding), and operations (Tasks,
// Tickets, Business Reviews, Reporting).
export const navPrimary: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", href: "/" },
  { key: "accounts", label: "Accounts", icon: "Building2", href: "/accounts" },
  { key: "pipeline", label: "Pipeline", icon: "GitBranch", href: "/pipeline" },
  { key: "leads", label: "Leads", icon: "UserPlus", href: "/leads" },
  { key: "contacts", label: "Contacts", icon: "Contact", href: "/contacts" },
  { key: "campaigns", label: "Campaigns", icon: "Megaphone", href: "/campaigns" },
  { key: "communications", label: "Communications", icon: "MessagesSquare", href: "/communications" },
  { key: "discovery", label: "Discovery", icon: "ClipboardList", href: "/discovery" },
  { key: "assessments", label: "Assessments", icon: "ShieldAlert", href: "/assessments" },
  { key: "proposals", label: "Proposals", icon: "FileText", href: "/proposals" },
  { key: "onboarding", label: "Onboarding", icon: "Rocket", href: "/onboarding" },
  { key: "tasks", label: "Tasks", icon: "ListChecks", href: "/tasks" },
  { key: "tickets", label: "Tickets", icon: "Ticket", href: "/tickets" },
  { key: "sbr", label: "Business Reviews", icon: "CalendarCheck", href: "/sbr" },
  { key: "reporting", label: "Reporting", icon: "BarChart3", href: "/reporting" },
];

// Security is no longer a top-level item — it lives under Settings (admin-only,
// ADR-0030). Consent is managed per-contact on the Contact 360; this entry is
// the org-wide ledger/audit view.
export const navSecondary: NavItem[] = [
  { key: "knowledge", label: "Knowledge", icon: "BrainCircuit", href: "/knowledge" },
  { key: "workflows", label: "Workflows", icon: "Workflow", href: "/workflows" },
  { key: "consent", label: "Consent", icon: "FileCheck", href: "/consent" },
  { key: "integrations", label: "Integrations", icon: "Plug", href: "/integrations" },
  { key: "agents", label: "AI Agents", icon: "Bot", href: "/agents" },
  { key: "board", label: "Board of Directors", icon: "Users", href: "/board" },
  { key: "feedback", label: "Feedback", icon: "Lightbulb", href: "/feedback" },
  { key: "questions", label: "Questions", icon: "FileQuestion", href: "/questions" },
  { key: "settings", label: "Settings", icon: "Settings", href: "/settings" },
];

// Routes that exist but are not rendered in the sidebar (reached from within
// another page). Included in title resolution so the top bar shows the right
// heading.
export const navHidden: NavItem[] = [
  { key: "security", label: "Security", icon: "ShieldCheck", href: "/security" },
];

export const navAll: NavItem[] = [...navPrimary, ...navSecondary, ...navHidden];

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
