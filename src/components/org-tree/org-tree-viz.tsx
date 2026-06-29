"use client";

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

const H_GAP = 210;
const V_GAP = 150;

type CardData = {
  node: OrgNode;
  live: OrgNodeLive | null;
  collapsible: boolean;
  collapsed: boolean;
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
  const { node, live, collapsible, collapsed, onToggle } = data as unknown as CardData;
  const color = KIND_COLOR[node.kind];
  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${selected ? ACCENT : BORDER}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: "8px 10px",
        width: 178,
        color: TEXT,
        fontSize: 12,
        boxShadow: selected ? `0 0 0 1px ${ACCENT}` : "none",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontWeight: 600 }}>{node.persona ?? node.id}</span>
        <span style={{ color: MUTED, fontSize: 10 }}>{node.ceiling ?? ""}</span>
      </div>
      <div style={{ color: MUTED, fontSize: 10, marginTop: 2 }}>
        {node.kind === "domain" ? node.id : (node.division ?? node.kind)}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        {!node.built && <Tag label="scaffold" tone={MUTED} />}
        {live?.rung && <Tag label={`rung ${live.rung}`} tone={ACCENT} />}
        {live?.level != null && <Tag label={`dial ${live.level}`} tone={ACCENT} />}
        {live?.gated && <Tag label="gated" tone="#F59E0B" />}
        {live && live.pending > 0 && <Tag label={`${live.pending} pending`} tone="#F87171" />}
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
          {collapsed ? "▸ expand division" : "▾ collapse division"}
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
      }}
    >
      {label}
    </span>
  );
}

const nodeTypes = { orgNode: OrgNodeCard };

export function OrgTreeViz({ graph, live }: { graph: OrgGraph; live: OrgLiveState }) {
  // Executives start expanded; collapse hides that executive's member domains.
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

  // Lay out a tidy top-down tree over the VISIBLE nodes (a domain is hidden when its
  // executive is collapsed). x is breadth (leaf-packed, parents centered over children),
  // y is depth.
  const { rfNodes, rfEdges } = useMemo(() => {
    const execs = graph.nodes.filter((n) => n.kind === "executive");
    const domainsByExec = new Map<string, OrgNode[]>();
    for (const n of graph.nodes.filter((n) => n.kind === "domain")) {
      const key = n.reportsTo ?? "";
      if (!domainsByExec.has(key)) domainsByExec.set(key, []);
      domainsByExec.get(key)!.push(n);
    }

    const pos = new Map<string, { x: number; y: number }>();
    let leaf = 0;
    for (const exec of execs) {
      const kids = collapsed.has(exec.id) ? [] : (domainsByExec.get(exec.id) ?? []);
      if (kids.length === 0) {
        pos.set(exec.id, { x: leaf * H_GAP, y: V_GAP });
        leaf += 1;
      } else {
        const start = leaf;
        for (const d of kids) {
          pos.set(d.id, { x: leaf * H_GAP, y: 2 * V_GAP });
          leaf += 1;
        }
        const cx = ((start + (leaf - 1)) / 2) * H_GAP;
        pos.set(exec.id, { x: cx, y: V_GAP });
      }
    }
    // Orchestrator centered over the executives.
    const execXs = execs.map((e) => pos.get(e.id)!.x);
    const ocx = execXs.length ? (Math.min(...execXs) + Math.max(...execXs)) / 2 : 0;
    pos.set(graph.orchestrator, { x: ocx, y: 0 });

    const visible = new Set(pos.keys());
    const rfNodes: Node[] = graph.nodes
      .filter((n) => visible.has(n.id))
      .map((n) => {
        const memberCount = n.kind === "executive" ? (domainsByExec.get(n.id)?.length ?? 0) : 0;
        const data: CardData = {
          node: n,
          live: liveFor(live, n),
          collapsible: memberCount > 0,
          collapsed: collapsed.has(n.id),
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
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
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
