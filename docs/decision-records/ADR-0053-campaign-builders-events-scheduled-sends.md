# ADR-0053: Campaign builders — events, scheduled sends, and the provider set

**Status:** accepted (2026-06-10, decisions locked with Mark in design session for issue #88)

## Context and decision

Demand gen had bones but no muscles: `campaign/ad/campaign_metric/audience/lead_hook` existed (ADR-0026, migrations 0022/0023), Workflows had step/enrollment tables with no executor, consent gating worked, and connections/Key Vault custody was the provider pattern — but there were no builders beyond thin forms, no scheduler, no SMS channel, and no event/webinar model at all. Mark wants builders for Facebook ads, email, SMS, webinars, and live events, with scheduling and automation; leads from every source feed the leads object (`contact.crm_stage`).

We decided: **events become first-class objects** (`event` + `event_registration`) that campaigns promote — not campaign channels; **builders are structured forms + preview** producing typed config — not drag-drop canvases; scheduling splits into two grains — **Campaign Sends** (schedulable blasts, absolute or event-relative) vs **Workflows** (per-contact journeys), bridged by auto-enroll hooks; and the provider set is **Meta Marketing API + Azure Communication Services (email & SMS) + Teams links**, chosen on cost and stack fit. Execution (send executor, Meta pushes, metric polling) stays backend/pipeline-deferred per ADR-0042's division of labor. Vocabulary in `CONTEXT.md`: Event, Event Registration, Campaign Send, Builder.

## Decisions

1. **Events are objects, campaigns are delivery vehicles.** New `event` (kind `webinar | live_event`) and `event_registration` tables. The webinar/live-event builders create events; a campaign of any channel can point at the event it promotes (`campaign.event_id`). (Rejected: webinar/live_event as `campaign_platform` values — a webinar promoted by FB ads AND email needs two campaigns and the event itself has nowhere to live; modeling events on `meeting` — a 200-attendee webinar is not one per-contact interaction record.)

2. **Registration is lead capture.** A new `lead_hook` kind `event_registration` (hook `config` carries the event id) lands signups in the existing capture inbox, resolving to contacts and feeding `contact.crm_stage` like every other lead source. Live events use the existing `qr` hook kind + manual check-in. Attendance is recorded on the registration (`attended | no_show`) after the event.

3. **Builders are structured forms + preview.** FB ads: campaign/ad fields + typed creative (headline, body, image ref, CTA, landing URL, UTM) rendered as a card preview, with an audience picker; email: subject/body composer with merge fields (`{{first_name}}`…) and rendered preview; SMS: segment-length-aware text + merge fields; webinar/live event: event details + registration page config. Typed shapes live in the existing jsonb columns (`ad.creative`, `campaign_send.template`, `event.registration_page`). (Rejected: drag-drop visual editors — bigger build, conflicts with the dense-internal-tool aesthetic, delays integration.)

4. **Two scheduling grains.** A **Campaign Send** (`campaign_send`) is one schedulable blast: channel `email | sms`, recipients = an audience or the linked event's registrants, typed template, and exactly one of `send_at` (absolute) or `event_offset_minutes` (relative to the linked event's start — e.g. −1440 = the T-1-day reminder). Multi-step nurture stays in **Workflows**; a campaign or event can name a `workflow_id` that auto-enrolls responders/registrants. (Rejected: everything-is-a-workflow — audience-wide blasts don't fit per-contact enrollment semantics; defer-scheduling — punts the issue's core ask.)

5. **Execution is backend-deferred, semantics decided now.** The backend send executor walks due sends, resolves recipients at fire time (audiences stay dynamic; the recipient set is materialized at send, never at schedule), **consent-gates per recipient per channel** via `current_consent`, sends via ACS, logs one outbound `interaction` per recipient (campaign-attributed), updates the send's counters, and marks it `sent`. Idempotent per (send, contact). Until the executor exists, builders save and schedule; nothing fires — consistent with the repo's stubbed-not-broken rule.

6. **Provider set: Meta + ACS + Teams** (cost-checked 2026-06-10). FB ads → Meta Marketing API on the existing `facebook` provider, company-scoped credential. Email → **ACS Email on a dedicated marketing domain** ($0.25/1k pay-as-you-go vs SendGrid's $19.95/mo floor; never Graph sendMail — bulk marketing mail from the corporate tenant burns its deliverability). SMS → **ACS SMS** (~$0.0075/segment; 10DLC registration + carrier surcharges are pass-throughs identical on Twilio, and one Azure vendor means managed-identity auth and one bill). Webinars → in-app registration + a Teams meeting link on the event; the Graph webinar API is a later enhancement. Live events → no API. The `connection_provider` enum gains `acs` (company-scoped). (Rejected: Twilio/SendGrid — two more vendors and a 4–80× email price for tooling we don't need at this volume; Graph-first — deliverability risk, no SMS.)

7. **Metrics stay polled, never system of record (ADR-0012).** The pipeline's daily Meta pull lands in `campaign_metric`; ACS delivery stats land in `campaign_send` counters. Event funnel numbers (registrations, attendance) are derived from `event_registration`, not stored.

