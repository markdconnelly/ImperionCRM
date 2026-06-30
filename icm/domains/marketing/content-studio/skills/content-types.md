# Skill (Tier 3, workflow-local): content-types

Mark-editable matrix of which `content_asset` **type** maps to which **audience**, plus
the shape/length norm per type. Binds the brief to a concrete asset shape at compose time.
Stages cite this; they never restate it. Reference data by name — **no PII, no client
identifiers, no secrets**.

## The type × audience matrix

The asset's `type` determines its default `audience` family:

| Family | `type` | Default `audience` |
|---|---|---|
| **content** | `blog` | prospect |
| **content** | `case_study` | prospect |
| **content** | `whitepaper` | prospect |
| **sales-enablement** | `battlecard` | seller |
| **sales-enablement** | `one_pager` | seller |
| **PR** | `press_release` | press |
| **PR** | `announcement` | press |

Rules of thumb:
- **Enablement is audience `seller`** — battlecards and one-pagers are written for the
  internal seller, not the prospect; they may carry competitive framing the public copy
  won't.
- **PR is type `press_release` / `announcement`, audience `press`** — written for the
  press/public-record register, not a sales pitch.
- **content (blog/case_study/whitepaper) is audience `prospect`** — public, on-brand,
  demand-facing; the whitepaper form feeds lead-capture (01-F).
- A brief may override the default audience; the override is named in the brief and honored
  by stage 02.

## Shape / length norms per type

- **blog** — single argument, scannable; subheads + a clear takeaway; short.
- **case_study** — problem → approach → measured result; **every result claim traces to a
  consented `reference`** (substantiation-rules); medium.
- **whitepaper** — long-form, structured (exec summary → body → conclusion); claims densely
  sourced; the **form stays Imperion's** (gated, feeds 01-F).
- **battlecard** — one-screen, scannable; us-vs-them framing; internal only.
- **one_pager** — single page, benefit-led; seller-facing.
- **press_release** — inverted-pyramid; dateline, boilerplate, contact; factual register,
  no marketing superlatives unsubstantiated.
- **announcement** — short, factual, on-the-record; what changed, when, why it matters.

A type with no matching norm here → use the closest family norm and flag it in the brief.
