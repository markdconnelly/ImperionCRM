"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { OrgGraph, OrgNode, OrgLiveState, OrgNodeLive } from "@/lib/org/types";

// ── theme tokens (mirror src/components/reporting/report-charts.tsx) ──────────
const BORDER = "#1E2636";
const PANEL = "#151B28";
const TEXT = "#E6EAF2";
const MUTED = "#8A93A6";
const ACCENT = "#5B8DEF";
const KIND_COLOR: Record<OrgNode["kind"], string> = {
  orchestrator: "#A78BFA",
  executive: "#5B8DEF",
  domain: "#34D399",
};

// ── layout geometry ───────────────────────────────────────────────────────────
// The tree is wide (21 domain agents). A single flat row of children forced a
// ~4400px canvas that fitView shrank to an unreadable ~0.3 zoom (the "constant
// zooming" complaint, #1837). We fix it two ways: (1) each executive's domains pack
// into a compact grid *block* beneath it (grid-wrap, not one flat row), and (2) those
// five division blocks are arranged in a balanced 2-wide meta-grid rather than five
// abreast — so the canvas is roughly square (~1000×950) instead of a 4400px ribbon,
// and fitView lands near 1.0 on a 1440px laptop, where card titles read without
// zooming in. Cards are compact variants of the same look; collapsing a division
// re-packs the rest as a per-division density lever.
const DOMAIN_W = 150; // compact domain card width
const EXEC_W = 168; // executive / orchestrator card width
const COL_GAP = 14; // gap between domain columns within a block
const ROW_GAP = 12; // gap between domain rows within a block
const DIVISION_GAP_X = 44; // horizontal gap between division units in the meta-grid
const DIVISION_GAP_Y = 40; // vertical gap between meta-grid rows
const DOMAIN_CARD_H = 66; // approx compact card height (for block-height math)
const EXEC_BAND_H = 96; // exec card + gap down to its domain grid
const RANK_ORCH_Y = 0; // orchestrator sits above the division meta-grid
const META_TOP_Y = 132; // top of the division meta-grid (below the orchestrator)
const META_COLS = 3; // division units per meta-grid row (keeps the canvas ~square)

/** Columns for an executive's domain grid — capped at 2 wide so blocks stay narrow
 *  (tall over wide), which packs the five divisions into a near-square canvas that
 *  fitView lands at a readable zoom on a 1440px laptop. */
function gridCols(n: number): number {
  if (n <= 1) return 1;
  return Math.min(2, Math.ceil(Math.sqrt(n)));
}

/** Full pixel size of one division unit (executive card + its domain grid). */
function divisionSize(childCount: number): { w: number; h: number } {
  const cols = Math.max(1, gridCols(childCount));
  const rows = Math.max(1, Math.ceil(childCount / cols));
  const gridW = cols * DOMAIN_W + (cols - 1) * COL_GAP;
  const w = Math.max(EXEC_W, gridW);
  const h =
    EXEC_BAND_H + (childCount > 0 ? rows * DOMAIN_CARD_H + (rows - 1) * ROW_GAP : 0);
  return { w, h };
}

type CardData = {
  node: OrgNode;
  live: OrgNodeLive | null;
  compact: boolean;
  collapsible: boolean;
  collapsed: boolean;
  memberCount: number;
  onToggle: (id: string) => void;
};

/** Best-effort live lookup: by node id, else by lowercased persona. */
function liveFor(live: OrgLiveState, node: OrgNode): OrgNodeLive | null {
  return (
    live.byKey[node.id] ??
    (node.persona ? live.byKey[node.persona.toLowerCase()] : undefined) ??
    null
  );
}

