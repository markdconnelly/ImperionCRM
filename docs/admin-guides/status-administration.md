# Status administration (configurable statuses)

> Audience: platform admins. Surface: **Settings → Tools & configuration → Statuses**
> (`/settings/statuses`). Decision record: **ADR-0065 B5**. Issue: **#616** (part 1).

## What this is

Task and project statuses are **configurable data**, not hard-coded enums. The
`status_def` table (migration 0104) holds admin-definable status sets; this surface
is the CRUD UI over it. Adding a status like "Waiting on client" to one project type
is a row insert — no schema change, no deploy.

## The model

A status set is identified by three things:

| Dimension | Values | Meaning |
|---|---|---|
| **context** | `task` \| `project` | A project type carries an independent task set and project set. |
| **scope** | `global` \| `project_type` | A `global` set is the default for every type; a `project_type` set overrides it for one type. |
| **project type** | (only when scope = `project_type`) | Which type the set belongs to. |

Each status row has: a stable machine **key** (e.g. `waiting_on_client`), a
display **label** and **colour**, a **category**, and an **ordinal** (column order).

### Category is what reporting rolls up — never the label

`category` is one of `todo` · `in_progress` · `done`. **Reporting and rollups key
off category, never the label** (ADR-0065 tradeoff). So renaming "In Progress" or
adding "Waiting on client" (category `in_progress`) keeps every report stable — the
new status still counts as in-progress work. Choose the category deliberately.

The seeded global defaults reproduce the legacy enums exactly, so existing reports
are unchanged until you add custom statuses:

- **task:** Open (todo) · In Progress (in_progress) · Done (done)
- **project:** Not Started (todo) · In Progress (in_progress) · Blocked (in_progress) · Complete (done)

## How to use it

1. **Choose a set** — pick a context (task/project) and either *Global default* or a
   project type. A type with no set of its own inherits the global default; add a
   status to give it an independent set.
2. **Add a status** — label, key, category, colour, order.
3. **Edit** — expand a row's *Edit* to change its label/key/category/colour/order.
4. **Reorder** — *Reorder this set* stamps a new ordinal on every row atomically.
5. **Delete** — removes the status. The last status in a set cannot be deleted (a
   set is never left empty). Deleting a status that work rows point at is safe: the
   `task`/`project` FK is `ON DELETE SET NULL`, so those rows keep their legacy
   string status and simply lose the FK.

## Security

Configuration is gated by the **`catalog:write`** capability (the same admin
capability that owns the custom-field, question and template catalogs). Non-admins
see a set read-only — every create/edit/reorder/delete server action re-checks the
capability and fails closed. The least-privilege INSERT/UPDATE/DELETE grant on
`status_def` for the web role ships in migration 0104.

## Not in this surface (deferred)

- **Per-status WIP limits** and the **over-limit board-column highlight** (ADR-0066
  C1) are part 2 of #616, blocked on the board-columns follow-up **#613**. The
  `wip_limit` column is shown read-only here so admins can see seeded values, but it
  is not editable on this surface yet.
- **Stamping the FK on every mutation**, the kanban board reading `status_def`
  columns, and reporting re-keying off `category` are the broader consumer re-key
  tracked under epic #326 — additive on top of this admin surface.
