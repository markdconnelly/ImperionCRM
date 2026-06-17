# Public opt-in & SMS consent capture

The public **`/opt-in`** page is the consent-capture artifact behind the
**ACS toll-free SMS verification** (mandatory before the platform may send US
text messages). The toll-free verification reviewer requires a public URL that
shows the opt-in language and a clear, honest consent flow — **the quality of
the opt-in description is the top rejection driver**, so the language is the
primary deliverable and this doc is its reference.

[← Compliance](./README.md) ·
[Consent ledger (ADR-0014)](../decision-records/ADR-0014-consent-ledger-communications.md) ·
[Lead hooks (ADR-0024)](../decision-records/ADR-0024-per-user-personal-connections-and-lead-hooks.md) ·
[Backend boundary (ADR-0028)](../decision-records/ADR-0028-backend-topology-and-network-isolation.md)

---

## What it is

| | |
| --- | --- |
| **Route** | `/opt-in` — public, unauthenticated. Outside the `(app)` route group; excluded from the sign-in gate in `src/middleware.ts` via the anchored `opt-in(?:$\|/)` matcher exclusion (same pattern as `/story`, `/break-glass`). |
| **Files** | `src/app/opt-in/{page,layout,actions,consent-language}.tsx?` |
| **Submit** | A server action writes **one append-only bronze `lead_capture_event`** (ADR-0024) under a standing `web_form` hook named *"Public opt-in page"*. **No** `consent_event` and **no** contact are written from the front end. |
| **Resolution** | The **backend** resolves the capture into a contact and writes the consent event (ADR-0028: the backend owns all processes / the consent ledger; the front end never writes the consent ledger directly). Until then the capture sits at `status='new'`. |

## Why this shape (not a direct consent write)

A public page that wrote `consent_event` (or created contacts) directly would
mean an **unauthenticated write into the production consent ledger** from the
front end — which violates the backend-owns-all-processes boundary (ADR-0028)
and the append-only-evidence invariant. Instead the front end does the one
low-risk thing it is allowed to: an **append-only bronze capture** (ADR-0024),
exactly like every other lead hook. The bronze row carries no privileged effect
until the backend validates and resolves it.

## The consent language (the crux of the submission)

The exact wording lives in **one place** — `src/app/opt-in/consent-language.ts`
— so the words the page renders are byte-for-byte the words stored as proof on
the capture payload. `CONSENT_LANGUAGE_VERSION` is recorded on every capture;
bump it whenever the wording changes.

The SMS consent statement covers every element toll-free verification looks for:

- **Who** is messaging and **what** the messages are (reminders, updates, offers).
- **"Consent is not a condition of purchase."**
- **Message frequency varies** + **"Message & data rates may apply."**
- **STOP** to unsubscribe, **HELP** for help.
- Links to **Privacy Policy** and **Terms**.

Email consent is a separate, independently-checked statement (a visitor may opt
into one channel, both, or neither — at least one is required to submit).

## Consent proof recorded on each capture

The bronze `payload_bronze` jsonb stores, for the verification evidence:

- `consent.languageVersion` — which wording the visitor saw.
- `consent.sms` / `consent.email` — per-channel `{ agreed, text }` (the verbatim statement).
- `proof.submittedAt`, `proof.sourceUrl` (referer), `proof.userAgent`.
- Only the **identifiers for channels actually consented** are retained (an
  un-consented phone/email is dropped).

## Security notes

- This server action is the **only unauthenticated write in the app**. It is
  deliberately minimal: validate → append bronze. Next.js server actions are
  CSRF-safe by default (origin-checked POST).
- **Residual abuse vector:** an unauthenticated public POST can be spammed.
  Rate-limiting belongs at the **edge / backend**, out of front-end scope —
  tracked as a follow-up. The append-only bronze table bounds the blast radius
  (no privileged effect until backend resolution).
- No secrets; no PII beyond what the visitor submits; no consent-ledger or
  contact write.
