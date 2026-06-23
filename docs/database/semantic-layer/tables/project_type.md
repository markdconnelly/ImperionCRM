---
type: Silver Table
title: project_type
entity: project_type
archetype: H
description: User-creatable project category (onboarding, implementation, …) that classifies projects and scopes which templates apply. Website system of record (reference/config).
resource: ../../../decision-records/ADR-0052-project-board-tasks-meetings-sales-activity.md
tags: [silver, delivery, project, reference, config]
data_class: operational
timestamp: 2026-06-23T00:00:00Z
---

# project_type

The user-creatable **category** a [`project`](project.md) belongs to (e.g. Onboarding,
Implementation, Migration). Modeled as a reference table rather than an enum precisely so
admins can add their own types without a migration (ADR-0052 — "one board, user-creatable
types"). It also scopes which templates apply: a [`delivery_template`](delivery_template.md)
or [`project_template`](project_template.md) optionally binds to a `project_type` to filter
the picker. Born silver — website system of record. Reference/config (archetype H).
Governed by
[ADR-0052](../../../decision-records/ADR-0052-project-board-tasks-meetings-sales-activity.md).

## Source of record / authority

**Website system of record (reference/config).** `key` is the stable machine identity
(UNIQUE); `name` is the unique display label (UNIQUE). `is_protected` marks a seeded
built-in type that cannot be deleted, so the system's required categories always exist
while admins remain free to add their own. No external system owns it; no tokens or
secrets (a plain config table, kept minimal per the archetype-H bar).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `key` | text | stable machine key; UNIQUE |
| `name` | text | display label; UNIQUE |
| `description` | text | optional |
| `is_protected` | bool | seeded built-in — undeletable |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- Referenced by [`project`](project.md) (`project_type_id`), and used to scope which
  [`delivery_template`](delivery_template.md) / [`project_template`](project_template.md)
  rows are offered for a given type.

## Notes

A configuration table — no client PII, no secrets. Safe to describe fully here.
