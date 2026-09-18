import { useState } from 'react';
import { ArrowDown, Database, FileSearch, GitBranch, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import AIInsightCard from '../components/AIInsightCard';
import type { AIViewMode } from '../types';

const technicalSteps = [
    ['XLSX', 'Legacy discovery data'],
    ['Parser', 'Workbook ingestion and normalization'],
    ['Analysis Engine', 'Deterministic findings and metrics'],
    ['Evidence Layer', 'Traceable records and relationships'],
    ['LLMaaS / AI Service', 'Grounded explanation and recommendation'],
    ['LegacyMind UI', 'Technical and executive views'],
];

const executiveSteps = [
    ['Import', 'Bring in legacy discovery information.'],
    ['Understand', 'See applications, rules, dependencies, and tests.'],
    ['Assess', 'Identify risks, gaps, and continuity concerns.'],
    ['Explain', 'Use AI to translate evidence into clear meaning.'],
    ['Modernize', 'Plan a safer sequence while preserving traceability.'],
    ['Review', 'Keep the human decision-maker in control.'],
];

export default function Architecture() {
    const { selectedApp, analysisResult } = useApp();
    const [mode, setMode] = useState<AIViewMode>('executive');

    if (!selectedApp) return <div className="p-8 text-center text-gray-500">Select an application to view architecture.</div>;
    if (!analysisResult) return <div className="p-8 text-center text-gray-500">Run analysis to view architecture.</div>;

    const { profile, graphNodes, graphEdges } = analysisResult;
    const typeCounts = graphNodes.reduce<Record<string, number>>((counts, node) => ({ ...counts, [node.type]: (counts[node.type] ?? 0) + 1 }), {});

    return <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
            <div><h1 className="text-xl font-bold text-white">Architecture: {selectedApp.app_name}</h1><p className="text-sm text-gray-500 mt-1">How LegacyMind turns discovery evidence into explainable modernization guidance.</p></div>
            <div className="inline-flex border border-gray-700 rounded overflow-hidden" aria-label="Architecture view"><button type="button" onClick={() => setMode('technical')} className={`text-xs px-3 py-1.5 ${mode === 'technical' ? 'bg-blue-700 text-white' : 'bg-gray-900 text-gray-500'}`}>Technical</button><button type="button" onClick={() => setMode('executive')} className={`text-xs px-3 py-1.5 ${mode === 'executive' ? 'bg-blue-700 text-white' : 'bg-gray-900 text-gray-500'}`}>Executive</button></div>
        </div>

        <div className="bg-blue-950/20 border border-blue-900/70 rounded-lg p-4 flex items-start gap-3"><ShieldCheck size={16} className="text-blue-400 mt-0.5" /><div><div className="text-sm font-medium text-white">Evidence remains the source of truth</div><p className="text-xs text-gray-400 mt-1">Deterministic analysis establishes facts. AI explains those facts and suggests next steps; it does not change findings, metrics, or relationships.</p></div></div>

        <div className="grid md:grid-cols-3 gap-3 text-xs text-gray-400"><div className="bg-gray-900 border border-gray-800 rounded-lg p-3"><Database size={14} className="text-blue-400 mb-2" /><b className="text-white">{graphNodes.length}</b> graph entities</div><div className="bg-gray-900 border border-gray-800 rounded-lg p-3"><GitBranch size={14} className="text-green-400 mb-2" /><b className="text-white">{graphEdges.length}</b> relationships</div><div className="bg-gray-900 border border-gray-800 rounded-lg p-3"><FileSearch size={14} className="text-orange-400 mb-2" /><b className="text-white">{profile.findings.length}</b> deterministic findings</div></div>

        <section className="bg-gray-900 border border-gray-800 rounded-lg p-5"><h2 className="text-sm font-semibold text-gray-200 mb-4">{mode === 'technical' ? 'Technical Architecture' : 'Executive Flow'}</h2><div className="max-w-2xl">{(mode === 'technical' ? technicalSteps : executiveSteps).map(([title, description], index, steps) => <div key={title}><div className="flex items-center gap-3 border border-gray-800 bg-gray-950 rounded-lg p-3"><div className="w-8 h-8 rounded bg-blue-950 text-blue-300 flex items-center justify-center text-xs font-bold">{index + 1}</div><div><div className="text-sm text-white">{title}</div><div className="text-xs text-gray-500 mt-0.5">{description}</div></div></div>{index < steps.length - 1 && <div className="flex justify-center py-1"><ArrowDown size={14} className="text-gray-600" /></div>}</div>)}</div></section>

        <section><h2 className="text-sm font-semibold text-gray-300 mb-3">Evidence inventory</h2><div className="flex flex-wrap gap-2">{Object.entries(typeCounts).map(([type, count]) => <span key={type} className="text-xs bg-gray-900 border border-gray-800 rounded px-2 py-1 text-gray-400">{type}: <span className="text-white">{count}</span></span>)}</div></section>
        <AIInsightCard appId={selectedApp.app_id} intent="understanding" title="AI architecture interpretation" mode={mode} onModeChange={setMode} />
        <div className="flex items-center gap-2 text-xs text-gray-600"><Sparkles size={12} className="text-blue-400" /> Human review remains the final modernization decision point <UserRound size={12} /></div>
    </div>;
}
