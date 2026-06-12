/**
 * Read-side for the Board of Directors pages (ADR-0049, backend ADR-0039).
 *
 * Reads degrade in tiers, matching the app-wide pattern (ADR-0007/0042/0048):
 *  1. Direct DB read — the web identity holds SELECT on `agent` and the
 *     `board_*` tables (migration 0056); rendering reads direct is the ADR-0042
 *     division of labor, and is the primary tier here (unlike agent settings,
 *     where the backend GET carries live state the DB lacks — board reads are
 *     plain rows).
 *  2. Backend GET /board/agents | /board/sessions/{id} — when the DB is unset
 *     but the backend is wired (backend ADR-0039 keeps the read endpoints "for
 *     symmetry" with exactly this fallback in mind).
 *  3. Mock rows — the page renders without a backend or a database.
 *
 * Writes (convening) NEVER happen here — convening is a PROCESS and goes through
 * the backend POST (src/app/(app)/board/actions.ts). Server-only.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import { boardService } from "@/lib/services";
import type { BoardTranscriptMessage } from "@/lib/board/session";

// ── Shapes the pages render ─────────────────────────────────────────────────────

export interface BoardPersona {
  id: string;
  name: string;
  personaRole: string | null;
  /** agent.seat_kind (0059) — deputy/advisor labeling; absent on picker/wire tiers. */
  seatKind?: string | null;
}

export interface BoardPersonasState {
  personas: BoardPersona[];
  /**
   * The advisor bench (seat_kind='advisor', selected IGNORING is_active —
   * invitation IS the activation, migration 0059). Counsel, not votes.
   */
  advisors: BoardPersona[];
  source: "db" | "backend" | "mock";
}

export interface BoardSessionRow {
  id: string;
  topic: string;
  status: string;
  /** Convener display name (null when unresolvable). */
  openedBy: string | null;
  createdAt: string;
  concludedAt: string | null;
  hasRecommendation: boolean;
}

export interface BoardSessionDetail {
  session: {
    id: string;
    topic: string;
    status: string;
    /**
     * The persisted Board Packet (ADR-0054 §3) — byte-for-byte what the personas
     * deliberated over, including the `(degraded: …)` header / "Unavailable
     * inputs" footer when the composer or a pull failed. Null on pre-0059 sessions.
     */
    packetMd: string | null;
    /** The human CISO's convene-time position (ADR-0054 §4); null when none given. */
    cisoPositionMd: string | null;
    openedBy: string | null;
    createdAt: string;
    concludedAt: string | null;
    /** When the deputy pause started (0066, #185) — the deputy-review SLA clock.
     * Retained as the historical record after resume. */
    pausedAt: string | null;
  };
  members: BoardPersona[];
  messages: BoardTranscriptMessage[];
  recommendation: {
    /** board_recommendation.id — the review endpoint's target. */
    id: string;
    recommendation: string;
    rationale: unknown;
    createdAt: string;
    /** Human-CISO accountability record (0059): pending_review | ratified | overruled. */
    reviewStatus: string;
    /** Reviewer display name (DB tier) — null when unreviewed or unresolvable. */
    reviewedByName: string | null;
    reviewedAt: string | null;
    reviewRationale: string | null;
  } | null;
}

// ── Mock tier (the app runs DB-less on sample data, ADR-0007) ──────────────────

const MOCK_PERSONAS: BoardPersona[] = [
  { id: "mock-ceo", name: "Chief Executive", personaRole: "CEO" },
  { id: "mock-cfo", name: "Chief Financial Officer", personaRole: "CFO" },
  { id: "mock-coo", name: "Chief Operating Officer", personaRole: "COO" },
  { id: "mock-cmo", name: "Chief Marketing Officer", personaRole: "CMO" },
  { id: "mock-ciso", name: "Chief Information Security Officer", personaRole: "CISO" },
];

const MOCK_ADVISORS: BoardPersona[] = [
  { id: "mock-adv-product", name: "Product Strategy Advisor", personaRole: "Advisor — Product" },
  { id: "mock-adv-pricing", name: "Pricing Advisor", personaRole: "Advisor — Pricing" },
  { id: "mock-adv-people", name: "People & Culture Advisor", personaRole: "Advisor — People" },
];

const MOCK_SESSIONS: BoardSessionRow[] = [
  {
    id: "mock-session-1",
    topic: "Should we bundle a co-managed SOC offering into the standard managed-services tier?",
    status: "concluded",
    openedBy: "Avery Chen",
    createdAt: "2026-06-08T15:10:00Z",
    concludedAt: "2026-06-08T15:11:30Z",
    hasRecommendation: true,
  },
  {
    id: "mock-session-2",
    topic: "Raise onboarding fees 15% for sub-25-seat clients?",
    status: "failed",
    openedBy: "Jordan Patel",
    createdAt: "2026-06-07T11:40:00Z",
    concludedAt: "2026-06-07T11:40:20Z",
    hasRecommendation: false,
  },
];