function OrgNodeCard({ data, selected }: NodeProps) {
  const { node, live, compact, collapsible, collapsed, memberCount, onToggle } =
    data as unknown as CardData;
  const color = KIND_COLOR[node.kind];
  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${selected ? ACCENT : BORDER}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: compact ? "5px 8px" : "7px 10px",
        width: compact ? DOMAIN_W : EXEC_W,
        color: TEXT,
        fontSize: compact ? 11 : 12,
        boxShadow: selected ? `0 0 0 1px ${ACCENT}` : "none",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
        <span
          style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {node.persona ?? node.id}
        </span>
        <span style={{ color: MUTED, fontSize: compact ? 9 : 10, flexShrink: 0 }}>
          {node.ceiling ?? ""}
        </span>
      </div>
      <div
        style={{
          color: MUTED,
          fontSize: compact ? 9 : 10,
          marginTop: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {node.title ?? (node.kind === "domain" ? node.id : (node.division ?? node.kind))}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: compact ? 4 : 6, flexWrap: "wrap" }}>
        {!node.built && <Tag label="scaffold" tone={MUTED} />}
        {live?.rung && <Tag label={live.rung} tone={ACCENT} />}
        {live?.level != null && <Tag label={`d${live.level}`} tone={ACCENT} />}
        {live?.gated && <Tag label="gated" tone="#F59E0B" />}
        {live && live.pending > 0 && <Tag label={`${live.pending}`} tone="#F87171" />}
      </div>
      {collapsible && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
          style={{
            marginTop: 6,
            width: "100%",
            background: "transparent",
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            color: MUTED,
            fontSize: 10,
            padding: "2px 0",
            cursor: "pointer",
          }}
        >
          {collapsed ? `▸ ${memberCount} agents` : "▾ collapse"}
        </button>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function Tag({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      style={{
        fontSize: 9,
        color: tone,
        border: `1px solid ${tone}40`,
        background: `${tone}14`,
        borderRadius: 4,
        padding: "1px 4px",
        lineHeight: 1.3,
      }}
    >
      {label}
    </span>
  );
}

const nodeTypes = { orgNode: OrgNodeCard };

export function OrgTreeViz({ graph, live }: { graph: OrgGraph; live: OrgLiveState }) {
  // Executives start expanded; collapse hides that executive's member domains and
  // re-packs the canvas (a per-division lever for maximum readability).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string>(graph.orchestrator);

  const onToggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);

  // Lay out the VISIBLE nodes. Each executive owns a grid *block* of its domains
  // (grid-wrap); the five division units are then placed in a balanced 2-wide meta-grid
  // (column x-positions fixed to the widest unit per column, rows y-positioned by the
  // tallest unit per row), keeping the canvas roughly square. The orchestrator is
  // centered above the meta-grid.
  const { rfNodes, rfEdges } = useMemo(() => {
    const execs = graph.nodes.filter((n) => n.kind === "executive");
    const domainsByExec = new Map<string, OrgNode[]>();
    for (const n of graph.nodes.filter((n) => n.kind === "domain")) {
      const key = n.reportsTo ?? "";
      if (!domainsByExec.has(key)) domainsByExec.set(key, []);
      domainsByExec.get(key)!.push(n);
    }

    const pos = new Map<string, { x: number; y: number }>();

    // Per-unit child list (empty when collapsed) and measured size.
    const units = execs.map((exec) => {
      const kids = collapsed.has(exec.id) ? [] : (domainsByExec.get(exec.id) ?? []);
      return { exec, kids, size: divisionSize(kids.length) };
    });

    // Meta-grid column widths (widest unit in each column) and row heights (tallest
    // unit in each row), so units align into clean columns/rows.
    const colWidths: number[] = [];
    const rowHeights: number[] = [];
    units.forEach((u, i) => {
      const c = i % META_COLS;
      const r = Math.floor(i / META_COLS);
      colWidths[c] = Math.max(colWidths[c] ?? 0, u.size.w);
      rowHeights[r] = Math.max(rowHeights[r] ?? 0, u.size.h);
    });
    const colX: number[] = [];
    let ax = 0;
    colWidths.forEach((w, c) => {
      colX[c] = ax;
      ax += w + DIVISION_GAP_X;
    });
    const rowY: number[] = [];
    let ay = META_TOP_Y;
    rowHeights.forEach((h, r) => {
      rowY[r] = ay;
      ay += h + DIVISION_GAP_Y;
    });

    units.forEach((u, i) => {
      const c = i % META_COLS;
      const r = Math.floor(i / META_COLS);
      // Center the unit within its (possibly wider) meta-column.
      const unitLeft = colX[c] + (colWidths[c] - u.size.w) / 2;
      const unitTop = rowY[r];
      // Executive centered over its own block.
      pos.set(u.exec.id, { x: unitLeft + (u.size.w - EXEC_W) / 2, y: unitTop });
      if (u.kids.length > 0) {
        const cols = gridCols(u.kids.length);
        const gridW = cols * DOMAIN_W + (cols - 1) * COL_GAP;
        const gridLeft = unitLeft + (u.size.w - gridW) / 2;
        const gridTop = unitTop + EXEC_BAND_H;
        u.kids.forEach((d, k) => {
          const col = k % cols;
          const row = Math.floor(k / cols);
          pos.set(d.id, {
            x: gridLeft + col * (DOMAIN_W + COL_GAP),
            y: gridTop + row * (DOMAIN_CARD_H + ROW_GAP),
          });
        });
      }
    });

    // Orchestrator centered horizontally over the whole meta-grid.
    const totalW = ax > 0 ? ax - DIVISION_GAP_X : EXEC_W;
    pos.set(graph.orchestrator, { x: (totalW - EXEC_W) / 2, y: RANK_ORCH_Y });

    const visible = new Set(pos.keys());
    const rfNodes: Node[] = graph.nodes
      .filter((n) => visible.has(n.id))
      .map((n) => {
        const memberCount = n.kind === "executive" ? (domainsByExec.get(n.id)?.length ?? 0) : 0;
        const data: CardData = {
          node: n,
          live: liveFor(live, n),
          compact: n.kind === "domain",
          collapsible: memberCount > 0,
          collapsed: collapsed.has(n.id),
          memberCount,
          onToggle,
        };
        return {
          id: n.id,
          type: "orgNode",
          position: pos.get(n.id)!,
          data: data as unknown as Record<string, unknown>,
          selected: n.id === selectedId,
        };
      });

    const rfEdges: Edge[] = graph.edges
      .filter((e) => visible.has(e.from) && visible.has(e.to))
      .map((e) => ({
        id: `${e.from}->${e.to}`,
        source: e.from,
        target: e.to,
        type: "smoothstep",
        style: { stroke: BORDER },
      }));

    return { rfNodes, rfEdges };
  }, [graph, live, collapsed, selectedId, onToggle]);

  const selected = byId.get(selectedId) ?? null;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 160px)", minHeight: 520, gap: 12 }}>
      <div style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, n) => setSelectedId(n.id)}
          fitView
          fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.35}
          maxZoom={1.75}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
        >
          <Background color={BORDER} gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => KIND_COLOR[(byId.get(n.id)?.kind ?? "domain") as OrgNode["kind"]]}
            style={{ background: PANEL }}
          />
        </ReactFlow>
      </div>
      <OrgSidePanel node={selected} live={selected ? liveFor(live, selected) : null} />
    </div>
  );
}

