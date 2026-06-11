# ADR-0030: Role-based access control & GUI restrictions from Entra groups

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-08 |
| **Cross-references** | — |

## Problem

The app shows everything to every authenticated user. The business needs the GUI
to respect five Entra security groups — `Application.ImperionCRM.Admins`, `.Finance`,
`.ProjectManager`, `.Sales`, `.Support` — so that Admins see everything, non-Admins
cannot reach Settings, and Support cannot see revenue/MRR anywhere.

## Context

Entra ID is the sole IdP (ADR-0002), authenticated by certificate client assertion
(ADR-0005). ADR-0016 designed the RBAC model (roles derive from Entra group/app-role
claims; `app_user.roles` mirrors them) but it was never wired. Middleware already
gates authentication (CLAUDE.md §7.3). Auth.js v5 splits config between an edge-safe
base (`auth.config.ts`, used by middleware) and a Node config (`auth.ts`).

## Options considered

1. Derive roles from the Entra claim in the JWT, carry them in the session, and gate
   the GUI **server-side**, defaulting to the most-restricted `support` role (this
   decision).
2. Hide controls only in client JSX (rejected — revenue values would still be shipped
   to the browser; trivially bypassed).
3. Enforce solely at middleware route level (rejected — does not cover field-level
   redaction like hiding MRR within an allowed page).

### Tradeoffs

- (1) one capability layer (`lib/auth/roles.ts`) reused by nav filtering, middleware
  route guards, page guards, and server-side money redaction. Cost: a small claims→
  roles mapping and an env GUID map until App Roles are assigned.
- (2)/(3) cheaper but insecure / incomplete.

## Decision

- **`lib/auth/roles.ts`** (pure, edge+client safe): `AppRole`
  (`admin|finance|project_manager|sales|support`), `DEFAULT_ROLE='support'`, and
  capability predicates `canSeeSettings` (admin-only), `canSeeRevenue` (false when the
  only role is `support`), `canSeeFeature(navKey)`, plus `redactMoney`.
- **`lib/auth/claims.ts`** maps the App-Role `roles` claim and/or `groups` GUIDs
  (via `roleEnv` env map) to roles; an optional `DEV_ROLE` previews restricted GUIs.
- Auth.js `jwt`/`session` callbacks (edge-safe `auth.config.ts`) embed and surface
  `roles`; the `authorized` callback redirects non-admins away from `/settings` and
  `/security`. `auth.ts` mirrors identity+roles into `app_user` on sign-in
  (ADR-0016) and elevates **break-glass** to admin.
- GUI gating: the sidebar filters nav by `canSeeFeature`; Settings/Security pages
  `redirect('/')` for non-admins; revenue is blanked **server-side before render**
  on the dashboard, accounts, proposals, assessments, pipeline, and reporting.
- The Entra `groups`/`roles` claim is emitted by the **app-registration manifest**
  (groupMembershipClaims, or assigned App Roles) — NOT by an OAuth scope; the scope
  is unchanged.

## Consequences

### Security impact

Strengthens least-privilege (CLAUDE.md §5). Default-`support` fails closed. Revenue
redaction is server-side, so restricted data never reaches the client. Roles are
audit-mirrored in `app_user`. Risk: until the manifest emits the claim, every user
(including the admin) is `support` — mitigated by landing the manifest change first,
`DEV_ROLE` for local, and break-glass forced to admin.

### Cost impact

None material — pure logic plus one upsert per sign-in.

### Operational impact

Operator must set `groupMembershipClaims` (or assign the five App Roles) and, for the
GUID path, populate `ENTRA_GROUP_*`. No migration (uses existing `app_user.roles`).

## Future considerations

Finer per-module permissions; App-Role-only path to avoid the >200-group overage;
optional DB `app_user.roles` fallback for known users before the claim is live.
