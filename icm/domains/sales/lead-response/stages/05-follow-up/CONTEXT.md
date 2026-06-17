# Stage 05 — follow-up

**Job:** keep the thread alive — schedule follow-ups, detect replies, and
re-enter drafting or close the run.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Send record | stage 04 `send-record.md` | all | what/when we sent |
| Replies | `interaction` timeline | this contact, after send timestamp | response detection |
| Channel rules | `../../skills/channel-rules.md` | cadence section | how often we may nudge |

## Process

1. `[script]` Schedule per the cadence table in `channel-rules.md` (max
   touches, spacing, stop conditions) — deterministic cadence/date math. Apollo
   nurture follows its sequence definition instead.
2. On reply detected: a substantive reply re-enters stage 03 (new draft, same
   run, same checkpoint rules); an unsubscribe/stop request immediately ends
   the run AND writes the consent ledger stop — this outranks every cadence.
3. `[script]` On max-touches with no reply: close the run `nurture-exhausted`,
   leave the contact in the correct lifecycle state for the next campaign.

## Outputs

`followup-log.md` — appended per touch/decision; final close reason.

## Audit

- [ ] Never exceeds the channel's max-touches or min-spacing
- [ ] Stop requests honored before any other logic, ledger entry written
- [ ] Run closed with exactly one terminal state