function OrgSidePanel({ node, live }: { node: OrgNode | null; live: OrgNodeLive | null }) {
  return (
    <aside
      style={{
        width: 320,
        flexShrink: 0,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        background: PANEL,
        color: TEXT,
        padding: 16,
        overflowY: "auto",
        fontSize: 13,
      }}
    >
      {!node ? (
        <p style={{ color: MUTED }}>Select a node to inspect it.</p>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{node.persona ?? node.id}</h2>
            <span style={{ color: MUTED, fontSize: 11 }}>{node.kind}</span>
          </div>
          <p style={{ color: MUTED, margin: "2px 0 12px" }}>
            {node.id}
            {node.division ? ` · ${node.division}` : ""}
          </p>

          <Field label="Ceiling" value={node.ceiling ?? "—"} />
          {node.serves && <Field label="Serves" value={node.serves} />}
          {node.reportsTo && <Field label="Reports to" value={node.reportsTo} />}
          <Field label="Status" value={node.built ? "built" : "scaffold"} />

          <SectionTitle>Live state</SectionTitle>
          {live ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {live.rung && <Tag label={`rung ${live.rung}`} tone={ACCENT} />}
              {live.level != null && <Tag label={`dial ${live.level}/5`} tone={ACCENT} />}
              {live.gated && <Tag label="mark-gated" tone="#F59E0B" />}
              <Tag label={`${live.pending} pending`} tone={live.pending ? "#F87171" : MUTED} />
            </div>
          ) : (
            <p style={{ color: MUTED, margin: 0 }}>No live data (propose-only / dormant).</p>
          )}

          {node.tools.length > 0 && (
            <>
              <SectionTitle>Tool budget</SectionTitle>
              <ChipList items={node.tools} />
            </>
          )}
          {node.okfRooms.length > 0 && (
            <>
              <SectionTitle>OKF rooms</SectionTitle>
              <ChipList items={node.okfRooms} />
            </>
          )}

          <SectionTitle>
            Playbooks {node.workflows.length > 0 ? `(${node.workflows.length})` : ""}
          </SectionTitle>
          {node.workflows.length === 0 ? (
            <p style={{ color: MUTED, margin: 0 }}>No workflows authored yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {node.workflows.map((wf) => (
                <li key={wf.slug} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{wf.slug}</div>
                  <ol style={{ margin: "2px 0 0", paddingLeft: 16, color: MUTED, fontSize: 12 }}>
                    {wf.stages.map((s) => (
                      <li key={s}>{s.replace(/^\d+-/, "")}</li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={`/org/${node.id}`}
            style={{
              display: "inline-block",
              marginTop: 14,
              fontSize: 12,
              color: ACCENT,
              textDecoration: "none",
            }}
          >
            View full procedures &amp; steps →
          </Link>
        </>
      )}
    </aside>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ color: MUTED }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: MUTED,
        margin: "16px 0 6px",
      }}
    >
      {children}
    </h3>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {items.map((it) => (
        <span
          key={it}
          style={{
            fontSize: 11,
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            padding: "1px 5px",
            color: TEXT,
          }}
        >
          {it}
        </span>
      ))}
    </div>
  );
}
