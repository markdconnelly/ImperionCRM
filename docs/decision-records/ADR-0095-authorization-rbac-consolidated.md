---
adr: 0095
title: "Authorization & RBAC — consolidated dossier"
status: accepted
date: 2026-06-16
repo: frontend
summary: "Consolidated dossier of the authorization / RBAC / access-control cluster: the Entra-group-sourced identity + role model, GUI/route/field gating, the fail-closed write-capability matrix over every mutating server action, the admin-only AI surfaces, and break-glass emergency access. Carries every member decision and amendment clause verbatim with a zero-loss traceability table; member ADRs are retained. SECURITY-CRITICAL — every fail-closed/bootstrap/break-glass clause is preserved verbatim."
tags: [authz]
consolidates: [ADR-0008, ADR-0016, ADR-0030, ADR-0045, ADR-0050]
---
# ADR-0095: Authorization & RBAC — consolidated dossier

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-16 |
| **Consolidates** | ADR-0008 · ADR-0016 · ADR-0030 · ADR-0045 · ADR-0050 (all retained on disk; each keeps its real status — all five remain `Accepted` — and gains `consolidated_into: ADR-0095`) |
| **Cross-references** | ADR-0090 (consolidation method, dossier + traceability + retained originals) · ADR-0084 (claim ADR numbers at merge) · ADR-0002 / ADR-0005 (Entra ID sole IdP, certificate client assertion — the identity spine RBAC sits on) · ADR-0015 (agent actions inherit the acting user's permission scope) · ADR-0042 (four-repo division of labor — front end is GUI-only, every process is a server action or backend call) · ADR-0048 (AI Agents page, amended by ADR-0050 §page visibility) · ADR-0036 (Settings tab list + orchestrator settings card, amended by ADR-0050 §tab list) · ADR-0049 (Board runtime/persistence — its `sales:write` convene gate is superseded by ADR-0050) · ADR-0062 (BI hub — revenue-redacted surfaces) · backend ADR-0035 (backend identity gate — Easy Auth + caller allowlist, the server-side companion to this client-side authz) · backend ADR-0037 (orchestrator GET/PUT `/agent/settings` the AI tab reuses) · [`docs/security/unified-security-standard.md`](../security/unified-security-standard.md) (the shared baseline this cluster conforms to — referenced, not restated) |

## Purpose & scope

This is a consolidation dossier produced under [ADR-0090](./ADR-0090-adr-ingestion-overhaul.md). It folds the **Authorization / RBAC cluster** — every decision record that defines who may reach which surface and perform which write in Imperion CRM — into one ingestible record, so that "the current decision about authorization and access control" can be reconstructed from a single file rather than a chain of five ADRs and their amendments.

**This is the access-control model, and it is SECURITY-CRITICAL.** Every fail-closed default, every bootstrap-flag clause, and every break-glass clause is carried **verbatim** below. A lost clause here would be a security regression, so the zero-loss guarantee is enforced more strictly than usual: the synthesis never paraphrases a security boundary, and the per-member sections quote the governing decision and every amendment/resolution clause directly from source.

**Zero loss is the binding constraint (ADR-0090).** A decision is "lost" only if it appears in *no* active record. This dossier therefore:

- **Synthesizes** the current authorization/RBAC decision (the section immediately below);
- **Carries every member decision and every amendment/supersession clause VERBATIM** (the per-member sections that follow — quoted directly from each source ADR's *Decision* / governing clauses);
- **Proves zero loss with a traceability table** mapping each source ADR's decision(s) to its dossier section;
- **Retains every member file on disk** with `consolidated_into: ADR-0095` and an inbound pointer — so history and inbound links survive (ADR-0090).

**Member statuses are preserved verbatim (ADR-0090).** All five members are `Accepted` and stay `Accepted`. The supersessions in this cluster are **internal and partial**, never whole-member:

- **ADR-0045 supersedes ADR-0030 §1's unconditional fail-open** bootstrap (a no-claim user now falls back to `support`, not `admin`). ADR-0030 keeps `status: accepted`; the superseded fail-open was itself a *temporary* bootstrap, and the supersession is recorded in ADR-0045's Decision verbatim plus the interim-amendment chain (#140 → #171) that closed it.
- **ADR-0050 amends ADR-0048 (AI Agents page visibility) and ADR-0036 (Settings tab list), and supersedes the `sales:write` convene gate chosen with ADR-0049** (convene moves to a new admin-only `agents:operate` capability). ADR-0048 and ADR-0049 are **not** members of this cluster and are **not** absorbed — they are cited as references; ADR-0048 in particular lives in the **Agent/ICM dossier (ADR-0091)**, so ADR-0050's amendment of it is preserved here as a **verbatim cross-dossier reference only** (see "Cross-dossier amendment" below), never duplicated.

Consolidation adds the `consolidated_into` pointer but flips no decision's status.

**Cross-dossier amendment preserved as a reference (do NOT duplicate).** ADR-0050 amends **ADR-0048** ("AI Agents page stays visible to all roles") and **ADR-0036** (Settings tab list). ADR-0048 is consolidated into the **Agent/ICM platform dossier (ADR-0091)**, not here. Per the single-owner / no-double-absorption rule, this dossier **cites** that ADR-0050 amends/gates ADR-0048 (page visibility now admin-only via `canSeeAgentPages`; the costed convene action moves off `sales:write` to `agents:operate`) but does **not** restate or re-absorb ADR-0048 or ADR-0036. The authoritative bodies of ADR-0048/0036 remain in ADR-0091 and on disk under their own filenames.

**Boundaries preserved (system CLAUDE.md §1, single-owner rule).** This is the front-end client-side authorization model. Its server-side companion — the backend's own identity gate (Easy Auth + caller allowlist, backend ADR-0035) — is a sibling-repo decision and stays a **reference, never an absorption**. The shared **unified security standard** (`docs/security/unified-security-standard.md`) is **referenced, not restated** here.

---

## Synthesis — the current authorization & RBAC decision

Imperion CRM is single-tenant (Imperion employees only) with **Entra ID as the sole IdP** (ADR-0002), authenticated by certificate client assertion (ADR-0005). Authorization is layered defense-in-depth: identity is mirrored from Entra, roles derive from Entra group/App-Role claims, the GUI hides what a role cannot use, and **the server never trusts the client** — every mutating action carries its own fail-closed capability gate. In current form:

1. **Identity mirrors Entra; roles derive from Entra claims (ADR-0016).** `app_user` mirrors the Entra identity (`entra_object_id`, email, display name), upserted on each sign-in. **Roles derive from Entra group/app-role claims** mapped to app permissions; the schema is ready for **row-level (owner/team) scoping** via `owner_user_id`. **PII columns are flagged and access is audit-logged** (`audit_log`, `pii_access_log`). **Agent actions inherit the acting user's permission scope** (ADR-0015).

2. **Five roles, derived from five Entra security groups, gate the GUI server-side (ADR-0030).** `AppRole` = `admin | finance | project_manager | sales | support`, **`DEFAULT_ROLE = 'support'`** (the most-restricted role — fails closed). The five Entra security groups are `Application.ImperionCRM.{Admins, Finance, ProjectManager, Sales, Support}`. Capability predicates in the pure, edge+client-safe `lib/auth/roles.ts` — `canSeeSettings` (admin-only), `canSeeRevenue` (false when the only role is `support`), `canSeeFeature(navKey)`, `redactMoney` — drive nav filtering, middleware route guards, page guards, and **server-side revenue redaction** (revenue is blanked *before render*, so restricted data never reaches the client). Break-glass is **elevated to admin**. **As-built (#139/#169):** the live config emits **group object-id GUIDs in the `roles` claim** (`emit_as_roles`), resolved against both the App-Role name table and the `ENTRA_GROUP_*` env GUID map; defining real App Roles later needs no code change.

3. **Every mutating server action is gated by a fail-closed write-capability matrix (ADR-0045).** A stress test found all ~48 server actions checked only *authentication*, never *authorization*. The fix: **eight write capabilities** — `crm`, `sales`, `delivery`, `contracts`, `tickets`, `comms`, `catalog`, `settings` (each `:write`) — in the pure `lib/auth/policy.ts`, with `CAPABILITY_ROLES` mapping each to the roles that hold it (**`admin` holds all**). `can(roles, cap)` is the decision function; the server-only `requireCapability(cap)` in `lib/auth/guard.ts` resolves session roles (default `support`) and **throws `AuthorizationError` (fail-closed)** when `can()` is false, called at the top of every mutating action. The grant map: `crm → sales, project_manager` · `sales → sales` · `delivery → project_manager` · `contracts → finance` · `tickets → support, sales, project_manager` · `comms → sales, support` · `catalog → admin-only` · `settings → admin-only`. A 50-test suite asserts the full role×capability grid in CI.

4. **The bootstrap fails closed (ADR-0045 supersedes ADR-0030 §1's fail-open).** A no-claim user now falls back to **`support`** (not `admin`). An explicit, **default-off** env flag `RBAC_FAIL_OPEN_ADMIN=true` can restore admin-on-no-claim as a *temporary* bootstrap while Entra App Roles are assigned — documented as **not-for-prod**; break-glass (forced admin) is the preferred interim path. The interim fail-open that briefly shipped (#140) was **closed verbatim** by #171 once the live claim mapping (#169/#170) landed and sign-in was operator-verified.

5. **AI surfaces are admin-only end to end (ADR-0050).** A new predicate `canSeeAgentPages` (admin-only) gates the **AI Agents** and **Board** pages (list **and** transcript detail) at all three layers: `NAV_GUARD`, the edge `authorized` callback, and server-side page redirects. A new capability **`agents:operate`** (admin-only) in the ADR-0045 matrix gates `conveneBoardAction` — **superseding the `sales:write` convene gate** chosen with ADR-0049 — because a page-only gate over a costed, premium-tier process would leave it POST-invokable by roles that can no longer see the page (the exact GUI-trust gap ADR-0045 closed). Settings gains an **AI** tab rendering the same `OrchestratorSettingsCard` + `settings:write`-guarded save action. **(Cross-dossier:** ADR-0050 also amends **ADR-0048** page visibility and **ADR-0036** Settings tab list; ADR-0048 lives in the Agent/ICM dossier ADR-0091 — preserved here as a reference, not absorbed.)

6. **Break-glass is the emergency path back in (ADR-0008).** A dedicated **`/break-glass`** page + Auth.js `break-glass` Credentials provider authenticates one **non-Entra** account configured via `BREAKGLASS_USERNAME` + `BREAKGLASS_PASSWORD_HASH` (lowercase-hex SHA-256). **Off by default** (disabled unless both env vars are set); the password is stored only as a SHA-256 hash, compared in **constant time** (`crypto.timingSafeEqual`), never logged in plaintext; **every successful use is audit-logged** (`[SECURITY] Break-glass sign-in used …`). It exists because Entra SSO is a hard gate (ADR-0002/0005) and a single SSO failure (cert expiry, Conditional-Access change, app-registration change) would otherwise lock out every user including admins. A deliberate, documented backdoor — treated like a root password (Key Vault, rotate, alert on use). On sign-in it is **elevated to admin** (ADR-0030).

### Defense-in-depth layering (preserved verbatim)

The cluster is explicitly layered, each layer assuming the one above can be bypassed:

- **Identity layer (ADR-0016):** Entra is the source of truth; `app_user` mirrors it; roles come from claims; PII access is audit-logged; agents inherit the user's scope.
- **GUI/route/field layer (ADR-0030):** nav filtering, `/settings` + `/security` route redirects, and server-side revenue redaction — all defaulting to the most-restricted `support` role (**fail closed**). This is "GUI courtesy" — never trusted alone.
- **Write/action layer (ADR-0045):** the capability matrix + `requireCapability` guard on every mutating action — **"the server simply never trusts the client to have done so."** Fail-closed by default; the bootstrap fail-open is gone by default.
- **AI-surface layer (ADR-0050):** `canSeeAgentPages` (admin-only, all three layers) + the admin-only `agents:operate` write capability on the costed convene action — page visibility *and* the reachable endpoint both gated, per ADR-0045's principle.
- **Emergency layer (ADR-0008):** break-glass — off by default, hashed + constant-time + audited — so a total SSO failure is not a total lockout.

### Amendment & supersession web (preserved verbatim)

- **ADR-0045 supersedes ADR-0030 §1's unconditional fail-open** — a no-claim user falls back to `support`, not `admin`. The temporary `RBAC_FAIL_OPEN_ADMIN` flag (default-off, not-for-prod) is the documented interim path. (Preserved verbatim in M4's "Fail-closed bootstrap" bullet and the M4 interim-amendment chain.)
- **ADR-0045 INTERIM AMENDMENT (2026-06-10, #140) — CLOSED (2026-06-11, #171):** while #139 was open, `claims.ts` failed OPEN unconditionally on no-claim (recognized claims still won); #169/#170 landed the live claim mapping and operator-verified sign-in, so #171 **restored the fail-closed behavior verbatim**. (Preserved verbatim in M4.)
- **ADR-0050 supersedes the `sales:write` convene gate chosen with ADR-0049** → the new admin-only `agents:operate` capability. ADR-0049's runtime and persistence decisions are untouched — only the convene capability moves. (Preserved verbatim in M5.)
- **ADR-0050 amends ADR-0048 (page visibility) and ADR-0036 (Settings tab list)** — see "Cross-dossier amendment" below; preserved as a reference, not absorbed.
- **ADR-0030 wires the model ADR-0016 designed** (roles derive from Entra group/app-role claims; `app_user.roles` mirrors them) — a within-cluster build-on, preserved as a reference. **ADR-0030 forces break-glass (ADR-0008) to admin** on sign-in — a within-cluster reference.
- **ADR-0045 builds on ADR-0030** (roles ride the JWT/session via `lib/auth/{roles,claims}.ts`) and **ADR-0050 builds on ADR-0045** (reuses the capability matrix as the single source of truth for the convene gate) — within-cluster references.

All five members are **Accepted** and preserved unchanged. Consolidation alters no decision's status.

### Cross-dossier amendment (ADR-0050 → ADR-0048 / ADR-0036, preserved as a verbatim reference)

ADR-0050's own frontmatter states: **"Amends ADR-0048 (page visibility), ADR-0036 (Settings tab list); supersedes the `sales:write` convene gate chosen with ADR-0049."** Of these:

- **ADR-0049's convene gate** (`sales:write` → `agents:operate`) is **carried in this dossier** (M5), because the new capability lives in *this* cluster's ADR-0045 matrix.
- **ADR-0048 (AI Agents page visibility) and ADR-0036 (Settings tab list)** are **NOT members of this cluster.** ADR-0048 is consolidated into the **Agent/ICM platform dossier ([ADR-0091](./ADR-0091-agent-icm-platform-consolidated.md))**. This dossier therefore **preserves ADR-0050's amendment of them as a reference only**: ADR-0050 changes ADR-0048's "page stays visible to all roles" to **admin-only via `canSeeAgentPages`**, and adds an **AI tab** to the ADR-0036 Settings tab list. The authoritative bodies of ADR-0048 and ADR-0036 are **not duplicated or absorbed here** (single-owner / no-double-absorption, system CLAUDE.md §1). To trace the amended target, follow ADR-0050 → ADR-0048 in ADR-0091.

---

## Traceability table (zero-loss proof)

Every cluster member (the 5 named in #761), each source decision, and the dossier section that carries it verbatim. The retained member file is the second proof of non-loss.

| Source ADR | Status | Decision(s) carried | Dossier section |
|---|---|---|---|
| **ADR-0008** | Accepted | Break-glass emergency access — dedicated `/break-glass` page + Auth.js `break-glass` Credentials provider for one non-Entra account (`BREAKGLASS_USERNAME` / `BREAKGLASS_PASSWORD_HASH` SHA-256); **off by default** (disabled unless both env vars set); hash-only, constant-time `timingSafeEqual` compare, never logs plaintext; every successful use audit-logged; treated as a root-password-grade documented backdoor (Key Vault, rotate, alert) | Synthesis §6 · Defense-in-depth (Emergency layer) · [M1 — ADR-0008](#m1--adr-0008-break-glass-emergency-access) |
| **ADR-0016** | Accepted | RBAC + identity model — `app_user` mirrors the Entra identity, upserted per sign-in; roles derive from Entra group/app-role claims mapped to app permissions; schema ready for row-level (`owner_user_id`) scoping; PII columns flagged + access audit-logged (`audit_log`, `pii_access_log`); agent actions inherit the acting user's scope (ADR-0015) | Synthesis §1 · Defense-in-depth (Identity layer) · Amendment web · [M2 — ADR-0016](#m2--adr-0016-rbac-and-identity-model) |
| **ADR-0030** | Accepted (§1 fail-open superseded by ADR-0045) | RBAC & GUI restrictions from five Entra groups — `AppRole` = admin/finance/project_manager/sales/support, `DEFAULT_ROLE='support'` (fail closed); pure `lib/auth/roles.ts` predicates (`canSeeSettings` admin-only, `canSeeRevenue` false for sole-support, `canSeeFeature`, `redactMoney`); `lib/auth/claims.ts` maps the `roles`/`groups` claim; gating at nav + edge `authorized` + page redirect + **server-side revenue redaction before render**; break-glass elevated to admin; as-built group-GUID-in-`roles`-claim path (#139/#169) | Synthesis §2 · Defense-in-depth (GUI/route/field layer) · Amendment web · [M3 — ADR-0030](#m3--adr-0030-role-based-access-control--gui-restrictions-from-entra-groups) |
| **ADR-0045** | Accepted | Server-action authorization & **fail-closed bootstrap** — eight write capabilities (`crm/sales/delivery/contracts/tickets/comms/catalog/settings`:write) in pure `lib/auth/policy.ts`, `CAPABILITY_ROLES` map (admin holds all), `can()` decision fn, server-only `requireCapability()` throws `AuthorizationError` (fail-closed) at the top of every mutating action; **supersedes ADR-0030 §1 fail-open** — no-claim → `support`; `RBAC_FAIL_OPEN_ADMIN` default-off/not-for-prod interim flag; interim amendment #140 → **closed #171** (fail-closed restored verbatim); 50-test stress grid in CI; defense-in-depth (server never trusts the client) | Synthesis §3, §4 · Defense-in-depth (Write/action layer) · Amendment web · [M4 — ADR-0045](#m4--adr-0045-server-action-authorization-write-capabilities--fail-closed-bootstrap) |
| **ADR-0050** | Accepted | AI pages admin-only; Settings AI tab — `canSeeAgentPages` (admin-only) gates AI Agents + Board (list + detail) at nav/edge/page; new admin-only `agents:operate` capability gates `conveneBoardAction`, **superseding the ADR-0049 `sales:write` convene gate**; Settings AI tab reuses `OrchestratorSettingsCard` + `settings:write` save; **amends ADR-0048 (page visibility) + ADR-0036 (Settings tab list)** — preserved as a cross-dossier reference (ADR-0048 lives in ADR-0091), not absorbed | Synthesis §5 · Defense-in-depth (AI-surface layer) · Amendment web · Cross-dossier amendment · [M5 — ADR-0050](#m5--adr-0050-ai-pages-are-admin-only-settings-gains-an-ai-tab) |

**Member count: 5.** Cross-dossier/cross-repo references preserved as references (not absorbed): **ADR-0048** (AI Agents page — in the Agent/ICM dossier ADR-0091) and **ADR-0036** (Settings tab list) amended by ADR-0050; **ADR-0049** (Board runtime/persistence) whose convene gate ADR-0050 supersedes; **backend ADR-0035** (backend identity gate — the server-side companion); **backend ADR-0037** (orchestrator `/agent/settings`). In-repo references preserved (not absorbed): ADR-0002/0005 (Entra IdP + cert client assertion), ADR-0015 (agents inherit scope), ADR-0042 (four-repo contract), ADR-0062 (BI hub revenue-redacted surfaces), and the **unified security standard** (referenced).

---

# Member decisions (verbatim)

Each section below reproduces the governing decision text of one member ADR **verbatim** from its source file. The full source ADR (Problem / Context / Options / Consequences / Future considerations) is retained on disk under its original filename; only its decision and binding clauses are quoted here, which is what the zero-loss guarantee requires. Because this is a security-critical cluster, every fail-closed / bootstrap / break-glass clause is quoted in full.

## M1 — ADR-0008 (Break-glass emergency access)

> Source: [`ADR-0008-break-glass-emergency-access.md`](./ADR-0008-break-glass-emergency-access.md) · Status: **Accepted** (2026-06-06)

**Decision (verbatim):**

> Add a **break-glass** path: an Auth.js Credentials provider (`break-glass`) and a
> dedicated **`/break-glass`** page, separate from the primary `/login` (Entra SSO).
> It authenticates one non-Entra account configured via environment:
> `BREAKGLASS_USERNAME` and `BREAKGLASS_PASSWORD_HASH` (lowercase-hex SHA-256). The
> provider is **disabled unless both are set**.

**Security impact (preserved verbatim — security-critical):**

> - **Off by default** — no break-glass unless explicitly configured.
> - Password stored only as a **SHA-256 hash**; compared in **constant time**
>   (`crypto.timingSafeEqual`); plaintext is never stored or logged.
> - Every successful use is **audit-logged** (`[SECURITY] Break-glass sign-in
>   used …`) to App Service logs / Sentinel.
> - Reached only via the explicit `/break-glass` URL, not the primary sign-in.
> - This is a deliberate, documented backdoor — treat the credential like a root
>   password: store in Key Vault, rotate regularly, alert on use, prefer a strong
>   random password.

**Operational impact (preserved verbatim):**

> - Configure `BREAKGLASS_*` only where needed (e.g. App Service), ideally from
>   Key Vault. Generate the hash with `sha256` of the chosen password.
> - Add monitoring/alerting on the audit-log line.

## M2 — ADR-0016 (RBAC and identity model)

> Source: [`ADR-0016-rbac-and-identity-model.md`](./ADR-0016-rbac-and-identity-model.md) · Status: **Accepted** (2026-06-07)

**Decision (verbatim):**

> Adopt (1). `app_user` mirrors the Entra identity (`entra_object_id`, email, display
> name) and is upserted on each sign-in; **roles derive from Entra group/app-role
> claims** mapped to app permissions (Admin, Sales, Delivery/Ops, Leadership,
> Read-only). Authorization is **role-based now**, with the schema ready for
> **row-level (owner/team) scoping** via `owner_user_id` on accounts/opportunities/tasks.
> **PII columns are flagged and access is audit-logged** (`audit_log`, `pii_access_log`).
> **Agent actions inherit the acting user's permission scope** (ADR-0015).

**Security impact (preserved verbatim):**

> Centralizes identity governance in Entra (MFA, Conditional Access, lifecycle).
> Least-privilege + audit on PII access directly serve the "Mythos Proof" posture
> (CLAUDE.md §5). No third-party IdP (ADR-0002).

## M3 — ADR-0030 (Role-based access control & GUI restrictions from Entra groups)

> Source: [`ADR-0030-rbac-gui-restrictions.md`](./ADR-0030-rbac-gui-restrictions.md) · Status: **Accepted** (2026-06-08) · Note: §1's unconditional fail-open bootstrap is **superseded by ADR-0045** (no-claim → `support`).

**Decision (verbatim):**

> - **`lib/auth/roles.ts`** (pure, edge+client safe): `AppRole`
>   (`admin|finance|project_manager|sales|support`), `DEFAULT_ROLE='support'`, and
>   capability predicates `canSeeSettings` (admin-only), `canSeeRevenue` (false when the
>   only role is `support`), `canSeeFeature(navKey)`, plus `redactMoney`.
> - **`lib/auth/claims.ts`** maps the App-Role `roles` claim and/or `groups` GUIDs
>   (via `roleEnv` env map) to roles; an optional `DEV_ROLE` previews restricted GUIs.
> - Auth.js `jwt`/`session` callbacks (edge-safe `auth.config.ts`) embed and surface
>   `roles`; the `authorized` callback redirects non-admins away from `/settings` and
>   `/security`. `auth.ts` mirrors identity+roles into `app_user` on sign-in
>   (ADR-0016) and elevates **break-glass** to admin.
> - GUI gating: the sidebar filters nav by `canSeeFeature`; Settings/Security pages
>   `redirect('/')` for non-admins; revenue is blanked **server-side before render**
>   on the dashboard, accounts, proposals, assessments, pipeline, and reporting.
> - The Entra `groups`/`roles` claim is emitted by the **app-registration manifest**
>   (groupMembershipClaims, or assigned App Roles) — NOT by an OAuth scope; the scope
>   is unchanged.

**As-built note (preserved verbatim):**

> - **As-built note (2026-06-11, #139/#169):** the five App Roles were never defined in
>   the manifest (its two appRoles are valueless auto-defaults), and the five groups are
>   cloud-only, so neither App-Role values nor `sam_account_name` names can be emitted.
>   The live configuration instead emits **group object-id GUIDs in the `roles` claim**
>   (`emit_as_roles`); `rolesFromClaims` therefore resolves the `roles` claim against
>   both the App-Role name table and the `ENTRA_GROUP_*` env GUID map (which the
>   operator sets on the App Service). Defining real App Roles later requires no code
>   change — name-valued `roles` claims still map first.

**Security impact (preserved verbatim — fail-closed):**

> Strengthens least-privilege (CLAUDE.md §5). Default-`support` fails closed. Revenue
> redaction is server-side, so restricted data never reaches the client. Roles are
> audit-mirrored in `app_user`. Risk: until the manifest emits the claim, every user
> (including the admin) is `support` — mitigated by landing the manifest change first,
> `DEV_ROLE` for local, and break-glass forced to admin.

## M4 — ADR-0045 (Server-action authorization (write capabilities) & fail-closed bootstrap)

> Source: [`ADR-0045-server-action-authorization.md`](./ADR-0045-server-action-authorization.md) · Status: **Accepted** (2026-06-09) · Supersedes (verbatim): ADR-0030 §1's unconditional fail-open bootstrap.

**Decision (verbatim):**

> - **`lib/auth/policy.ts`** (pure): eight write capabilities — `crm`, `sales`,
>   `delivery`, `contracts`, `tickets`, `comms`, `catalog`, `settings` (`:write`) —
>   and `CAPABILITY_ROLES` mapping each to the roles that hold it (`admin` holds all).
>   `can(roles, cap)` is the decision function.
>   - `crm` → sales, project_manager · `sales` → sales · `delivery` → project_manager
>     · `contracts` → finance · `tickets` → support, sales, project_manager · `comms`
>     → sales, support · `catalog` → admin-only · `settings` → admin-only.
> - **`lib/auth/guard.ts`** (server-only): `requireCapability(cap)` resolves session
>   roles (`getSessionRoles`, default `support`) and throws `AuthorizationError`
>   (fail-closed) when `can()` is false. Called at the top of every mutating action
>   across the 15 `app/(app)/*/actions.ts` files; the GDAP callback route uses `can()`
>   directly and redirects with `gdap=forbidden`.
> - **Fail-closed bootstrap (supersedes ADR-0030 §1's unconditional fail-open).** A
>   no-claim user now falls back to `support`. An explicit, default-off env flag
>   `RBAC_FAIL_OPEN_ADMIN=true` restores admin-on-no-claim as a *temporary* bootstrap
>   while Entra App Roles are assigned; break-glass (forced admin) is the preferred
>   interim path.
>   - **INTERIM AMENDMENT (2026-06-10, #140) — CLOSED (2026-06-11, #171):** while
>     #139 was open, `claims.ts` failed OPEN unconditionally on no-claim (recognized
>     claims still won). #169/#170 landed the live claim mapping (group GUIDs in the
>     `roles` claim via `emit_as_roles` + the `ENTRA_GROUP_*` env map) and the
>     operator verified sign-in, so #171 restored this bullet's fail-closed behavior
>     verbatim. `RBAC_FAIL_OPEN_ADMIN` remains the documented break-glass (unset in
>     prod).
> - This is **defense in depth**: the GUI still hides controls a role can't use
>   (ADR-0030); the server simply never trusts the client to have done so.

**Security impact (preserved verbatim — fail-closed):**

> Closes the critical gap: writes now fail closed and are least-privilege per role.
> The deployment-wide "everyone is admin" fail-open is gone by default. The pure
> `can()` matrix is covered by an explicit stress-test grid so regressions surface in
> CI. Residual risk: no row-level (owner) scoping yet — any role that *may* write a
> domain may write *any* object in it (IDOR within a domain); tracked below. The
> bootstrap flag, if ever set in prod, re-opens no-claim users to admin — documented
> as not-for-prod in `.env.example`.

## M5 — ADR-0050 (AI pages are admin-only; Settings gains an AI tab)

> Source: [`ADR-0050-admin-only-ai-pages-settings-ai-tab.md`](./ADR-0050-admin-only-ai-pages-settings-ai-tab.md) · Status: **Accepted** (2026-06-10) · Amends (verbatim): "ADR-0048 (page visibility), ADR-0036 (Settings tab list); supersedes the `sales:write` convene gate chosen with ADR-0049." · Cross-reference: backend ADR-0037.

**Decision (verbatim):**

> - New role predicate `canSeeAgentPages` (admin-only) gates the AI Agents and
>   Board pages (list **and** transcript detail) at all three layers: `NAV_GUARD`
>   (`agents`, `board`), the edge `authorized` callback (`/agents`, `/board`
>   path prefixes), and server-side redirects in each page.
> - New capability `agents:operate` (no roles besides implicit admin) in the
>   ADR-0045 matrix; `conveneBoardAction` requires it. ADR-0049's runtime and
>   persistence decisions are untouched — only the convene capability moves.
> - Settings gains an **AI** tab rendering the same `OrchestratorSettingsCard`
>   with the same save action, which now revalidates both `/agents` and
>   `/settings`. The shared source-tier notice lives in the pure
>   `settingsSourceNote` helper.

**Security impact (preserved verbatim — fail-closed):**

> Positive: the agent layer's costed operations (board deliberations) and
> org-wide model/budget controls are admin-only end to end — nav, edge, page,
> and action — instead of GUI-only. Fail-closed semantics of `requireCapability`
> are unchanged.

> **Cross-dossier amendment (preserved as a reference, NOT absorbed):** ADR-0050's
> amendment of **ADR-0048** ("AI Agents page stays visible to all roles" → admin-only
> via `canSeeAgentPages`) and **ADR-0036** (Settings tab list gains an AI tab) targets
> ADRs that are **not** members of this cluster. ADR-0048 is consolidated into the
> Agent/ICM platform dossier ([ADR-0091](./ADR-0091-agent-icm-platform-consolidated.md));
> ADR-0036 retains its own file. Per the single-owner / no-double-absorption rule
> (system CLAUDE.md §1), their bodies are **not duplicated here** — only the supersession
> of the ADR-0049 `sales:write` convene gate (whose replacement `agents:operate` lives in
> this cluster's ADR-0045 matrix) is carried in full above.

---

## Consequences

### Security impact

No change to any security posture — this is a documentation consolidation (ADR-0090). Every security control of the member ADRs remains in force and is carried **verbatim**, with extra care given because this is the access-control cluster: **fail-closed defaults** preserved (`DEFAULT_ROLE='support'`, ADR-0030; `requireCapability` throws `AuthorizationError` on every mutating action, no-claim → `support`, ADR-0045); the **bootstrap fail-open is gone by default** and the only re-opener (`RBAC_FAIL_OPEN_ADMIN`) is documented not-for-prod and the interim no-claim fail-open was closed verbatim by #171 (ADR-0045); **break-glass** is off by default, hash-only with constant-time compare, never logs plaintext, and audit-logs every use (ADR-0008); **revenue/PII** stay server-side-redacted before render and PII access stays audit-logged (ADR-0030/0016); **AI surfaces** stay admin-only end to end (nav, edge, page, and the `agents:operate`-gated convene action) (ADR-0050); **agent actions inherit the acting user's scope** (ADR-0016/0015). The server-side companion gate (backend ADR-0035) and the shared **unified security standard** remain references, not restated. `Never commit secrets` — no secrets, password hashes, tokens, env values, or client PII appear in this dossier or any member file; break-glass and connection credentials are custodied in Key Vault per the unified security standard.

### Cost impact

None from the consolidation. No runtime, schema, or model change here. Slightly larger ADR corpus to index (one added file); the generated index and `adr-index.json` absorb it mechanically. The member ADRs' own cost notes are carried verbatim and unchanged: all five are pure logic / config plus at most one `app_user` upsert per sign-in and one guard call per action — no material runtime cost; ADR-0045 adds one dev dependency (`vitest`); ADR-0050 restricts the costed convene (a premium-tier process) to admins, *reducing* accidental spend surface.

### Operational impact

The authorization/RBAC decision surface is now reconstructable from one file. Member files are retained with `consolidated_into: ADR-0095` — all five keep `status: accepted` — so all inbound `ADR-NNNN` links and history survive. The generated README index (`scripts/adr-index.mjs`) and `adr-index.json` are regenerated in the same change; `--check` passes. The members' standing operational notes are unchanged and remain the operational truth: the operator must ensure Entra emits the App-Role/`groups` claim (or set `ENTRA_GROUP_*`) so real users resolve to real roles — until then use break-glass or the documented `RBAC_FAIL_OPEN_ADMIN` flag (ADR-0030/0045); `BREAKGLASS_*` is configured only where needed (App Service, from Key Vault) with monitoring/alerting on the audit-log line (ADR-0008); the AI surfaces are admin-only and re-granting `agents:operate` to other roles is a one-line, stress-tested matrix change (ADR-0050). Future authorization decisions either amend a member (and update this dossier's synthesis + amendment web in the same PR) or, if net-new, are authored standalone and folded in at the next consolidation pass.

## Future considerations

- This dossier is vectorized into gold alongside other knowledge once stable (ADR-0090 future considerations; LocalPipeline).
- As the deferred member items land — **row-level / owner scoping** (`owner_user_id` as a second layer, the residual IDOR-within-a-domain gap, ADR-0016/0045), **finer per-module / per-category permissions** (ADR-0030/0045), **App-Role-only claim path** to avoid the >200-group overage (ADR-0030), **time-boxed / one-time + MFA break-glass** and managed-identity replacement of the certificate (ADR-0008), and a **finer view-vs-operate split** for the agent layer via `agents:operate` (HITL #86–#88, ADR-0050) — they amend the relevant member and this dossier's synthesis + amendment web in the same PR.
- The same consolidation method (ADR-0090) applies to the remaining clusters.
