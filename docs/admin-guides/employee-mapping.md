# Employee Mapping — admin guide

Admin one-time setup that links each employee to their external records so the
three time signals can join (ADR-0082, issue #468). Surface: **Employee Mapping**
in the left nav (`/timesheets/mappings`) — **admin-only** (`time:map`; hidden from
non-admins).

## Why it exists

Time tracking reconciles three systems — the CRM (attendance, authoritative),
**Autotask** (Ticket Time Entries, corroborating), and **QuickBooks Online**
(payment, authoritative for the payment fact). They are joined per employee by:

- **Autotask Resource id** — attributes the employee's Autotask Ticket Time Entries.
- **QuickBooks vendor id** — matches the employee's payment.

The employee's **email is the consistent join key** across all three systems and is
shown read-only on each row.

## Mapping an employee

Every employee (every `app_user`) appears as a row after their first Entra sign-in.
For each, enter the **Resource id** (numeric) and **Vendor id**, then **Confirm**.
Confirming stamps who confirmed it and when (audit), and flips the row to **Mapped**.
A blank field clears that mapping. Re-confirming overwrites the stored ids.

## Notes

- Automatic email-based resolution — pulling the Autotask Resource list and
  QuickBooks vendor list and auto-matching by email — is a **backend** enhancement.
  Until it lands, the admin enters the resolved ids here; the resolved ids are
  stored for stability and audit regardless.
- This surface touches the **mapping columns only** on `employee_profile`. No
  compensation data (classification, Pay Rate) is read or written here
  (ADR-0082 §Security).
