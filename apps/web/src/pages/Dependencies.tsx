import { useState, useCallback } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap,
  type Node, type Edge, type NodeTypes,
  Handle, Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useApp } from '../hooks/useApp';
import { EvidencePanel } from './Understand';
import type { GraphNode, GraphEdge, Finding } from '../types';
import AIInsightCard from '../components/AIInsightCard';

const NODE_COLORS: Record<string, string> = {
  Application: '#1d4ed8',
  Module: '#059669',
  Rule: '#7c3aed',
  DataStore: '#b45309',
  Integration: '#0891b2',
  Test: '#374151',
  Documentation: '#4b5563',
  ModernizationItem: '#6b7280',
};

function CustomNode({ data }: { data: { label: string; nodeType: string; detail: string; isOrphan?: boolean; isCycle?: boolean } }) {
  const color = NODE_COLORS[data.nodeType] ?? '#374151';
  const border = data.isOrphan ? '#ef4444' : data.isCycle ? '#f59e0b' : color;
  return (
    <div
      style={{ background: color + '33', border: `1.5px solid ${border}`, borderRadius: 8, padding: '6px 10px', minWidth: 100, maxWidth: 160 }}
      className="text-center"
    >
      <Handle type="target" position={Position.Top} style={{ background: border }} />
      <div className="text-xs font-bold text-white truncate">{data.label}</div>
      <div className="text-xs text-gray-400 truncate">{data.nodeType}</div>
      {data.isOrphan && <div className="text-xs text-red-400 mt-0.5">⚠ Orphan</div>}
      {data.isCycle && <div className="text-xs text-yellow-400 mt-0.5">↻ Cycle</div>}
      <Handle type="source" position={Position.Bottom} style={{ background: border }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { custom: CustomNode };

function toRFNodes(nodes: GraphNode[], cycleIds: Set<string>, orphanIds: Set<string>): Node[] {
  return nodes.map((n, i) => ({
    id: n.id,
    type: 'custom',
    position: { x: (i % 8) * 180 + 40, y: Math.floor(i / 8) * 140 + 40 },
    data: {
      label: n.label,
      nodeType: n.type,
      detail: '',
      isCycle: cycleIds.has(n.id),
      isOrphan: orphanIds.has(n.id),
    },
  }));
}

function toRFEdges(edges: GraphEdge[], criticalDepIds: Set<string>): Edge[] {
  return edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.type,
    animated: criticalDepIds.has(e.id),
    style: { stroke: e.type === 'DEPENDS_ON' ? '#6366f1' : '#374151', strokeWidth: 1.5 },
    labelStyle: { fontSize: 9, fill: '#9ca3af' },
    data: e.data,
  }));
}

