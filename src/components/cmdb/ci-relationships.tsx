"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { CI_TYPE_LABEL, CI_TYPE_ICON, ciKey } from "@/lib/cmdb/ci";
import {
  CI_RELATION_TYPES,
  neighbourEdges,
  buildNeighbourhoodGraph,
  type CiNeighbourEdge,
} from "@/lib/cmdb/relationship";
import {
  createCiRelationshipAction,
  updateCiRelationshipAction,
  deleteCiRelationshipAction,
  deriveCiRelationshipsAction,
} from "@/app/(app)/cmdb/actions";
import type { CiRelationship, CiType, ConfigurationItem } from "@/types";

/**
 * CI-detail relationship surface (#647) — a "Relationships" panel listing every related
 * CI in BOTH directions plus a neighbourhood dependency-graph view. Manual edges are
 * authored/edited/removed inline (gated by `cmdb:write`, enforced server-side); derived
 * edges are read-only (recomputed by the derivation, which the "Re-derive" button runs).
 *
 * `canWrite` toggles the authoring affordances (the server re-asserts the gate anyway).
 * The full CI list is passed so neighbour CIs resolve to display names + drill links
 * without another round-trip (CIs are a small union read-model).
 */
export function CiRelationships({
  ci,
  edges,
  allItems,
  canWrite,
}: {
  ci: ConfigurationItem;
  edges: CiRelationship[];
  allItems: ConfigurationItem[];
  canWrite: boolean;
}) {
  const centre = useMemo(
    () => ({ ciType: ci.ciType, ciId: ci.ciId }),
    [ci.ciType, ci.ciId],
  );
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // CI lookup by cross-union key → display name (and existence) for neighbour resolution.
  const byKey = useMemo(() => {
    const m = new Map<string, ConfigurationItem>();
    for (const c of allItems) m.set(ciKey(c), c);
    return m;
  }, [allItems]);

  const neighbours = useMemo(() => neighbourEdges(centre, edges), [centre, edges]);
  const graph = useMemo(() => buildNeighbourhoodGraph(centre, edges), [centre, edges]);

  const nameFor = (t: CiType, id: string): string =>
    byKey.get(`${t}:${id}`)?.displayName ?? `${CI_TYPE_LABEL[t]} ${id.slice(0, 8)}`;

  // Candidate "other end" CIs for a new manual edge — every CI except this one.
  const candidates = useMemo(
    () => allItems.filter((c) => !(c.ciType === ci.ciType && c.ciId === ci.ciId)),
    [allItems, ci.ciType, ci.ciId],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* ── Relationships panel ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-panel p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="Share2" size={15} className="text-dim" />
            <h2 className="text-sm font-medium text-text">Relationships</h2>
            <span className="text-xs text-dim">
              {neighbours.length} related CI{neighbours.length === 1 ? "" : "s"}
            </span>
          </div>
          {canWrite && (
            <div className="flex items-center gap-2">
              <form action={deriveCiRelationshipsAction}>
                <input type="hidden" name="ciType" value={ci.ciType} />
                <input type="hidden" name="ciId" value={ci.ciId} />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-2.5 py-1 text-xs text-dim transition-colors hover:text-text"
                  title="Recompute derived edges from silver foreign keys (manual edges are kept)"
                >
                  <Icon name="RefreshCw" size={12} /> Re-derive
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setAdding((v) => !v);
                  setEditingId(null);
                }}
                className="flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs text-accent transition-colors hover:bg-accent/20"
              >
                <Icon name={adding ? "X" : "Plus"} size={12} />
                {adding ? "Cancel" : "Add edge"}
              </button>
            </div>
          )}
        </div>

        {/* Add-edge form (manual edge from THIS CI → a chosen CI). */}
        {canWrite && adding && (
          <form
            action={createCiRelationshipAction}
            className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-border bg-panel-2 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
          >
            <input type="hidden" name="fromCiType" value={ci.ciType} />
            <input type="hidden" name="fromCiId" value={ci.ciId} />
            <select
              name="relationType"
              defaultValue="belongs-to"
              className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
            >
              {CI_RELATION_TYPES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              name="toCiId"
              required
              defaultValue=""
              onChange={(e) => {
                const opt = e.target.selectedOptions[0];
                const t = opt?.dataset.ciType;
                const hidden = e.currentTarget.form?.elements.namedItem(
                  "toCiType",
                ) as HTMLInputElement | null;
                if (hidden && t) hidden.value = t;
              }}
              className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
            >
              <option value="" disabled>
                Select related CI…
              </option>
              {candidates.map((c) => (
                <option key={ciKey(c)} value={c.ciId} data-ci-type={c.ciType}>
                  {CI_TYPE_LABEL[c.ciType]} · {c.displayName}
                </option>
              ))}
            </select>
            <input type="hidden" name="toCiType" value="" />
            <input
              type="text"
              name="note"
              placeholder="Note (optional)"
              className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent sm:col-span-2"
            />
            <button
              type="submit"
              className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
            >
              Add relationship
            </button>
          </form>
        )}

        {neighbours.length === 0 ? (
          <p className="py-6 text-center text-sm text-dim">
            No relationships yet.
            {canWrite ? " Add a manual edge or re-derive from silver." : ""}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/50">
            {neighbours.map((n) => (
              <NeighbourRow
                key={n.id}
                ci={ci}
                edge={n}
                neighbourName={nameFor(n.neighbour.ciType, n.neighbour.ciId)}
                canWrite={canWrite}
                editing={editingId === n.id}
                onEdit={() => {
                  setEditingId((id) => (id === n.id ? null : n.id));
                  setAdding(false);
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {/* ── Dependency-graph view ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-panel p-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="Network" size={15} className="text-dim" />
          <h2 className="text-sm font-medium text-text">Dependency graph</h2>
          <span className="text-xs text-dim">neighbourhood</span>
        </div>
        <NeighbourhoodGraph graph={graph} nameFor={nameFor} centreKey={ciKey(centre)} />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-dim">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-sm bg-accent" /> manual edge
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-sm bg-dim/50" /> derived edge
          </span>
        </div>
      </div>
    </div>
  );
}

/** One row in the Relationships panel — the neighbour CI, the oriented relation, source
 *  badge, and (manual only, when `canWrite`) inline edit + remove. */
function NeighbourRow({
  ci,
  edge,
  neighbourName,
  canWrite,
  editing,
  onEdit,
}: {
  ci: ConfigurationItem;
  edge: CiNeighbourEdge;
  neighbourName: string;
  canWrite: boolean;
  editing: boolean;
  onEdit: () => void;
}) {
  const { neighbour } = edge;
  const arrow = edge.direction === "outgoing" ? "→" : "←";
  const canEditThis = canWrite && edge.source === "manual";

  return (
    <li className="flex flex-col gap-2 py-2.5">
      <div className="flex items-center gap-2">
        <Icon
          name={CI_TYPE_ICON[neighbour.ciType]}
          size={14}
          className="shrink-0 text-dim"
        />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-xs text-dim">{edge.relationType}</span>
          <span className="text-dim">{arrow}</span>
          <Link
            href={`/cmdb/${neighbour.ciType}/${neighbour.ciId}`}
            className="truncate text-sm font-medium text-text hover:text-accent"
          >
            {neighbourName}
          </Link>
          <span className="text-[11px] text-dim">
            ({CI_TYPE_LABEL[neighbour.ciType]})
          </span>
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
            edge.source === "manual"
              ? "bg-accent/15 text-accent"
              : "bg-panel-2 text-dim"
          }`}
        >
          {edge.source}
        </span>
        {canEditThis && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded p-1 text-dim transition-colors hover:text-text"
              title="Edit relationship"
            >
              <Icon name="Pencil" size={13} />
            </button>
            <form action={deleteCiRelationshipAction}>
              <input type="hidden" name="id" value={edge.id} />
              <input type="hidden" name="ciType" value={ci.ciType} />
              <input type="hidden" name="ciId" value={ci.ciId} />
              <button
                type="submit"
                className="rounded p-1 text-dim transition-colors hover:text-red"
                title="Remove relationship"
              >
                <Icon name="Trash2" size={13} />
              </button>
            </form>
          </div>
        )}
      </div>

      {edge.note && !editing && (
        <p className="pl-6 text-[11px] text-dim">{edge.note}</p>
      )}

      {canEditThis && editing && (
        <form
          action={updateCiRelationshipAction}
          className="ml-6 grid grid-cols-1 gap-2 rounded-lg border border-border bg-panel-2 p-2.5 sm:grid-cols-[auto_1fr_auto] sm:items-center"
        >
          <input type="hidden" name="id" value={edge.id} />
          <input type="hidden" name="ciType" value={ci.ciType} />
          <input type="hidden" name="ciId" value={ci.ciId} />
          <select
            name="relationType"
            defaultValue={edge.relationType}
            className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
          >
            {[...new Set([edge.relationType, ...CI_RELATION_TYPES])].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="note"
            defaultValue={edge.note ?? ""}
            placeholder="Note (optional)"
            className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
          >
            Save
          </button>
        </form>
      )}
    </li>
  );
}

/**
 * A compact SVG dependency-graph of the CI neighbourhood: the centre CI in the middle,
 * its direct neighbours radially around it, edges drawn from → to (manual = accent,
 * derived = dim) with the relation type labelled. Purely presentational — no layout
 * engine; neighbours are placed evenly on a circle.
 */
function NeighbourhoodGraph({
  graph,
  nameFor,
  centreKey,
}: {
  graph: ReturnType<typeof buildNeighbourhoodGraph>;
  nameFor: (t: CiType, id: string) => string;
  centreKey: string;
}) {
  const W = 640;
  const H = 320;
  const cx = W / 2;
  const cy = H / 2;
  const radius = 120;

  const others = graph.nodes.filter((n) => !n.isCentre);
  // Position every node: centre in the middle, others evenly on a ring.
  const pos = new Map<string, { x: number; y: number }>();
  pos.set(centreKey, { x: cx, y: cy });
  others.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(others.length, 1) - Math.PI / 2;
    pos.set(n.key, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });

  if (others.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-dim">
        No neighbours to graph yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-panel-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="CI dependency graph"
      >
        <defs>
          <marker
            id="ci-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-dim, #8A93A6)" />
          </marker>
        </defs>

        {/* Edges (drawn first so nodes sit on top). */}
        {graph.edges.map((e) => {
          const a = pos.get(e.fromKey);
          const b = pos.get(e.toKey);
          if (!a || !b) return null;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const stroke =
            e.source === "manual" ? "var(--color-accent, #5B8DEF)" : "var(--color-dim, #8A93A6)";
          return (
            <g key={e.id}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={stroke}
                strokeWidth={e.source === "manual" ? 1.75 : 1}
                strokeOpacity={e.source === "manual" ? 0.9 : 0.5}
                markerEnd="url(#ci-arrow)"
              />
              <text
                x={mx}
                y={my - 3}
                textAnchor="middle"
                className="fill-dim"
                fontSize={9}
              >
                {e.relationType}
              </text>
            </g>
          );
        })}

        {/* Nodes. */}
        {graph.nodes.map((n) => {
          const p = pos.get(n.key);
          if (!p) return null;
          return (
            <g key={n.key}>
              <circle
                cx={p.x}
                cy={p.y}
                r={n.isCentre ? 9 : 6}
                fill={
                  n.isCentre ? "var(--color-accent, #5B8DEF)" : "var(--color-panel, #111621)"
                }
                stroke="var(--color-border, #1E2636)"
                strokeWidth={1.5}
              />
              <text
                x={p.x}
                y={p.y + (p.y > cy ? 20 : -12)}
                textAnchor="middle"
                className={n.isCentre ? "fill-text" : "fill-dim"}
                fontSize={10}
                fontWeight={n.isCentre ? 600 : 400}
              >
                {nameFor(n.ciType, n.ciId).slice(0, 22)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