const MOCK_DETAILS: Record<string, BoardSessionDetail> = {
  "mock-session-1": {
    session: {
      id: "mock-session-1",
      topic: MOCK_SESSIONS[0].topic,
      status: "concluded",
      packetMd:
        "# Board Packet\n\n## Business snapshot\n- Pipeline: 14 open opportunities · $412k weighted\n- Managed-services seats: 1,240 across 38 accounts\n\n## Campaigns (last 30 days)\n- Co-managed SOC webinar — 86 leads, $2.1k spend\n\n## Security posture (aggregates)\n- Median Secure Score 71% · 3 tenants below 60%\n- 12 open credential exposures across 4 tenants\n\n## Relevant knowledge\n- 2025 SOC delivery retro: staffing was the bottleneck, not tooling.",
      cisoPositionMd:
        "Bundling a SOC offering is security-positive overall, but only if 24/7 coverage is real — partial coverage marketed as a SOC is a liability. No objection if delivery is staffed before launch.",
      openedBy: "Avery Chen",
      createdAt: "2026-06-08T15:10:00Z",
      concludedAt: "2026-06-08T15:11:30Z",
      pausedAt: null,
    },
    members: MOCK_PERSONAS.slice(0, 3),
    messages: [
      {
        id: "mock-m1",
        agentId: "mock-ceo",
        name: "Chief Executive",
        personaRole: "CEO",
        content:
          "Bundling a co-managed SOC strengthens the core managed-services position and raises switching costs. I support it if delivery capacity is proven first.",
        createdAt: "2026-06-08T15:10:10Z",
      },
      {
        id: "mock-m2",
        agentId: "mock-cfo",
        name: "Chief Financial Officer",
        personaRole: "CFO",
        content:
          "Margin compression is the risk: SOC tooling is a fixed cost against variable seat revenue. Support only with a per-seat uplift priced in.",
        createdAt: "2026-06-08T15:10:25Z",
      },
      {
        id: "mock-m3",
        agentId: "mock-ceo",
        name: "Chief Executive",
        personaRole: "CEO",
        content:
          "Final: support, contingent on the CFO's per-seat uplift and a 90-day delivery pilot.",
        createdAt: "2026-06-08T15:10:55Z",
      },
      {
        id: "mock-m4",
        agentId: "mock-cfo",
        name: "Chief Financial Officer",
        personaRole: "CFO",
        content: "Final: support with the uplift; revisit margins after one quarter.",
        createdAt: "2026-06-08T15:11:05Z",
      },
      {
        id: "mock-m5",
        agentId: null,
        name: null,
        personaRole: null,
        content:
          "The board recommends bundling the co-managed SOC offering with a per-seat price uplift, gated on a 90-day delivery pilot.",
        createdAt: "2026-06-08T15:11:25Z",
      },
    ],
    recommendation: {
      id: "mock-rec-1",
      reviewStatus: "pending_review",
      reviewedByName: null,
      reviewedAt: null,
      reviewRationale: null,
      recommendation:
        "The board recommends bundling the co-managed SOC offering with a per-seat price uplift, gated on a 90-day delivery pilot.",
      rationale: {
        stances: [
          { role: "CEO", stance: "Support, contingent on a delivery pilot." },
          { role: "CFO", stance: "Support with a per-seat uplift priced in." },
        ],
        agreements: ["Bundle the SOC offering", "Gate the rollout on proven delivery"],
        disagreements: ["How much margin risk the fixed SOC tooling cost carries"],
      },
      createdAt: "2026-06-08T15:11:28Z",
    },
  },
  "mock-session-2": {
    session: {
      id: "mock-session-2",
      topic: MOCK_SESSIONS[1].topic,
      status: "failed",
      packetMd: null,
      cisoPositionMd: null,
      openedBy: "Jordan Patel",
      createdAt: "2026-06-07T11:40:00Z",
      concludedAt: "2026-06-07T11:40:20Z",
      pausedAt: null,
    },
    members: MOCK_PERSONAS.slice(0, 2),
    messages: [
      {
        id: "mock-f1",
        agentId: null,
        name: null,
        personaRole: null,
        content:
          "The board could not deliberate: the AI model is unavailable (no provider configured or the provider errored). No positions were taken. Try again once the AI provider is reachable.",
        createdAt: "2026-06-07T11:40:15Z",
      },
    ],
    recommendation: null,
  },
};

