import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Copy, Download, ExternalLink, FileCode2, Layers3, ShieldAlert, Workflow } from 'lucide-react';
import ReactFlow, { Background, Controls, Handle, MiniMap, Position, type Edge, type Node, type NodeTypes } from 'reactflow';
import 'reactflow/dist/style.css';
import mermaid from 'mermaid';
import { useApp } from '../hooks/useApp';
import type { ApplicationProfile, GeneratedDocument, GraphEdge, GraphNode } from '../types';
import AIInsightCard from '../components/AIInsightCard';
import InfoTooltip from '../components/InfoTooltip';

mermaid.initialize({ startOnLoad: false, theme: 'base', securityLevel: 'strict', flowchart: { useMaxWidth: true, htmlLabels: false } });

const colors = { navy: '#002733', green: '#008c82', neon: '#c2fe06', red: '#da0c1f' };

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph' | 'quote' | 'bullet' | 'number'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'rule' };

function normalize(content: string): string {
  return content.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function parse(content: string): Block[] {
  const lines = normalize(content).split('\n');
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trimEnd();
    if (!line.trim()) { index += 1; continue; }
    if (line.startsWith('```')) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++]);
      index += 1;
      if (!line.slice(3).trim().toLowerCase().startsWith('mermaid')) blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { blocks.push({ kind: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2] }); index += 1; continue; }
    if (/^[-=_*]{4,}$/.test(line.trim())) { blocks.push({ kind: 'rule' }); index += 1; continue; }
    if (line.startsWith('> ')) { blocks.push({ kind: 'quote', text: line.slice(2) }); index += 1; continue; }
    if (line.startsWith('|')) {
      const cells = (value: string) => value.split('|').slice(1, -1).map(cell => cell.trim());
      const headers = cells(line);
      if (index + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[index + 1])) {
        const rows: string[][] = [];
        index += 2;
        while (index < lines.length && lines[index].startsWith('|')) rows.push(cells(lines[index++]));
        blocks.push({ kind: 'table', headers, rows });
        continue;
      }
    }
    const bullet = line.match(/^[-*+]\s+(.+)$/);
    if (bullet) { blocks.push({ kind: 'bullet', text: bullet[1] }); index += 1; continue; }
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (numbered) { blocks.push({ kind: 'number', text: numbered[1] }); index += 1; continue; }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,3})\s|^```|^>|^\|/.test(lines[index]) && !/^[-*+]\s+/.test(lines[index])) paragraph.push(lines[index++].trim());
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}

function inline(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1').replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\s+#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?=\s|$)/g, '');
}

function DocumentBlocks({ content }: { content: string }) {
  const blocks = useMemo(() => parse(content), [content]);
  return <div className="space-y-4">{blocks.map((block, index) => {
    if (block.kind === 'heading') {
      const className = block.level === 1 ? 'mt-2 text-2xl font-bold text-[#002733]' : block.level === 2 ? 'mt-7 border-b border-[#dbe4ee] pb-2 text-lg font-bold text-[#002733]' : 'mt-5 text-sm font-bold uppercase tracking-[0.08em] text-[#008c82]';
      const Tag = block.level === 1 ? 'h1' : block.level === 2 ? 'h2' : 'h3';
      return <Tag key={index} className={className}>{inline(block.text)}</Tag>;
    }
    if (block.kind === 'quote') return <blockquote key={index} className="border-l-4 border-[#008c82] bg-[#efffb5] px-4 py-3 text-sm leading-6 text-[#002733]">{inline(block.text)}</blockquote>;
    if (block.kind === 'rule') return <div key={index} className="h-px bg-[#dbe4ee]" />;
    if (block.kind === 'bullet' || block.kind === 'number') return <div key={index} className="flex gap-3 text-sm leading-6 text-slate-600"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#008c82]" /><span>{inline(block.text)}</span></div>;
    if (block.kind === 'code') return <pre key={index} className="overflow-x-auto rounded-lg bg-[#002733] p-4 text-xs leading-6 text-white"><code>{block.text}</code></pre>;
    if (block.kind === 'table') return <div key={index} className="overflow-x-auto rounded-lg border border-[#dbe4ee]"><table className="min-w-full text-left text-sm"><thead className="bg-[#eff8ff] text-xs uppercase tracking-wide text-[#002733]"><tr>{block.headers.map((header, cell) => <th key={cell} className="px-3 py-2">{inline(header)}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-[#dbe4ee] hover:bg-slate-50">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2 text-slate-600">{inline(cell)}</td>)}</tr>)}</tbody></table></div>;
    return <p key={index} className="text-sm leading-7 text-slate-600">{inline(block.text)}</p>;
  })}</div>;
}

function mermaidId(value: string): string { return `node_${value.replace(/[^a-zA-Z0-9_]/g, '_') || 'unknown'}`; }
function mermaidLabel(value: string): string { return value.replace(/["\\<>|{}]/g, ' ').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim(); }

function graphToMermaid(nodes: GraphNode[], edges: GraphEdge[]): string {
  const ids = new Set(nodes.map(node => node.id));
  const lines = ['flowchart TD'];
  nodes.forEach(node => lines.push(`  ${mermaidId(node.id)}["${mermaidLabel(node.label)}\\n${mermaidLabel(node.id)}"]`));
  edges.forEach(edge => { if (ids.has(edge.source) && ids.has(edge.target)) lines.push(`  ${mermaidId(edge.source)} -->|${mermaidLabel(edge.type)}| ${mermaidId(edge.target)}`); });
  if (!nodes.length) lines.push('  empty["No relationship data available"]');
  return lines.join('\n');
}

function ArchitectureNode({ data }: { data: { label: string; nodeType: string; unresolved?: boolean } }) {
  const color = data.unresolved ? colors.red : data.nodeType === 'Application' ? colors.navy : data.nodeType === 'Module' ? colors.green : data.nodeType === 'DataStore' ? '#b45309' : '#0284c7';
  return <div style={{ background: `${color}18`, border: `1.5px solid ${color}`, minWidth: 150, maxWidth: 220 }} className="rounded-lg px-3 py-2 shadow-sm"><Handle type="target" position={Position.Top} style={{ background: color }} /><div className="truncate text-xs font-bold text-[#002733]">{data.label}</div><div className="text-[10px] uppercase tracking-wide text-slate-500">{data.unresolved ? 'Unresolved target' : data.nodeType}</div><Handle type="source" position={Position.Bottom} style={{ background: color }} /></div>;
}
const nodeTypes: NodeTypes = { architecture: ArchitectureNode };

function reactFlowNodes(nodes: GraphNode[], edges: GraphEdge[]): Node[] {
  const existing = new Set(nodes.map(node => node.id));
  const missing = [...new Set(edges.flatMap(edge => [edge.source, edge.target]).filter(id => !existing.has(id)))];
  return [...nodes, ...missing.map(id => ({ id, type: 'Unresolved', label: id, data: undefined }))].map((node, index) => ({ id: node.id, type: 'architecture', position: { x: (index % 4) * 250 + 40, y: Math.floor(index / 4) * 150 + 40 }, data: { label: node.label, nodeType: node.type, unresolved: node.type === 'Unresolved' } }));
}

function reactFlowEdges(edges: GraphEdge[], nodes: Node[]): Edge[] {
  const ids = new Set(nodes.map(node => node.id));
  return edges.filter(edge => ids.has(edge.source) && ids.has(edge.target)).map(edge => ({ id: edge.id, source: edge.source, target: edge.target, label: edge.type, style: { stroke: colors.green, strokeWidth: 1.5 }, labelStyle: { fill: '#475569', fontSize: 9 } }));
}

function RelationshipList({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const labels = new Map(nodes.map(node => [node.id, node.label]));
  return <div className="overflow-x-auto rounded-lg border border-[#dbe4ee]"><table className="min-w-full text-left text-xs"><thead className="bg-[#eff8ff] text-[#002733]"><tr><th className="px-3 py-2">Source</th><th className="px-3 py-2">Relationship</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">Status</th></tr></thead><tbody>{edges.map(edge => <tr key={edge.id} className="border-t border-[#dbe4ee]"><td className="px-3 py-2">{labels.get(edge.source) ?? edge.source}</td><td className="px-3 py-2 font-semibold text-[#008c82]">{edge.type}</td><td className="px-3 py-2">{labels.get(edge.target) ?? edge.target}</td><td className="px-3 py-2">{labels.has(edge.target) ? 'Resolved' : 'Unresolved target'}</td></tr>)}</tbody></table></div>;
}

function ArchitectureDiagram({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const container = useRef<HTMLDivElement>(null);
  const renderCount = useRef(0);
  const [fallback, setFallback] = useState(false);
  const chart = useMemo(() => graphToMermaid(nodes, edges), [nodes, edges]);
  const rfNodes = useMemo(() => reactFlowNodes(nodes, edges), [nodes, edges]);
  const rfEdges = useMemo(() => reactFlowEdges(edges, rfNodes), [edges, rfNodes]);
  useEffect(() => {
    let cancelled = false;
    if (!container.current) return undefined;
    setFallback(false);
    container.current.innerHTML = '';
    const id = `documents-mermaid-${++renderCount.current}`;
    mermaid.render(id, chart).then(({ svg }) => { if (!cancelled && container.current) container.current.innerHTML = svg; }).catch(() => { if (!cancelled) setFallback(true); });
    return () => { cancelled = true; if (container.current) container.current.innerHTML = ''; };
  }, [chart]);
  if (fallback) return rfNodes.length ? <div className="h-[520px] overflow-hidden rounded-lg border border-[#dbe4ee] bg-slate-50"><ReactFlow nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes} fitView minZoom={0.25}><Background color="#cbd5e1" gap={24} /><Controls /><MiniMap nodeColor={node => node.data?.unresolved ? colors.red : colors.green} /></ReactFlow></div> : <RelationshipList nodes={nodes} edges={edges} />;
  return <div ref={container} className="min-h-[320px] overflow-auto rounded-lg border border-[#dbe4ee] bg-slate-50 p-4" aria-label="Application architecture diagram" />;
}

function EvidenceChips({ evidence }: { evidence: GeneratedDocument['evidence'] }) {
  return <div className="flex flex-wrap gap-2">{evidence.map((item, index) => <span key={`${item.sheet}-${item.recordId}-${index}`} className="inline-flex items-center gap-1 rounded-full border border-[#b7d8d4] bg-[#f0fdfb] px-2.5 py-1 font-mono text-[11px] text-[#006f68]"><ExternalLink size={11} />{item.recordId}</span>)}</div>;
}

function ProcessFlow({ doc, profile, graphNodes, graphEdges }: { doc: GeneratedDocument; profile: ApplicationProfile; graphNodes: GraphNode[]; graphEdges: GraphEdge[] }) {
  const stages = [{ title: 'Understand', text: 'Recover application logic and structure.' }, { title: 'Document', text: 'Generate traceable functional documentation.' }, { title: 'Map', text: 'Discover dependencies and architecture relationships.' }, { title: 'Test', text: 'Validate functional parity and identify gaps.' }, { title: 'Modernize', text: 'Prioritize modernization while considering continuity.' }];
  return <div className="space-y-6"><div className="rounded-xl bg-[#002733] p-6 text-white"><div className="flex items-start justify-between gap-4"><div><div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#c2fe06]">Process Flow</div><h2 className="text-2xl font-bold">{profile.application.app_name}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">Application architecture and modernization flow, grounded in deterministic discovery relationships.</p></div><Workflow className="text-[#c2fe06]" aria-hidden="true" /></div></div><div className="grid gap-2 md:grid-cols-5">{stages.map((stage, index) => <div key={stage.title} className="rounded-lg border border-[#dbe4ee] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"><div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#efffb5] text-xs font-bold text-[#002733]">{index + 1}</div><h3 className="text-sm font-bold uppercase tracking-wide text-[#002733]">{stage.title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{stage.text}</p></div>)}</div><section><h2 className="text-lg font-bold text-[#002733]">Architecture Visualization</h2><p className="mb-3 text-sm text-slate-500">Interactive deterministic relationship graph for this application.</p><ArchitectureDiagram nodes={graphNodes} edges={graphEdges} /></section><section><h2 className="mb-3 text-lg font-bold text-[#002733]">Relationship Details</h2>{graphEdges.length ? <RelationshipList nodes={graphNodes} edges={graphEdges} /> : <div className="rounded-lg border border-[#dbe4ee] bg-white p-5 text-sm text-slate-600">No dependency relationships available. The application evidence is still available below.</div>}</section><section className="rounded-lg border border-[#dbe4ee] bg-white p-5"><h2 className="mb-3 text-lg font-bold text-[#002733]">Flow Notes</h2><DocumentBlocks content={doc.content} /></section></div>;
}

function DocViewer({ doc, profile }: { doc: GeneratedDocument; profile: ApplicationProfile }) {
  const [copied, setCopied] = useState(false);
  const metadata = [
    { label: 'Business domain', value: profile.application.business_domain, Icon: Layers3 },
    { label: 'Criticality', value: profile.application.criticality, Icon: ShieldAlert },
    { label: 'Documentation coverage', value: `${profile.application.doc_coverage_pct}%`, Icon: FileCode2 },
    { label: 'Evidence records', value: String(doc.evidence.length), Icon: CheckCircle2 },
  ];
  const copy = async () => { await navigator.clipboard.writeText(doc.content); setCopied(true); window.setTimeout(() => setCopied(false), 2000); };
  const exportMd = () => { const url = URL.createObjectURL(new Blob([doc.content], { type: 'text/markdown' })); const link = document.createElement('a'); link.href = url; link.download = `${doc.title.replace(/\s+/g, '_')}.md`; link.click(); URL.revokeObjectURL(url); };
  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#008c82]">Functional Documentation</div><h2 className="text-2xl font-bold text-[#002733]">{profile.application.app_name}</h2><p className="mt-1 text-sm text-slate-500">Generated {new Date(doc.generatedAt).toLocaleString()}{doc.isAiGenerated && <span className="ml-2 text-[#008c82]">· AI-assisted</span>}</p></div><div className="flex gap-2"><button type="button" onClick={copy} aria-label="Copy source documentation" className="flex items-center gap-1.5 rounded-lg border border-[#dbe4ee] bg-white px-3 py-2 text-xs font-semibold text-[#002733] hover:border-[#008c82] hover:text-[#008c82]"><Copy size={13} />{copied ? 'Copied' : 'Copy source'}</button><button type="button" onClick={exportMd} aria-label="Export Markdown documentation" className="flex items-center gap-1.5 rounded-lg bg-[#002733] px-3 py-2 text-xs font-semibold text-white hover:bg-[#008c82]"><Download size={13} />Export MD</button></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metadata.map(({ label, value, Icon }) => <div key={label} className="rounded-lg border border-[#dbe4ee] bg-white p-4"><Icon size={16} className="mb-3 text-[#008c82]" aria-hidden="true" /><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-sm font-bold text-[#002733]">{value}</div></div>)}</div>{doc.evidence.length > 0 && <section className="rounded-lg border border-[#dbe4ee] bg-white p-4"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence references</div><EvidenceChips evidence={doc.evidence} /></section>}<div className="rounded-xl border border-[#dbe4ee] bg-white p-6 shadow-sm"><DocumentBlocks content={doc.content} /></div></div>;
}

export default function Documents() {
  const { analysisResult, selectedApp } = useApp();
  const [activeTab, setActiveTab] = useState(0);
  if (!selectedApp) return <div className="p-8 text-center text-slate-500">Select an application.</div>;
  if (!analysisResult) return <div className="p-8 text-center text-slate-500">Run analysis to generate documentation.</div>;
  const docs = analysisResult.documents;
  if (!docs.length) return <div className="p-8 text-center text-slate-500">No documents generated.</div>;
  const safeTab = Math.min(activeTab, docs.length - 1);
  const document = docs[safeTab];
  const labels = docs.map(doc => doc.type === 'FUNCTIONAL' ? 'Functional Docs' : doc.type === 'PROCESS_FLOW' ? 'Process Flow' : 'API Spec');
  return <div className="mx-auto max-w-7xl p-4 sm:p-6"><div className="mb-5 flex items-center gap-2"><h1 className="text-2xl font-bold text-[#002733]">Documentation</h1><InfoTooltip text="Documentation recovered from discovery artifacts and enhanced with evidence-grounded AI interpretation." /></div><div className="mb-6 flex gap-1 overflow-x-auto border-b border-[#dbe4ee]" role="tablist" aria-label="Documentation views">{labels.map((label, index) => <button type="button" key={label} onClick={() => setActiveTab(index)} role="tab" aria-selected={safeTab === index} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008c82] ${safeTab === index ? 'border-[#008c82] text-[#002733]' : 'border-transparent text-slate-500 hover:text-[#008c82]'}`}>{label}</button>)}</div><div className="mb-6"><AIInsightCard appId={selectedApp.app_id} intent="document" title="AI Document Insight" /></div>{document.type === 'PROCESS_FLOW' ? <ProcessFlow doc={document} profile={analysisResult.profile} graphNodes={analysisResult.graphNodes} graphEdges={analysisResult.graphEdges} /> : <DocViewer doc={document} profile={analysisResult.profile} />}</div>;
}