export default function Dependencies() {
  const { analysisResult, selectedApp } = useApp();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [filter, setFilter] = useState<'all' | 'orphan' | 'cycle' | 'critical'>('all');

  if (!selectedApp) return <div className="p-8 text-center text-gray-500">Select an application.</div>;
  if (!analysisResult) return <div className="p-8 text-center text-gray-500">Run analysis to view dependency graph.</div>;

  const { profile, graphNodes, graphEdges } = analysisResult;

  // Compute cycle and orphan node IDs from findings
  const cycleFindings = profile.findings.filter(f => f.type === 'CIRCULAR_DEPENDENCY');
  const orphanFindings = profile.findings.filter(f => f.type === 'ORPHAN_DEPENDENCY');

  const cycleIds = new Set(cycleFindings.flatMap(f => f.moduleIds ?? []));
  const orphanSourceIds = new Set(orphanFindings.flatMap(f => f.moduleIds ?? []));

  // Critical dep edge IDs
  const criticalDepIds = new Set(
    profile.dependencies.filter(d => d.is_runtime_critical).map(d => {
      const edge = graphEdges.find(e => e.source === d.source_module_id && e.target === d.target_id);
      return edge?.id ?? '';
    })
  );

  // Filter nodes/edges
  let visibleNodes = graphNodes;
  let visibleEdges = graphEdges;
  if (filter === 'orphan') {
    visibleNodes = graphNodes.filter(n => orphanSourceIds.has(n.id));
    visibleEdges = graphEdges.filter(e => orphanSourceIds.has(e.source));
  } else if (filter === 'cycle') {
    visibleNodes = graphNodes.filter(n => cycleIds.has(n.id));
    visibleEdges = graphEdges.filter(e => cycleIds.has(e.source) && cycleIds.has(e.target));
  } else if (filter === 'critical') {
    const critSources = new Set(profile.dependencies.filter(d => d.is_runtime_critical).map(d => d.source_module_id));
    visibleNodes = graphNodes.filter(n => critSources.has(n.id));
    visibleEdges = graphEdges.filter(e => criticalDepIds.has(e.id));
  }

  const rfNodes = toRFNodes(visibleNodes, cycleIds, orphanSourceIds);
  const rfEdges = toRFEdges(visibleEdges, criticalDepIds);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    const gn = graphNodes.find(n => n.id === node.id);
    setSelectedNode(gn ?? null);
    setSelectedEdge(null);
  }, [graphNodes]);

  const onEdgeClick = useCallback((_: unknown, edge: Edge) => {
    const ge = graphEdges.find(e => e.id === edge.id);
    setSelectedEdge(ge ?? null);
    setSelectedNode(null);
  }, [graphEdges]);

  const totalDeps = profile.dependencies.length;
  const runtimeCritical = profile.dependencies.filter(d => d.is_runtime_critical).length;

  return (
    <div className="flex h-full">
      {/* Graph */}
      <div className="flex-1 flex flex-col">
        {/* Controls */}
        <div className="p-3 border-b border-gray-800 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Filter:</span>
          {(['all', 'orphan', 'cycle', 'critical'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1 rounded border ${filter === f ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex gap-4 text-xs text-gray-500">
            <span>Total: <span className="text-white">{totalDeps}</span></span>
            <span>Runtime Critical: <span className="text-orange-400">{runtimeCritical}</span></span>
            <span>Orphans: <span className="text-red-400">{orphanFindings.length}</span></span>
            <span>Cycles: <span className="text-yellow-400">{cycleFindings.length}</span></span>
          </div>
        </div>

        {/* Findings summary */}
        {(cycleFindings.length > 0 || orphanFindings.length > 0) && (
          <div className="px-3 py-2 border-b border-gray-800 flex gap-3 flex-wrap">
            {cycleFindings.map(f => (
              <div key={f.id} className="text-xs bg-yellow-950/40 border border-yellow-800 rounded px-2 py-1 text-yellow-300">
                ↻ {f.title}
              </div>
            ))}
            {orphanFindings.map(f => (
              <div key={f.id} className="text-xs bg-red-950/40 border border-red-800 rounded px-2 py-1 text-red-300">
                ⚠ {f.title}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1" style={{ background: '#0a0a0f' }}>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            fitView
            minZoom={0.3}
          >
            <Background color="#1f2937" gap={20} />
            <Controls />
            <MiniMap nodeColor={n => NODE_COLORS[(n.data as { nodeType: string }).nodeType] ?? '#374151'} style={{ background: '#111827' }} />
          </ReactFlow>
        </div>
      </div>

      {/* Detail panel */}
      {(selectedNode || selectedEdge) && (
        <div className="w-72 border-l border-gray-800 bg-gray-900 p-4 overflow-y-auto">
          <button className="text-xs text-gray-500 mb-3 hover:text-gray-300" onClick={() => { setSelectedNode(null); setSelectedEdge(null); }}>✕ Close</button>

          {selectedNode && (
            <div className="space-y-3">
              <AIInsightCard appId={selectedApp.app_id} intent="dependencies" entityId={selectedNode.id} title="AI Dependency Interpretation" compact />
              <div>
                <div className="text-xs text-gray-500">Type</div>
                <div className="text-sm font-medium text-white">{selectedNode.type}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ID</div>
                <div className="text-sm font-mono text-blue-400">{selectedNode.id}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Label</div>
                <div className="text-sm text-gray-200">{selectedNode.label}</div>
              </div>
              {selectedNode.data !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Details</div>
                  <pre className="text-xs text-gray-400 bg-gray-950 rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap">
                    {JSON.stringify(selectedNode.data as Record<string, unknown>, null, 2)}
                  </pre>
                </div>
              )}
              {/* Related findings */}
              {profile.findings.filter(f => f.moduleIds?.includes(selectedNode.id) || f.ruleIds?.includes(selectedNode.id)).map(f => (
                <div key={f.id} className="bg-gray-950 border border-gray-800 rounded p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${f.severity === 'CRITICAL' ? 'bg-red-900 text-red-300' : 'bg-orange-900 text-orange-300'}`}>{f.severity}</span>
                  </div>
                  <p className="text-xs text-gray-400">{f.title}</p>
                  <EvidencePanel evidence={f.evidence} />
                </div>
              ))}
            </div>
          )}

          {selectedEdge && (
            <div className="space-y-3">
              <AIInsightCard appId={selectedApp.app_id} intent="dependencies" entityId={selectedEdge.source} title="AI Dependency Interpretation" compact />
              <div>
                <div className="text-xs text-gray-500">Edge Type</div>
                <div className="text-sm font-medium text-white">{selectedEdge.type}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Source → Target</div>
                <div className="text-sm font-mono text-blue-400">{selectedEdge.source} → {selectedEdge.target}</div>
              </div>
              {selectedEdge.data !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Dependency Record</div>
                  <pre className="text-xs text-gray-400 bg-gray-950 rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap">
                    {JSON.stringify(selectedEdge.data as Record<string, unknown>, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