// ── Tier 1: direct DB reads ─────────────────────────────────────────────────────

async function personasFromDb(): Promise<{ personas: BoardPersona[]; advisors: BoardPersona[] } | null> {
  const pool = getPool();
  if (!pool) return null;
  try {
    const [personas, advisors] = await Promise.all([
      pool.query<{ id: string; name: string; persona_role: string | null }>(
        // Mirrors the backend's picker query (backend ADR-0039 + 0059 seats):
        // active voting/deputy personas only — the hidden synthesis/composer rows
        // are excluded by persona_role/is_active, the advisor bench by seat_kind.
        `SELECT id, name, persona_role FROM agent
         WHERE module = 'board' AND is_active AND persona_role IS NOT NULL
           AND (seat_kind IS NULL OR seat_kind NOT IN ('advisor', 'facilitator'))
         ORDER BY created_at`,
      ),
      pool.query<{ id: string; name: string; persona_role: string | null }>(
        // Advisors are selected by seat_kind IGNORING is_active — invitation IS
        // the activation (0059's documented deviation); never flip is_active.
        `SELECT id, name, persona_role FROM agent
         WHERE module = 'board' AND seat_kind = 'advisor'
         ORDER BY created_at`,
      ),
    ]);
    const map = (r: { id: string; name: string; persona_role: string | null }) => ({
      id: r.id,
      name: r.name,
      personaRole: r.persona_role,
    });
    return { personas: personas.rows.map(map), advisors: advisors.rows.map(map) };
  } catch (err) {
    console.error("board personas DB read failed:", err);
    return null;
  }
}

/** Active board personas + the advisor bench through the DB → backend → mock tiers. */
export async function listBoardPersonas(): Promise<BoardPersonasState> {
  const fromDb = await personasFromDb();
  if (fromDb && fromDb.personas.length > 0) return { ...fromDb, source: "db" };
  try {
    const wire = await boardService.listAgents();
    if (wire.agents.length > 0) {
      const map = (a: { id: string; name: string; personaRole: string | null }) => ({
        id: a.id,
        name: a.name,
        personaRole: a.personaRole,
      });
      return {
        personas: wire.agents.map(map),
        advisors: (wire.advisors ?? []).map(map),
        source: "backend",
      };
    }
  } catch {
    // Backend unset/unreachable — fall through to mock.
  }
  return { personas: MOCK_PERSONAS, advisors: MOCK_ADVISORS, source: "mock" };
}

