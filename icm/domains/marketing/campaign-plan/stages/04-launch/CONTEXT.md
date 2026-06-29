# Stage 04 — launch

**Job:** schedule the approved campaign's children via their own sub-procedures, each
carrying its own gate, and wire the campaign attribution.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Approved plan | stage 03 output | all | the human-approved plan + channel mix |
| Campaign record | `` `okf:campaign` `` | this campaign | the campaign to launch + attribution tag |
| Child posts | `` `okf:social_post` `` | this campaign's organic posts | the social-content children to schedule |
| Child sends | `` `okf:campaign_send` `` | this campaign's sends | the campaign-send children to schedule |

## Process

1. `[script]` From the approved channel mix, enumerate the children to launch: organic
   posts, sends, the nurture journey, paid.
2. `[script]` **Schedule each child via its sub-procedure, carrying its own gate** —
   never duplicate its actuation:
   - organic posts → `social-content` (01-A) — each rides its own **publish-gate**;
   - sends → `campaign-send` (01-I) — each rides its own **send-gate** (consent-gated);
   - the nurture journey → `nurture-journey` (01-H) — each step's send rides 01-I's gate;
   - paid → `paid-ads` (01-B) — each ad rides its own **money-gate** (`always_gate`).
3. `[script]` Tag each scheduled child with the **campaign attribution** so metrics roll
   up to the campaign (→ marketing-metrics / 01-M). The container holds the launch clock;
   each child owns its act (A11).
4. `[script]` Stamp the launch outcome on the `campaign` (children scheduled, approver,
   as-of) and close the run.

## Outputs

`launch.md` — the children scheduled (per child: the sub-procedure it routed to and the
gate it carries), the campaign attribution wiring, the launch outcome stamp, and the
close state.

## Audit

- [ ] Every child routed to its sub-procedure (no publish/send/spend duplicated here)
- [ ] Each child carries its OWN gate — no child's gate waived by this container
- [ ] Paid children route to `paid-ads` with `always_gate` intact (no spend committed here)
- [ ] Campaign attribution tagged on every child; launch outcome stamped (approver, as-of)
