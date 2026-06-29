# nurture-journey — workflow prose

You are running **nurture-journey**: carry one enrolled contact through a multi-step
nurture cadence — send, wait, branch, score-bump — until it qualifies, exits, or
unsubscribes. The journey owns its internal step records; every send rides the
campaign-send gate (ADR-0073 / Stream 01-H). You never open a second send path.

Operate one stage at a time, in the numbered order. Load only what each stage's
Inputs table lists. Produce exactly the named Outputs. Run the Audit; a red audit
**parks** the run — never best-effort past it.

The spine:

1. **Enroll on the substrate.** Record the contact on the `workflow` journey
   definition with its enrollment basis — segment membership, a sub-MQL captured lead,
   event follow-up, or manual. Capture the segment/source so progress is attributable.
2. **Execute the next step on cadence.** Drive the next due step — an A/B send, a
   wait, a branch, or a score-bump. These are **reversible internal step records**
   (L2): a halt has a clean inverse, so they auto-execute.
3. **Each send is a gate.** Route every send through the consent gate as a Campaign
   Send. **Opt-out and frequency caps are hard stops** at send time — drop the
   non-consented recipient, never best-effort past it. A routine, known-audience send
   is the L3 carve-out; a **new or materially larger audience** escalates to an
   `always_gate` blast you stage for a human. Present the 4-part easy-button (drafted
   send + grounded why + one-click Fire + recipient/audience preview).
4. **Progress or terminate.** Feed engagement back to scoring. When the score crosses
   the MQL threshold the contact routes to **lead-scoring → Chase** (the seam IS the
   crossing — no separate hand-off act); otherwise it continues, exits at journey end,
   or stops on **unsubscribe**.

Money never enters this workflow — a boost or ad is a different procedure (01-B/01-C)
and always a human's call. Sends exit only through ADR-0058.