8. **RBAC.** New `canManageCampaigns` predicate (admin | sales, ADR-0030 pattern) gates campaign/event/send writes; reads open to all roles.

## Table specifications (migration 0058+, verify next number on disk; parallel sessions active)

```sql
CREATE TYPE event_kind   AS ENUM ('webinar','live_event');
CREATE TYPE event_status AS ENUM ('draft','scheduled','live','completed','canceled');

CREATE TABLE event (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               event_kind NOT NULL,
  name               text NOT NULL,
  description        text,
  status             event_status NOT NULL DEFAULT 'draft',
  starts_at          timestamptz,                -- required to leave draft (CHECK below)
  ends_at            timestamptz,
  timezone           text,
  capacity           integer,
  join_url           text,                       -- Teams meeting/webinar link (webinar)
  location           text,                       -- venue (live_event)
  registration_page  jsonb NOT NULL DEFAULT '{}'::jsonb,  -- typed registration-page config
  workflow_id        uuid REFERENCES workflow(id) ON DELETE SET NULL,  -- auto-enroll registrants
  created_by_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'draft' OR starts_at IS NOT NULL)
);

CREATE TABLE event_registration (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  contact_id       uuid REFERENCES contact(id) ON DELETE SET NULL,
  capture_event_id uuid REFERENCES lead_capture_event(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'registered'
                     CHECK (status IN ('registered','attended','no_show','canceled')),
  source           text,                         -- which hook/channel brought them
  registered_at    timestamptz NOT NULL DEFAULT now(),
  checked_in_at    timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX event_registration_contact_uniq
  ON event_registration (event_id, contact_id) WHERE contact_id IS NOT NULL;

CREATE TYPE campaign_send_status AS ENUM ('draft','scheduled','sending','sent','canceled');

CREATE TABLE campaign_send (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id          uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
  channel              text NOT NULL CHECK (channel IN ('email','sms')),
  recipient_scope      text NOT NULL DEFAULT 'audience'
                         CHECK (recipient_scope IN ('audience','event_registrants')),
  audience_id          uuid REFERENCES audience(id) ON DELETE SET NULL,
  template             jsonb NOT NULL DEFAULT '{}'::jsonb,  -- typed: email {subject, body, merge fields} / sms {text}
  send_at              timestamptz,              -- absolute schedule
  event_offset_minutes integer,                  -- relative to the campaign's linked event start; negative = before
  status               campaign_send_status NOT NULL DEFAULT 'draft',
  queued_count         integer NOT NULL DEFAULT 0,
  sent_count           integer NOT NULL DEFAULT 0,
  delivered_count      integer NOT NULL DEFAULT 0,
  failed_count         integer NOT NULL DEFAULT 0,
  sent_at              timestamptz,
  created_by_user_id   uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'draft'
         OR ((send_at IS NOT NULL)::int + (event_offset_minutes IS NOT NULL)::int = 1)),
  CHECK (recipient_scope <> 'audience' OR audience_id IS NOT NULL)
);
CREATE INDEX campaign_send_due_idx ON campaign_send (send_at) WHERE status = 'scheduled';

ALTER TYPE campaign_platform  ADD VALUE IF NOT EXISTS 'sms';
ALTER TYPE lead_hook_kind     ADD VALUE IF NOT EXISTS 'event_registration';
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'acs';

ALTER TABLE campaign
  ADD COLUMN event_id    uuid REFERENCES event(id) ON DELETE SET NULL,
  ADD COLUMN workflow_id uuid REFERENCES workflow(id) ON DELETE SET NULL;  -- auto-enroll responders
```

Typed jsonb shapes (TypeScript, enforced in the builders, not the DB): `ad.creative = {headline, body, imageRef, cta, landingUrl, utm}`; `campaign_send.template = {subject, bodyMarkdown, mergeFields[]} | {text}`; `event.registration_page = {headline, blurb, fields[]}`.

Grants: web MI reads/writes all the above (app-owned tables). The backend role needs read/write on `campaign_send`, `event`, `event_registration` plus read on `audience_member` / `current_consent` for the executor; the pipeline role keeps its `campaign_metric` writes.

## Consequences

- Build slices: (A) events + registration + webinar/live-event builders; (B) `campaign_send` + email/SMS builders + scheduling UI; (C) FB ads builder upgrade; (D) auto-enroll wiring campaign/event → workflow — filed as AFK issues in this repo; (E) backend executor + ACS + Meta + metric polling filed in ImperionCRM_Backend (blocked on credentials/Azure config).
- New Azure resources at integration time: an ACS resource, a verified marketing email domain, a leased + 10DLC-registered SMS number; a Meta business app credential — all company-scoped connections, Key Vault custody.
- Nothing sends until the executor exists; builders save, schedule, and preview — stubbed-not-broken.
- The Graph webinar API (auto-created Teams webinars + registration sync) is a future enhancement, not in v1.
