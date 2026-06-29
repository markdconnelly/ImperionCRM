import type { NavItem } from "@/types";

/**
 * Application navigation — the consolidated information architecture (#794, ADR-0030).
 *
 * The sidebar renders three bands: a flat TOP band, a set of collapsible MID
 * groups (Employee · Marketing · Sales · Projects · Service · Finance), and a
 * BOTTOM band (Board · Reports group · Feedback · Settings group). A group header
 * has `children`; a leaf item has a real `href`. Visibility is role-driven and
 * hide-entirely — `canSeeFeature(key, roles)` keys each group header off its
 * `grp-*` key and each leaf off its own key (`src/lib/auth/roles.ts`).
 *
 * Icons are lucide-react names resolved by <Icon />. `navAll` (every leaf, flattened)
 * still backs the top-bar title lookup, so every route — grouped, hidden, or admin —
 * resolves a label.
 */

// ── TOP band (flat): the cross-cutting overviews. Visible to all roles.
export const navTop: NavItem[] = [
  // Jarvis — the orchestrator front door + default post-login landing (#1118). First entry.
  { key: "jarvis", label: "Jarvis", icon: "Sparkles", href: "/jarvis" },
  { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", href: "/" },
  // Renamed from "Reporting" → "Global Reporting" (#794): the BI hub landing page;
  // the per-domain report leaves live in the Reports group at the bottom.
  { key: "reporting", label: "Global Reporting", icon: "BarChart3", href: "/reporting" },
  { key: "accounts", label: "Accounts", icon: "Building2", href: "/accounts" },
  { key: "contacts", label: "Contacts", icon: "Contact", href: "/contacts" },
  // CMDB CI register (ADR-0078) — admin | support(Technician), `canSeeCmdb`.
  { key: "cmdb", label: "CMDB", icon: "Network", href: "/cmdb" },
  // Org tree (#1539) — the agent org (Nova → C-suite → domains → playbooks) derived
  // from icm/org.yaml + the live dial/queue overlay. Admin gate (`canSeeAgentPages`),
  // same as the agent surfaces it visualizes.
  { key: "org", label: "Org", icon: "Workflow", href: "/org" },
];

// ── MID band: collapsible groups. Each group header carries a `grp-*` key whose
// guard hides the whole group (header + children) for roles that lack it.
export const navGroups: NavItem[] = [
  {
    key: "grp-employee",
    label: "Employee",
    icon: "Briefcase",
    href: "#employee",
    children: [
      { key: "timesheets", label: "Timesheets", icon: "Clock", href: "/timesheets" },
      { key: "expenses", label: "Expenses", icon: "Receipt", href: "/expenses" },
    ],
  },
  {
    key: "grp-marketing",
    label: "Marketing",
    icon: "Megaphone",
    href: "#marketing",
    children: [
      { key: "segments", label: "Segments", icon: "Users", href: "/segments" },
      { key: "campaigns", label: "Campaigns", icon: "Megaphone", href: "/campaigns" },
      // Social Media Management plane (ADR-0124, epic #1338) — unified inbox + publishing.
      // Belle owns the channel, so it rides the marketing group gate.
      { key: "social", label: "Social", icon: "Share2", href: "/social" },
      { key: "journeys", label: "Journeys", icon: "Waypoints", href: "/journeys" },
      { key: "message-templates", label: "Message templates", icon: "Mail", href: "/message-templates" },
      { key: "events", label: "Events", icon: "CalendarDays", href: "/events" },
      { key: "threads", label: "Threads", icon: "AtSign", href: "/threads" },
      { key: "service-desk-chat", label: "Live Chat", icon: "Headset", href: "/service-desk/chat" },
      { key: "service-desk", label: "Omnichannel queue", icon: "Inbox", href: "/service-desk" },
      { key: "intake", label: "Intake forms", icon: "FilePlus2", href: "/intake" },
    ],
  },
  {
    key: "grp-sales",
    label: "Sales",
    icon: "TrendingUp",
    href: "#sales",
    children: [
      { key: "communications", label: "Communications", icon: "MessagesSquare", href: "/communications" },
      { key: "discovery", label: "Discovery", icon: "ClipboardList", href: "/discovery" },
      { key: "assessments", label: "Assessment", icon: "ShieldAlert", href: "/assessments" },
      { key: "proposals", label: "Proposals", icon: "FileText", href: "/proposals" },
      { key: "sales-activity", label: "Sales activity", icon: "Activity", href: "/sales-activity" },
      { key: "tasks-sales", label: "Sales tasks", icon: "ListChecks", href: "/tasks" },
      { key: "pipeline", label: "Pipeline", icon: "GitBranch", href: "/pipeline" },
    ],
  },
  {
    key: "grp-projects",
    label: "Projects",
    icon: "FolderKanban",
    href: "#projects",
    children: [
      { key: "onboarding", label: "Onboarding", icon: "Rocket", href: "/onboarding" },
      { key: "projects", label: "Project board", icon: "FolderKanban", href: "/projects" },
      { key: "tasks-projects", label: "Project tasks", icon: "ListChecks", href: "/tasks" },
    ],
  },
  {
    key: "grp-service",
    label: "Service",
    icon: "LifeBuoy",
    href: "#service",
    children: [
      { key: "tickets", label: "Tickets", icon: "Ticket", href: "/tickets" },
      { key: "changes", label: "Changes", icon: "GitPullRequestArrow", href: "/changes" },
      { key: "service-desk-sla", label: "SLA dashboard", icon: "Timer", href: "/service-desk/sla" },
      { key: "knowledge", label: "Knowledgebase", icon: "BrainCircuit", href: "/knowledge" },
      // Grounding-conflict cockpit (#1217, ADR-0119): tri-tier disagreements awaiting a domain
      // owner's resolution. Broad read (transparency); resolving is owner-scoped at the DB.
      { key: "grounding-conflicts", label: "Grounding conflicts", icon: "Scale", href: "/knowledge/grounding-conflicts" },
      { key: "sbr", label: "Business Reviews", icon: "CalendarCheck", href: "/sbr" },
    ],
  },
  {
    key: "grp-finance",
    label: "Finance",
    icon: "Banknote",
    href: "#finance",
    children: [
      { key: "contracts", label: "Contracts", icon: "FileSignature", href: "/contracts" },
      // Expiry radar (#1323, renewals epic #1304) — the renewal worklist read-view.
      { key: "renewals", label: "Renewals", icon: "CalendarClock", href: "/renewals" },
      { key: "collections", label: "Collections", icon: "BadgeDollarSign", href: "/collections" },
      { key: "monthly-close", label: "Monthly close", icon: "CalendarRange", href: "/monthly-close" },
    ],
  },
];

// ── BOTTOM band: Board · Reports group · Feedback · Settings group. Feedback sits
// LAST in the band's flat items (Mark's UI review). Board + Settings are admin-only.
export const navBottom: NavItem[] = [
  { key: "board", label: "Board of Directors", icon: "Users", href: "/board" },
  {
    key: "grp-reports",
    label: "Reports",
    icon: "PieChart",
    href: "#reports",
    children: [
      { key: "report-marketing", label: "Marketing", icon: "Megaphone", href: "/reporting/marketing" },
      { key: "report-sales", label: "Sales", icon: "TrendingUp", href: "/reporting/sales" },
      { key: "report-projects", label: "Project", icon: "FolderKanban", href: "/reporting/projects" },
      { key: "report-service", label: "Service", icon: "LifeBuoy", href: "/reporting/service" },
      { key: "report-finance", label: "Finance", icon: "Banknote", href: "/reporting/finance" },
      { key: "report-expense", label: "Expense", icon: "ReceiptText", href: "/reporting/expense" },
    ],
  },
  { key: "feedback", label: "Feedback", icon: "Lightbulb", href: "/feedback" },
  {
    key: "grp-settings",
    label: "Settings",
    icon: "Settings",
    href: "#settings",
    children: [
      { key: "expense-categories", label: "Expense categories", icon: "Tags", href: "/expenses/categories" },
      { key: "expense-admin", label: "Expense admin", icon: "ReceiptText", href: "/expenses/admin" },
      { key: "expense-mileage-rate", label: "Mileage rate", icon: "Gauge", href: "/expenses/mileage-rate" },
      { key: "agents", label: "AI agents", icon: "Bot", href: "/agents" },
      { key: "operator-technician", label: "Technician cockpit", icon: "Wrench", href: "/operator/technician" },
      { key: "operator-cockpit", label: "Approval cockpit", icon: "ShieldCheck", href: "/operator/cockpit" },
      { key: "operator-events", label: "Wake events & DLQ", icon: "Radio", href: "/operator/events" },
      { key: "workflows", label: "Workflows", icon: "Workflow", href: "/workflows" },
      { key: "questions", label: "Questions", icon: "FileQuestion", href: "/questions" },
      { key: "settings-assessment-types", label: "Assessment types", icon: "ListChecks", href: "/settings/assessment-types" },
      { key: "custom-fields", label: "Custom fields", icon: "ListPlus", href: "/custom-fields" },
      { key: "statuses", label: "Statuses", icon: "ListChecks", href: "/settings/statuses" },
      { key: "settings-client-mapping", label: "Client mapping (M365)", icon: "Link2", href: "/settings/client-mapping/m365" },
      // UniFi is the other per-client-credential connector (#1273). Unlike M365 it has no
      // connector card on /settings/connections, so without this leaf the UniFi mapping
      // screen — where per-client console credentials are entered — is URL-only.
      { key: "settings-client-mapping-unifi", label: "Client mapping (UniFi)", icon: "Link2", href: "/settings/client-mapping/unifi" },
      { key: "settings-connections", label: "Connections", icon: "Plug", href: "/settings/connections" },
      { key: "settings-knowledge", label: "Knowledge", icon: "BrainCircuit", href: "/knowledge" },
      { key: "settings-sla", label: "SLA settings", icon: "Timer", href: "/settings/sla" },
      { key: "consent", label: "Consent", icon: "FileCheck", href: "/consent" },
    ],
  },
];

// Routes that exist but are NOT rendered as their own menu entry (reached from
// elsewhere), kept here ONLY so the top bar can still resolve their title:
//  - security: under Settings (admin-only, ADR-0030)
//  - leads: reached via the Leads⟷Contacts toggle on /contacts (ADR-0031)
//  - settings: the Settings landing page (the group links sub-pages directly)
//  - the project board sub-views (delivery/workload/capacity/sprints): reached from
//    the project board header (nested under /projects)
//  - time admin sub-routes reached from their surfaces
export const navHidden: NavItem[] = [
  { key: "leads", label: "Leads", icon: "UserPlus", href: "/leads" },
  { key: "security", label: "Security", icon: "ShieldCheck", href: "/security" },
  { key: "settings", label: "Settings", icon: "Settings", href: "/settings" },
  { key: "delivery", label: "Delivery board", icon: "PackageCheck", href: "/projects/delivery" },
  { key: "workload", label: "Workload & capacity", icon: "Gauge", href: "/projects/workload" },
  { key: "capacity", label: "Weekly capacity", icon: "Gauge", href: "/projects/capacity" },
  { key: "sprints", label: "Sprints & backlog", icon: "Repeat", href: "/projects/sprints" },
  { key: "time-admin", label: "Time Admin", icon: "ClipboardCheck", href: "/timesheets/admin" },
  { key: "time-mappings", label: "Employee Mapping", icon: "Link2", href: "/timesheets/mappings" },
];

/** Every leaf nav item, flattened (groups expanded), for title lookup. */
function flatten(items: NavItem[]): NavItem[] {
  return items.flatMap((i) => (i.children ? i.children : [i]));
}

export const navAll: NavItem[] = [
  ...navTop,
  ...flatten(navGroups),
  ...flatten(navBottom),
  ...navHidden,
];

/** Title for the current path: exact match, else longest matching prefix. */
export function titleForPath(pathname: string): string {
  const exact = navAll.find((n) => n.href === pathname);
  if (exact) return exact.label;
  const nested = navAll
    .filter((n) => n.href !== "/" && !n.href.startsWith("#") && pathname.startsWith(n.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return nested?.label ?? "Imperion OS";
}

/** Active-state test for a nav item against the current path. */
export function isActivePath(href: string, pathname: string): boolean {
  if (href.startsWith("#")) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Whether a group has any descendant leaf matching the current path (active trail). */
export function isGroupActive(group: NavItem, pathname: string): boolean {
  return Boolean(group.children?.some((c) => isActivePath(c.href, pathname)));
}
