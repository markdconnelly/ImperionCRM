# Workflow: content-studio (marketing v1)

**Job:** Belle authors one typed **Content Asset** — content, sales-enablement, or
PR — brand-checks it against the read-only brand registry, and hands it to Loveable
to publish. The whole thing is an **internal authoring + handoff** act: it touches no
contact, asserts no claim it can't source, and never sends. (Stream 01-N; epic #1696
D2/D3; archetype B-author → internal review-gate → human handoff.)

**Trigger:** a content brief lands — a campaign milestone needs an asset, an operator
says "write the whitepaper / battlecard / press release," or 01-M flags a content gap.
One run per Content Asset.

**Output identity:** the asset is an **internal `content_asset`** drafted by Belle and
written via `content.write` (the INTERNAL silver write, ADR-0128 L2 — never a direct
silver write, never a send). **Publish is a HANDOFF** (D3): a human exports the approved
asset to Loveable and stores the returned `publish_ref`. There is NO Loveable API in v1
and this is **not** an ADR-0058 customer send — no contact is touched, no consent gate
applies.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ground | Ground the brand rules, the brief, the linked campaign, and recent performance | — |
| 02 | compose | Author the content_asset per type × audience (no fabricated claim) | — |
| 03 | review-gate | Brand-compliance + substantiation gate; stamp the compliance note | **Yes** |
| 04 | publish-handoff | Hand the approved asset to Loveable; store the `publish_ref` | — |
| 05 | reconcile | Link the asset → its campaign for attribution; feed 01-M | — |

## Autonomy

Starts `draft` (ADR-0061). When an admin flips it to `auto`, only the **internal,
reversible compose/stage** of a content_asset draft (`content.write`) may self-execute
at L2 (ADR-0128 A10 row 1). The **review-gate** (stage 03 — brand-compliance vs
`brand_asset` + substantiation) is **human-approved in v1 and never self-approves a
published claim**: a failed brand/substantiation check or an **empty brand registry**
parks in every mode (A5). The **publish-handoff** (stage 04) is a **human Loveable
export**, never autonomous. **No money and no customer send enters this workflow** — a
boost/ad is 01-B/01-C, a send is ADR-0058; neither is here. Anything unstated parks.

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `brand-voice.md` (every marketing draft sounds the
same). Workflow-local (Tier 3, `./skills/`): `content-types.md` (the type×audience matrix
+ shape/length norms per type) · `substantiation-rules.md` (cite-or-cut for content
claims). Mark-editable business content; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed workflow
prose is `prose.md`.

## SOP (the dual-audience document)

The full human+machine SOP for this procedure — frontmatter procedure-object + the
end-to-end runnable steps, the review-gate brand-compliance contract, the publish-handoff
variant, the learning on-ramp, and the dormancy posture — is [`sop.md`](sop.md) (ADR-0136
A8; mirrors the social-inbox exemplar, #1759). This `CONTEXT.md` stays the thin routing
surface; `sop.md` is the canonical prose. The control layer (§A invariants, the B7
archetype rule) is cited there from ADR-0136, never redefined.
