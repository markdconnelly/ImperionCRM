# OS Brain — stress-test plan (#1319)

**Purpose:** stress-test the OS Brain recall loop before turning recall on in production. Two
axes: a **perf axis** (tunable targets) and an **integrity axis** (the pass/fail gate). The
integrity/RLS-isolation result — not the perf numbers — decides whether recall goes live.

**Cross-references:** ADR-0105 (two-axis RLS access spine, §3c integrity invariants) ·
ADR-0113/0114/0115/0116 (verbatim memory · data model · ranker · MCP contract) · #1318 (OS
Brain umbrella) · #1319 (this plan) · #1152 (synthesis store / curated vault) · #305 (Haiku
rerank). Run after the MWP loop is proven — see `docs/runbooks/os-brain-hydration-mwp.md`.

---

## 1. Perf axis (tunable)

Vectorize a **representative corpus** and measure latency under realistic concurrency:

- **Corpus:** ~50k `knowledge_object` rows + their chunks (representative of the real gold
  surface, not the ~10-row MWP slice).
- **Targets:**
  - **Recall p95 < 500 ms**, *including* the query-embed round-trip.
  - **Drill-down < 200 ms** (gold summary → verbatim bronze rows).
- **Concurrency:** **~20 concurrent recalls** — modeling employees plus fan-out agents issuing
  recalls in parallel.

These targets are **tunable**. Missing them is a tuning/scaling problem (index params, ranker
weights, connection pool, embed batching), not a go-live blocker on its own.

---

## 2. Integrity axis (the pass/fail GATE)

Hammer recall **concurrently across different owners and wings** and **assert the invariants
hold under load**:

- **No cross-owner RLS leak.** No recall returns a row owned by a different owner / outside the
  caller's wing — under concurrency, with mixed-owner traffic in flight.
- **`agent_slug` attribution intact.** Every recalled/curated row keeps correct agent
  attribution; concurrency never mis-attributes.
- **Drill always resolves.** Every gold summary → verbatim drill resolves to the correct
  verbatim rows, under load.
- **No PII in gold.** Gold summaries carry no PII / client identifiers (ADR-0086 / ADR-0113
  boundary).

These map directly to the integrity invariants in the hydration runbook (§4) and ADR-0105 §3c.

---

## 3. Go-live bar

**The integrity / RLS-isolation test is pass/fail for turning recall on in production.**

Perf is tunable — a slow p95 can ship behind tuning. But **a personal-tier row leaking to the
wrong owner under concurrency is disqualifying**: recall does **not** go live until the
RLS-isolation test passes cleanly. State this explicitly to whoever signs off: the gate is
isolation, not latency.

---

## 4. Rerank

**Haiku rerank (#305) stays OFF** for the MWP and the first stress run — it adds cost and
latency. It sits behind a flag. Revisit **only if** recall quality measurably needs it on the
real corpus (i.e. the hybrid ranker, ADR-0115, underperforms on representative queries).
Default for the first stress run: flag off.
