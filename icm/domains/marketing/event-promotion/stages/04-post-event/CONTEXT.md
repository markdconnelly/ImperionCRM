# Stage 04 — post-event

**Job:** enroll attendees and no-shows into post-event nurture and feed attendance back
to scoring — every follow-up send owned by nurture-journey.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Attendance | trigger payload | this event's attended / no-show split | who to enroll into which track (orchestration metadata — Planned-Connector dep, not a room) |
| Captured registrants | stage 02 output | this event | the registrant→contact links to enroll |
| Contact kernel | `` `okf:contact` `` | the registrants | resolve enrollees to contacts |
| Follow-up consent | `` `okf:consent_event` `` | each enrollee | consent for the post-event journey's sends |

## Process

1. `[script]` Split the registrant set into attended / no-show from the attendance record
   (cited + as-of); resolve each to its `contact`.
2. `[script]` Enroll attendees and no-shows into the matching post-event track via
   **nurture-journey** (01-H) — attendees into a warm follow-up, no-shows into a
   re-engage track. **The journey's sends carry their own (campaign-send) gate**; this
   stage only enrolls.
3. `[script]` Feed attendance back to scoring (→ 01-G) so the event signal moves the
   `lead_score`. Cross-event correlation stays internal/aggregated (A7).
4. `[script]` Stamp the run outcome (registered / attended / no-show counts, enrolled
   tracks, as-of) and close the run.

## Outputs

`post-event.md` — the attended/no-show split, the nurture-journey enrollments per track,
the scoring hand-off, and the run-outcome stamp + close state.

## Audit

- [ ] Attendance split cited + as-of (A5); none fabricated
- [ ] Every enrollee routed through nurture-journey (no send actuated here)
- [ ] Attendance fed to scoring; run outcome stamped (counts, tracks, as-of)
- [ ] No cross-client/audience data bled into the record (internal/aggregated only, A7)

## Autonomy

No checkpoint of its own. Enrollment + scoring + close are internal/reversible — auto at
**L2**. The post-event journey's **sends** gate inside **nurture-journey** (which
inherits campaign-send's gate; large/new-audience → `always_gate`); nothing outbound is
committed in this stage.