/** Recent board sessions, newest first. DB → mock; query failure → empty list. */
export async function listBoardSessions(limit = 20): Promise<BoardSessionRow[]> {
  const pool = getPool();
  if (!pool) return MOCK_SESSIONS;
  try {
    const { rows } = await pool.query<{
      id: string;
      topic: string;
      status: string;
      opened_by: string | null;
      created_at: string;
      concluded_at: string | null;
      has_recommendation: boolean;
    }>(
      `SELECT s.id, s.topic, s.status, u.display_name AS opened_by,
              s.created_at, s.concluded_at,
              (r.id IS NOT NULL) AS has_recommendation
       FROM board_session s
       LEFT JOIN app_user u ON u.id = s.opened_by
       LEFT JOIN board_recommendation r ON r.session_id = s.id
       ORDER BY s.created_at DESC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 100)],
    );
    return rows.map((r) => ({
      id: r.id,
      topic: r.topic,
      status: r.status,
      openedBy: r.opened_by,
      createdAt: new Date(r.created_at).toISOString(),
      concludedAt: r.concluded_at ? new Date(r.concluded_at).toISOString() : null,
      hasRecommendation: r.has_recommendation,
    }));
  } catch (err) {
    console.error("board sessions read failed:", err);
    return []; // never fail the page over the list
  }
}

async function detailFromDb(id: string): Promise<BoardSessionDetail | null> {
  const pool = getPool();
  if (!pool) return null;
  try {
    const sessions = await pool.query<{
      id: string;
      topic: string;
      status: string;
      packet_md: string | null;
      ciso_position_md: string | null;
      opened_by: string | null;
      created_at: string;
      concluded_at: string | null;
      paused_at: string | null;
    }>(
      `SELECT s.id, s.topic, s.status, s.packet_md, s.ciso_position_md,
              u.display_name AS opened_by, s.created_at, s.concluded_at, s.paused_at
       FROM board_session s
       LEFT JOIN app_user u ON u.id = s.opened_by
       WHERE s.id = $1::uuid`,
      [id],
    );
    const session = sessions.rows[0];
    if (!session) return null;

    const [members, messages, recommendations] = await Promise.all([
      pool.query<{ agent_id: string; name: string; persona_role: string | null; seat_kind: string | null }>(
        `SELECT m.agent_id, a.name, a.persona_role, a.seat_kind
         FROM board_session_member m JOIN agent a ON a.id = m.agent_id
         WHERE m.session_id = $1::uuid
         ORDER BY a.created_at`,
        [id],
      ),
      pool.query<{
        id: string;
        agent_id: string | null;
        name: string | null;
        persona_role: string | null;
        seat_kind: string | null;
        content: string;
        created_at: string;
      }>(
        `SELECT msg.id, msg.agent_id, a.name, a.persona_role, a.seat_kind, msg.content, msg.created_at
         FROM board_message msg LEFT JOIN agent a ON a.id = msg.agent_id
         WHERE msg.session_id = $1::uuid
         ORDER BY msg.created_at`,
        [id],
      ),
      pool.query<{
        id: string;
        recommendation: string;
        rationale: unknown;
        created_at: string;
        review_status: string;
        reviewed_by_name: string | null;
        reviewed_at: string | null;
        review_rationale: string | null;
      }>(
        `SELECT r.id, r.recommendation, r.rationale, r.created_at,
                r.review_status, u.display_name AS reviewed_by_name,
                r.reviewed_at, r.review_rationale
         FROM board_recommendation r
         LEFT JOIN app_user u ON u.id = r.reviewed_by
         WHERE r.session_id = $1::uuid`,
        [id],
      ),
    ]);

    const rec = recommendations.rows[0];
    return {
      session: {
        id: session.id,
        topic: session.topic,
        status: session.status,
        packetMd: session.packet_md,
        cisoPositionMd: session.ciso_position_md,
        openedBy: session.opened_by,
        createdAt: new Date(session.created_at).toISOString(),
        concludedAt: session.concluded_at ? new Date(session.concluded_at).toISOString() : null,
        pausedAt: session.paused_at ? new Date(session.paused_at).toISOString() : null,
      },
      members: members.rows.map((m) => ({
        id: m.agent_id,
        name: m.name,
        personaRole: m.persona_role,
        seatKind: m.seat_kind,
      })),
      messages: messages.rows.map((m) => ({
        id: m.id,
        agentId: m.agent_id,
        name: m.name,
        personaRole: m.persona_role,
        seatKind: m.seat_kind,
        content: m.content,
        createdAt: new Date(m.created_at).toISOString(),
      })),
      recommendation: rec
        ? {
            id: rec.id,
            recommendation: rec.recommendation,
            rationale: rec.rationale,
            createdAt: new Date(rec.created_at).toISOString(),
            reviewStatus: rec.review_status,
            reviewedByName: rec.reviewed_by_name,
            reviewedAt: rec.reviewed_at ? new Date(rec.reviewed_at).toISOString() : null,
            reviewRationale: rec.review_rationale,
          }
        : null,
    };
  } catch (err) {
    console.error("board session detail read failed:", err);
    return null;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One session's full detail through the DB → backend → mock tiers; null when the
 * id is unknown everywhere (the route 404s).
 */
export async function getBoardSessionDetail(id: string): Promise<BoardSessionDetail | null> {
  if (!UUID_RE.test(id)) return MOCK_DETAILS[id] ?? null;
  const fromDb = await detailFromDb(id);
  if (fromDb) return fromDb;
  try {
    const wire = await boardService.getSession(id);
    return {
      // The wire's openedBy is the convener's app_user UUID; without a DB we
      // can't resolve a display name, so the header shows "—" instead of a raw id.
      session: { ...wire.session, openedBy: null, pausedAt: wire.session.pausedAt ?? null },
      members: wire.members.map((m) => ({
        id: m.agentId,
        name: m.name,
        personaRole: m.personaRole,
      })),
      messages: wire.messages,
      recommendation: wire.recommendation
        ? {
            id: wire.recommendation.id,
            recommendation: wire.recommendation.recommendation,
            rationale: wire.recommendation.rationale,
            createdAt: wire.recommendation.createdAt,
            reviewStatus: wire.recommendation.reviewStatus,
            // The wire carries the reviewer's app_user UUID; without a DB we
            // can't resolve a display name (same as openedBy above).
            reviewedByName: null,
            reviewedAt: wire.recommendation.reviewedAt,
            reviewRationale: wire.recommendation.reviewRationale,
          }
        : null,
    };
  } catch {
    return null; // backend unset/unreachable or 404 → route notFound()
  }
}
