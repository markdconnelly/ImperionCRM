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
// Assessments → Proposals), delivery (Onboarding), and operations (Sales
// Activity, Tasks, Tickets, Business Reviews, Reporting).
export const navSecondary: NavItem[] = [
  { key: "accounts", label: "Accounts", icon: "Building2", href: "/accounts" },
  { key: "contacts", label: "Contacts", icon: "Contact", href: "/contacts" },
  { key: "campaigns", label: "Campaigns", icon: "Megaphone", href: "/campaigns" },
  // Events are first-class objects campaigns promote (ADR-0053 §1).
  { key: "events", label: "Events", icon: "CalendarDays", href: "/events" },
  { key: "communications", label: "Communications", icon: "MessagesSquare", href: "/communications" },
  { key: "discovery", label: "Discovery", icon: "ClipboardList", href: "/discovery" },
  { key: "assessments", label: "Assessments", icon: "ShieldAlert", href: "/assessments" },
  { key: "proposals", label: "Proposals", icon: "FileText", href: "/proposals" },
  { key: "contracts", label: "Contracts", icon: "FileSignature", href: "/contracts" },
  // The project board (ADR-0052) — "board" unqualified is the AI Board of Directors.
  { key: "projects", label: "Projects", icon: "FolderKanban", href: "/projects" },
  { key: "onboarding", label: "Onboarding", icon: "Rocket", href: "/onboarding" },
  // The Sales Queue read model (ADR-0052 §6) — a rep's open sales tasks + meetings.
  { key: "sales-activity", label: "Sales Activity", icon: "Activity", href: "/sales-activity" },
  { key: "tasks", label: "Tasks", icon: "ListChecks", href: "/tasks" },
  // The employee's own weekly timesheet — enter time + attest (ADR-0082).
  { key: "timesheets", label: "Timesheets", icon: "Clock", href: "/timesheets" },
  // The employee's own monthly expense reports — log + attest (ADR-0083, #547).
  { key: "expenses", label: "Expenses", icon: "Receipt", href: "/expenses" },
  // Unified timesheet administration: one all-users lifecycle table (correctness +
  // payroll) with filters + sorting (admin∨finance, ADR-0082 #539). Absorbs the former
  // Time Approvals + Payroll Approval queues into one surface.
  { key: "time-admin", label: "Time Admin", icon: "ClipboardCheck", href: "/timesheets/admin" },
  // Admin one-time setup: employee Autotask Resource / QuickBooks vendor mapping (admin-only, ADR-0082 #468).
  { key: "time-mappings", label: "Employee Mapping", icon: "Link2", href: "/timesheets/mappings" },
  // Unified expense administration: one all-users lifecycle table (correctness + finance)
  // with filters + sorting (admin∨finance, ADR-0083 #548).
  { key: "expense-admin", label: "Expense Admin", icon: "ReceiptText", href: "/expenses/admin" },
  // Admin setup: map the synced QuickBooks chart of accounts → clean website expense
  // categories (admin-only, ADR-0083 #489). QuickBooks stays read-only — the app never writes it.
  { key: "expense-categories", label: "Expense Categories", icon: "Tags", href: "/expenses/categories" },
  // Payroll-gated comp setup: the effective-dated SYSTEM mileage rate (finance∨admin, ADR-0083 #490).
  // COMP DATA — gated like Pay Rate; never visible to employee/agent/client roles.
  { key: "expense-mileage-rate", label: "Mileage Rate", icon: "Gauge", href: "/expenses/mileage-rate" },
  // The unified Monthly Close: one finance task rolling up BOTH legs (time + reimbursable
  // expense) per employee per month, with QuickBooks read-back status (finance∨admin,
  // ADR-0083 #491, amends ADR-0082). The app never pays — finance authorizes the manual payment.
  { key: "monthly-close", label: "Monthly Close", icon: "CalendarRange", href: "/monthly-close" },
  { key: "tickets", label: "Tickets", icon: "Ticket", href: "/tickets" },
  { key: "devices", label: "Devices & Assets", icon: "MonitorSmartphone", href: "/devices" },
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
