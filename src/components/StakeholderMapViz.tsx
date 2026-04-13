import React, { useMemo, useState, useCallback } from 'react';
import type { StakeholderGraph, StakeholderNode, StakeholderEdge } from '../lib/types';

/* ── constants ────────────────────────────────────────────── */

const NODE_COLORS: Record<StakeholderNode['type'], string> = {
  bill: '#000000',
  sponsor: '#3B82F6',
  donor: '#F59E0B',
  chair: '#8B5CF6',
  lobbyist: '#EF4444',
};

const NODE_RADIUS: Record<StakeholderNode['type'], number> = {
  bill: 24,
  sponsor: 16,
  donor: 12,
  chair: 14,
  lobbyist: 12,
};

const RING_ORDER: StakeholderNode['type'][] = ['bill', 'sponsor', 'donor', 'chair', 'lobbyist'];

const MAX_NODES = 50;
const VIEW_SIZE = 600;
const CENTER = VIEW_SIZE / 2;

/* ── layout ───────────────────────────────────────────────── */

interface LayoutNode {
  id: string;
  type: StakeholderNode['type'];
  label: string;
  x: number;
  y: number;
  r: number;
  color: string;
}

interface LayoutEdge {
  source: LayoutNode;
  target: LayoutNode;
  label: string;
}

function computeLayout(graph: StakeholderGraph): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  // Cap nodes
  const cappedNodes = graph.nodes.slice(0, MAX_NODES);
  const nodeIds = new Set(cappedNodes.map((n) => n.id));

  // Group by ring
  const rings: Record<string, StakeholderNode[]> = {};
  for (const node of cappedNodes) {
    const ring = node.type;
    if (!rings[ring]) rings[ring] = [];
    rings[ring].push(node);
  }

  // Arrange in concentric circles
  const ringRadii: Record<string, number> = {
    bill: 0,
    sponsor: 100,
    chair: 160,
    donor: 220,
    lobbyist: 270,
  };

  const layoutMap = new Map<string, LayoutNode>();

  for (const type of RING_ORDER) {
    const nodesInRing = rings[type] || [];
    const radius = ringRadii[type] ?? 200;

    nodesInRing.forEach((node, i) => {
      let x: number;
      let y: number;

      if (type === 'bill' && nodesInRing.length === 1) {
        // Center the bill node
        x = CENTER;
        y = CENTER;
      } else {
        const angleStep = (2 * Math.PI) / Math.max(nodesInRing.length, 1);
        const angle = angleStep * i - Math.PI / 2;
        x = CENTER + radius * Math.cos(angle);
        y = CENTER + radius * Math.sin(angle);
      }

      layoutMap.set(node.id, {
        id: node.id,
        type: node.type,
        label: node.label,
        x,
        y,
        r: NODE_RADIUS[node.type] ?? 12,
        color: NODE_COLORS[node.type] ?? '#6B7280',
      });
    });
  }

  // Filter edges to only those with both endpoints in view
  const layoutEdges: LayoutEdge[] = [];
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    const sourceNode = layoutMap.get(edge.source);
    const targetNode = layoutMap.get(edge.target);
    if (sourceNode && targetNode) {
      layoutEdges.push({ source: sourceNode, target: targetNode, label: edge.label });
    }
  }

  return { nodes: Array.from(layoutMap.values()), edges: layoutEdges };
}

/* ── subcomponents ────────────────────────────────────────── */

const GraphEdge = React.memo(function GraphEdge({
  edge,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: {
  edge: LayoutEdge;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <line
        x1={edge.source.x}
        y1={edge.source.y}
        x2={edge.target.x}
        y2={edge.target.y}
        stroke={isHovered ? '#000' : '#CBD5E1'}
        strokeWidth={isHovered ? 2 : 1}
        strokeOpacity={isHovered ? 1 : 0.5}
      />
      {isHovered && (
        <text
          x={(edge.source.x + edge.target.x) / 2}
          y={(edge.source.y + edge.target.y) / 2 - 6}
          textAnchor="middle"
          fill="#000"
          fontSize={9}
          fontWeight="bold"
          className="pointer-events-none"
        >
          <tspan className="uppercase">{edge.label}</tspan>
        </text>
      )}
    </g>
  );
});

const GraphNode = React.memo(function GraphNode({
  node,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: {
  node: LayoutNode;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className="cursor-pointer">
      <circle
        cx={node.x}
        cy={node.y}
        r={isHovered ? node.r + 3 : node.r}
        fill={node.color}
        stroke={isHovered ? '#000' : 'white'}
        strokeWidth={isHovered ? 2 : 1.5}
        opacity={isHovered ? 1 : 0.85}
      />
      <text
        x={node.x}
        y={node.y + node.r + 12}
        textAnchor="middle"
        fill={isHovered ? '#000' : '#64748b'}
        fontSize={isHovered ? 10 : 8}
        fontWeight={isHovered ? 'bold' : 'normal'}
        className="pointer-events-none select-none"
      >
        {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
      </text>
    </g>
  );
});

/* ── main component ──────────────────────────────────────── */

interface Props {
  graph: StakeholderGraph;
}

const StakeholderMapViz = React.memo(function StakeholderMapViz({ graph }: Props) {
  const layout = useMemo(() => computeLayout(graph), [graph]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdgeIdx, setHoveredEdgeIdx] = useState<number | null>(null);

  const handleNodeEnter = useCallback((id: string) => setHoveredNode(id), []);
  const handleNodeLeave = useCallback(() => setHoveredNode(null), []);
  const handleEdgeEnter = useCallback((idx: number) => setHoveredEdgeIdx(idx), []);
  const handleEdgeLeave = useCallback(() => setHoveredEdgeIdx(null), []);

  if (graph.nodes.length === 0) {
    return (
      <div className="border-editorial bg-white p-8 text-center text-slate-500 text-sm">
        No stakeholder data to display.
      </div>
    );
  }

  return (
    <div className="border-editorial bg-white p-6">
      <div className="mb-4">
        <h3 className="font-editorial text-2xl font-bold text-black">Stakeholder Map</h3>
        <p className="mt-1 text-sm text-slate-500 uppercase tracking-widest font-bold">
          Network of sponsors, donors, and committees
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {RING_ORDER.map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: NODE_COLORS[type] }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {type}
            </span>
          </div>
        ))}
      </div>

      {/* SVG */}
      <div className="w-full aspect-square max-w-[600px] mx-auto">
        <svg
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          {/* Edges */}
          {layout.edges.map((edge, i) => (
            <GraphEdge
              key={`${edge.source.id}-${edge.target.id}-${i}`}
              edge={edge}
              isHovered={
                hoveredEdgeIdx === i ||
                hoveredNode === edge.source.id ||
                hoveredNode === edge.target.id
              }
              onMouseEnter={() => handleEdgeEnter(i)}
              onMouseLeave={handleEdgeLeave}
            />
          ))}

          {/* Nodes */}
          {layout.nodes.map((node) => (
            <GraphNode
              key={node.id}
              node={node}
              isHovered={hoveredNode === node.id}
              onMouseEnter={() => handleNodeEnter(node.id)}
              onMouseLeave={handleNodeLeave}
            />
          ))}
        </svg>
      </div>

      {graph.nodes.length > MAX_NODES && (
        <p className="mt-2 text-xs text-slate-400 text-center">
          Showing {MAX_NODES} of {graph.nodes.length} nodes for performance.
        </p>
      )}
    </div>
  );
});

export default StakeholderMapViz;
