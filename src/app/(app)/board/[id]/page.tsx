import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { getBoardSessionDetail } from "@/lib/board/data";
import {
  formatDateTime,
  groupTranscript,
  parseRationale,
  sessionStatusMeta,
  type BoardTranscriptMessage,
} from "@/lib/board/session";

export const dynamic = "force-dynamic";

const ROUND_TITLES = ["Round 1 — opening positions", "Round 2 — cross-examination"];

function roundTitle(index: number): string {
  return ROUND_TITLES[index] ?? `Round ${index + 1}`;
}

/** One persona turn in the transcript. */
function PersonaMessage({ m }: { m: BoardTranscriptMessage }) {
  return (
    <div className="rounded-lg border border-border bg-panel-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {m.personaRole && (
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-accent">
            {m.personaRole}
          </span>
        )}
        <span className="text-sm font-medium text-text">{m.name ?? "Director"}</span>
        <span className="ml-auto text-[11px] text-dim" title={m.createdAt}>
          {formatDateTime(m.createdAt)}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dim">{m.content}</p>
    </div>
  );
}

/** The synthesis/orchestrator voice — visually distinct from persona turns. */
function SynthesisMessage({ m }: { m: BoardTranscriptMessage }) {
  return (
    <div className="rounded-lg border border-accent/40 bg-panel-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 rounded border border-accent/40 px-1.5 py-0.5 text-[10px] text-accent">
          <Icon name="Sparkles" size={10} />
          synthesis voice
        </span>
        <span className="ml-auto text-[11px] text-dim" title={m.createdAt}>
          {formatDateTime(m.createdAt)}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text">{m.content}</p>
    </div>
  );
}

/** Drill-down into one board session: members, transcript by round, recommendation. */
export default async function BoardSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getBoardSessionDetail(id);
  if (!detail) notFound();

  const { session, members, messages, recommendation } = detail;
  const meta = sessionStatusMeta(session.status);
  const { rounds, synthesis } = groupTranscript(messages);
  const rationale = recommendation ? parseRationale(recommendation.rationale) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold tracking-tight">{session.topic}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-dim">
            <span className={`rounded border border-border px-1.5 py-0.5 text-[10px] ${meta.tone}`}>
              {meta.label}
            </span>
            <span>Convened by {session.openedBy ?? "—"}</span>
            <span>· {formatDateTime(session.createdAt)}</span>
            {session.concludedAt && <span>· concluded {formatDateTime(session.concludedAt)}</span>}
          </p>
        </div>
        <Link
          href="/board"
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
        >
          ← All sessions
        </Link>
      </div>

      {/* Members */}
      <section className="rounded-xl border border-border bg-panel p-4">
        <h3 className="mb-2 font-display text-sm font-semibold tracking-tight">Sitting this session</h3>
        <div className="flex flex-wrap gap-2">
          {members.length === 0 ? (
            <p className="text-sm text-dim">No members recorded for this session.</p>
          ) : (
            members.map((m) => (
              <span
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-panel-2 px-3 py-1.5"
              >
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-accent">
                  {m.personaRole ?? "—"}
                </span>
                <span className="text-sm text-text">{m.name}</span>
              </span>
            ))
          )}
        </div>
      </section>

      {/* Recommendation */}
      {recommendation && rationale && (
        <section className="rounded-xl border border-accent/40 bg-panel p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
              <Icon name="Gavel" size={14} className="text-accent" />
              Board recommendation
            </h3>
            <span className="text-[11px] text-dim">{formatDateTime(recommendation.createdAt)}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
            {recommendation.recommendation}
          </p>
          {rationale.parseError && (
            <p className="mt-2 text-[11px] text-amber">
              The synthesis output didn&apos;t fully parse — the stances below were derived from
              the directors&apos; final positions.
            </p>
          )}

          {(rationale.stances.length > 0 ||
            rationale.agreements.length > 0 ||
            rationale.disagreements.length > 0) && (
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
              {rationale.stances.length > 0 && (
                <div className="rounded-lg border border-border bg-panel-2 p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-wide text-dim">Stances</div>
                  <ul className="flex flex-col gap-2">
                    {rationale.stances.map((s, i) => (
                      <li key={`${s.role}-${i}`} className="text-xs leading-relaxed text-dim">
                        <span className="mr-1.5 rounded border border-border px-1 py-0.5 text-[10px] text-accent">
                          {s.role}
                        </span>
                        {s.stance}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {rationale.agreements.length > 0 && (
                <div className="rounded-lg border border-border bg-panel-2 p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-wide text-green">
                    Points of agreement
                  </div>
                  <ul className="list-inside list-disc text-xs leading-relaxed text-dim">
                    {rationale.agreements.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {rationale.disagreements.length > 0 && (
                <div className="rounded-lg border border-border bg-panel-2 p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-wide text-amber">
                    Points of disagreement
                  </div>
                  <ul className="list-inside list-disc text-xs leading-relaxed text-dim">
                    {rationale.disagreements.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Transcript */}
      <section className="rounded-xl border border-border bg-panel p-5">
        <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">Deliberation transcript</h3>
        {messages.length === 0 ? (
          <p className="text-sm text-dim">No deliberation messages were recorded.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {rounds.map((round, i) => (
              <div key={i}>
                <div className="mb-2 text-[11px] uppercase tracking-wide text-dim">{roundTitle(i)}</div>
                <div className="flex flex-col gap-2">
                  {round.map((m) => (
                    <PersonaMessage key={m.id} m={m} />
                  ))}
                </div>
              </div>
            ))}
            {synthesis.length > 0 && (
              <div>
                <div className="mb-2 text-[11px] uppercase tracking-wide text-dim">Synthesis</div>
                <div className="flex flex-col gap-2">
                  {synthesis.map((m) => (
                    <SynthesisMessage key={m.id} m={m} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
