import type { NavItem } from "@/types";

/**
 * Application navigation. Each item maps to a real route (App Router). The
 * sidebar renders these as links and the top bar derives the page title from the
 * active route. Icons are lucide-react names resolved by <Icon />.
 */
// Top group: the cross-cutting overviews — dashboard, pipeline, and reporting.
export const navPrimary: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", href: "/" },
  { key: "pipeline", label: "Pipeline", icon: "GitBranch", href: "/pipeline" },
  { key: "reporting", label: "Reporting", icon: "BarChart3", href: "/reporting" },
];

// Main work group (below the divider): the customer journey — Accounts, the
// people in them (Contacts, with Leads reached via the in-page toggle, ADR-0031),
// how we reach them (Campaigns, Communications), the engagements (Discovery →
// Assessments → Proposals), delivery (Onboarding), and operations (Tasks,
// Tickets, Business Reviews, Reporting).
export const navSecondary: NavItem[] = [
  { key: "accounts", label: "Accounts", icon: "Building2", href: "/accounts" },
  { key: "contacts", label: "Contacts", icon: "Contact", href: "/contacts" },
  { key: "campaigns", label: "Campaigns", icon: "Megaphone", href: "/campaigns" },
  { key: "communications", label: "Communications", icon: "MessagesSquare", href: "/communications" },
  { key: "discovery", label: "Discovery", icon: "ClipboardList", href: "/discovery" },
  { key: "assessments", label: "Assessments", icon: "ShieldAlert", href: "/assessments" },
  { key: "proposals", label: "Proposals", icon: "FileText", href: "/proposals" },
  { key: "contracts", label: "Contracts", icon: "FileSignature", href: "/contracts" },
  { key: "onboarding", label: "Onboarding", icon: "Rocket", href: "/onboarding" },
  { key: "tasks", label: "Tasks", icon: "ListChecks", href: "/tasks" },
  { key: "tickets", label: "Tickets", icon: "Ticket", href: "/tickets" },
  { key: "sbr", label: "Business Reviews", icon: "CalendarCheck", href: "/sbr" },
];

// System group (bottom): the AI surfaces and Settings. Feedback sits LAST —
// the bottom of the whole menu (Mark's UI review, 2026-06-09).
export const navTertiary: NavItem[] = [
  { key: "agents", label: "AI Agents", icon: "Bot", href: "/agents" },
  { key: "board", label: "Board of Directors", icon: "Users", href: "/board" },
  { key: "settings", label: "Settings", icon: "Settings", href: "/settings" },
  { key: "feedback", label: "Feedback", icon: "Lightbulb", href: "/feedback" },
];

// Routes that exist but are NOT rendered in the sidebar (reached from elsewhere),
// kept here so the top bar still resolves their title:
//  - security: under Settings (admin-only, ADR-0030)
//  - leads: reached via the Leads⟷Contacts toggle on /contacts (ADR-0031)
//  - consent: now a per-contact attribute on the Contact 360 (the /consent route
//    remains as the org-wide ledger but is unlinked)
//  - knowledge / workflows / questions: moved under Settings → Tools & configuration
export const navHidden: NavItem[] = [
  { key: "security", label: "Security", icon: "ShieldCheck", href: "/security" },
  { key: "leads", label: "Leads", icon: "UserPlus", href: "/leads" },
  { key: "consent", label: "Consent", icon: "FileCheck", href: "/consent" },
  { key: "knowledge", label: "Knowledge", icon: "BrainCircuit", href: "/knowledge" },
  { key: "workflows", label: "Workflows", icon: "Workflow", href: "/workflows" },
  { key: "questions", label: "Questions", icon: "FileQuestion", href: "/questions" },
];

export const navAll: NavItem[] = [...navPrimary, ...navSecondary, ...navTertiary, ...navHidden];

/** Title for the current path: exact match, else longest matching prefix. */
export function titleForPath(pathname: string): string {
  const exact = navAll.find((n) => n.href === pathname);
  if (exact) return exact.label;
  const nested = navAll
    .filter((n) => n.href !== "/" && pathname.startsWith(n.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return nested?.label ?? "Imperion Business Manager";
}

/** Active-state test for a nav item against the current path. */
export function isActivePath(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
