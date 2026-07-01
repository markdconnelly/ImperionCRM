/**
 * Client-safe action-kind constants for the approval cockpit.
 *
 * This module carries NO `server-only` import and no DB/Node dependency, so it can be
 * imported by both the server read-layer (`pending-action-cockpit.ts`) and the client
 * cockpit component (`components/agents/pending-action-cockpit.tsx`) without dragging the
 * server-only read-layer into the client bundle (which breaks the Next build).
 */

/**
 * The `action_kind` a deny-route escalation row carries (backend #499 / ADR-0109). It is
 * NOT a proposed send — it is an operator TO-DO: a denied inbound social thread that still
 * owes the customer a reply (`plan_seq=NULL` ⇒ never dispatches; queue item only). The
 * cockpit renders it as a distinct "reply owed" card, not an approve-a-draft card (#1784).
 */
export const HUMAN_FOLLOW_UP_KIND = "human_follow_up";
