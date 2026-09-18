import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { SeverityBadge } from '../components/Layout';
import { EvidencePanel } from './Understand';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { FindingType } from '../types';
import AIInsightCard from '../components/AIInsightCard';
import WhyButton from '../components/WhyButton';

const RISK_GROUPS: { label: string; types: FindingType[] }[] = [
  { label: 'Security', types: ['SECURITY_RISK'] },
  { label: 'Continuity', types: ['CONTINUITY_RISK', 'RETIRED_INTEGRATION'] },
  { label: 'Dependency', types: ['CIRCULAR_DEPENDENCY', 'ORPHAN_DEPENDENCY', 'ORPHAN_DATA_STORE'] },
  { label: 'Testing', types: ['CRITICAL_RULE_NO_TEST', 'PARITY_MISMATCH'] },
  { label: 'Documentation', types: ['UNDOCUMENTED_MODULE', 'LOW_CONFIDENCE_RULE'] },
  { label: 'Complexity', types: ['HIGH_COMPLEXITY', 'DEAD_CODE', 'DUPLICATE_BUSINESS_LOGIC'] },
];

export default function Risks() {
  const { analysisResult, selectedApp } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>('all');

  if (!selectedApp) return <div className="p-8 text-center text-gray-500">Select an application.</div>;
  if (!analysisResult) return <div className="p-8 text-center text-gray-500">Run analysis to view risks.</div>;

  const { findings } = analysisResult.profile;

  const getGroupFindings = (types: FindingType[]) => findings.filter(f => types.includes(f.type));

  const visibleFindings = activeGroup === 'all'
    ? findings
    : getGroupFindings(RISK_GROUPS.find(g => g.label === activeGroup)?.types ?? []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Risks: {selectedApp.app_name}</h1>
      <AIInsightCard appId={selectedApp.app_id} intent="risks" title="AI Risk Interpretation" />

      {/* Summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(s => {
          const count = findings.filter(f => f.severity === s).length;
          return (
            <div key={s} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-white">{count}</div>
              <SeverityBadge s={s} />
            </div>
          );
        })}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center col-span-2">
          <div className="text-xl font-bold text-white">{findings.length}</div>
          <div className="text-xs text-gray-500">Total Findings</div>
        </div>
      </div>

      {/* Group filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveGroup('all')}
          className={`text-xs px-3 py-1.5 rounded border ${activeGroup === 'all' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
        >
          All ({findings.length})
        </button>
        {RISK_GROUPS.map(g => {
          const count = getGroupFindings(g.types).length;
          if (count === 0) return null;
          return (
            <button
              key={g.label}
              onClick={() => setActiveGroup(g.label)}
              className={`text-xs px-3 py-1.5 rounded border ${activeGroup === g.label ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
            >
              {g.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Findings list */}
      <div className="space-y-2">
        {visibleFindings.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-sm">No findings in this category.</div>
        )}
        {visibleFindings.map(f => (
          <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <button
              className="w-full text-left px-4 py-3 flex items-start gap-3"
              onClick={() => setExpanded(expanded === f.id ? null : f.id)}
            >
              <SeverityBadge s={f.severity} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-gray-500 font-mono">{f.type.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-600">Confidence: {f.confidence}</span>
                </div>
                <p className="text-sm text-gray-200">{f.title}</p>
              </div>
              {expanded === f.id ? <ChevronDown size={12} className="text-gray-500 shrink-0 mt-1" /> : <ChevronRight size={12} className="text-gray-500 shrink-0 mt-1" />}
            </button>
            {expanded === f.id && (
              <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-3">
                <p className="text-sm text-gray-400">{f.description}</p>
                {f.moduleIds && f.moduleIds.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Affected Modules</div>
                    <div className="flex flex-wrap gap-1">
                      {f.moduleIds.map(m => <span key={m} className="text-xs font-mono bg-gray-800 text-green-400 px-1.5 py-0.5 rounded">{m}</span>)}
                    </div>
                  </div>
                )}
                {f.ruleIds && f.ruleIds.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Affected Rules</div>
                    <div className="flex flex-wrap gap-1">
                      {f.ruleIds.map(r => <span key={r} className="text-xs font-mono bg-gray-800 text-purple-400 px-1.5 py-0.5 rounded">{r}</span>)}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500 mb-1">Evidence</div>
                  <EvidencePanel evidence={f.evidence} />
                </div>
                <WhyButton appId={selectedApp.app_id} intent="risks" entityId={f.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
