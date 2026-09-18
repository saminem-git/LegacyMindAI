import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { SeverityBadge } from '../components/Layout';
import { EvidencePanel } from './Understand';
import { ChevronDown, ChevronRight, Zap } from 'lucide-react';
import type { Recommendation } from '../types';
import AIInsightCard from '../components/AIInsightCard';
import WhyButton from '../components/WhyButton';
import InfoTooltip from '../components/InfoTooltip';

function RecCard({ rec, appId }: { rec: Recommendation; appId: string }) {
  const [open, setOpen] = useState(false);
  const contColors: Record<string, string> = {
    CRITICAL: 'text-red-400', HIGH: 'text-orange-400', MEDIUM: 'text-yellow-400', LOW: 'text-green-400',
  };
  return (
    <div className={`bg-gray-900 border rounded-lg overflow-hidden ${rec.priority === 'CRITICAL' ? 'border-red-800' : rec.priority === 'HIGH' ? 'border-orange-800' : 'border-gray-800'}`}>
      <button className="w-full text-left px-4 py-3 flex items-start gap-3" onClick={() => setOpen(o => !o)}>
        <Zap size={14} className="text-blue-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <SeverityBadge s={rec.priority} />
            <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{rec.roadmapPhase}</span>
            <span className="text-xs text-gray-600">Risk score: {rec.riskScore}</span>
            <span className={`text-xs ${contColors[rec.continuityRisk]}`}>Continuity: {rec.continuityRisk}</span>
          </div>
          <p className="text-sm font-medium text-gray-200">{rec.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rec.rationale}</p>
        </div>
        {open ? <ChevronDown size={14} className="text-gray-500 shrink-0" /> : <ChevronRight size={14} className="text-gray-500 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-800 space-y-3 pt-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Description</div>
            <p className="text-sm text-gray-300">{rec.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Risk</div>
              <p className="text-xs text-gray-400">{rec.risk}</p>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Continuity Impact</div>
              <p className={`text-xs font-medium ${contColors[rec.continuityRisk]}`}>{rec.continuityRisk}</p>
            </div>
          </div>
          {rec.relatedModules.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Affected Modules</div>
              <div className="flex flex-wrap gap-1">
                {rec.relatedModules.map(m => <span key={m} className="text-xs font-mono bg-gray-800 text-green-400 px-1.5 py-0.5 rounded">{m}</span>)}
              </div>
            </div>
          )}
          {rec.relatedRules.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Affected Rules</div>
              <div className="flex flex-wrap gap-1">
                {rec.relatedRules.map(r => <span key={r} className="text-xs font-mono bg-gray-800 text-purple-400 px-1.5 py-0.5 rounded">{r}</span>)}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 mb-1">Evidence</div>
            <EvidencePanel evidence={rec.evidence} />
          </div>
          <WhyButton appId={appId} intent="modernization" entityId={rec.id} label="Explain this recommendation" />
        </div>
      )}
    </div>
  );
}

export default function Modernize() {
  const { analysisResult, selectedApp } = useApp();
  const [phase, setPhase] = useState<'all' | 'NOW' | 'NEXT' | 'LATER'>('all');

  if (!selectedApp) return <div className="p-8 text-center text-gray-500">Select an application.</div>;
  if (!analysisResult) return <div className="p-8 text-center text-gray-500">Run analysis to view modernization recommendations.</div>;

  const { profile } = analysisResult;
  const recs = profile.recommendations;

  const byPriority = (p: string) => recs.filter(r => r.priority === p);
  const byPhase = (ph: string) => recs.filter(r => r.roadmapPhase === ph);

  const filtered = phase === 'all' ? recs : byPhase(phase);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-[var(--color-primary)]">Modernize: {selectedApp.app_name}</h1><InfoTooltip text="Existing modernization priorities remain deterministic; AI explains the evidence behind each recommendation." /></div>
      <AIInsightCard appId={selectedApp.app_id} intent="modernization" title="AI Roadmap Explanation" />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(p => (
          <div key={p} className={`rounded-lg border p-3 text-center ${p === 'CRITICAL' ? 'border-red-800 bg-red-950/20' : p === 'HIGH' ? 'border-orange-800 bg-orange-950/20' : p === 'MEDIUM' ? 'border-yellow-800 bg-yellow-950/20' : 'border-gray-700 bg-gray-900'}`}>
            <div className="text-2xl font-bold text-white">{byPriority(p).length}</div>
            <div className="text-xs text-gray-500">{p}</div>
          </div>
        ))}
      </div>

      {/* Roadmap tabs */}
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Modernization Roadmap</h2>
        <div className="flex gap-1 mb-4">
          {(['all', 'NOW', 'NEXT', 'LATER'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`text-xs px-3 py-1.5 rounded border ${phase === p ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
            >
              {p === 'all' ? `All (${recs.length})` : `${p} (${byPhase(p).length})`}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && <div className="text-center py-6 text-gray-600 text-sm">No recommendations in this phase.</div>}
          {filtered.map(r => <RecCard key={r.id} rec={r} appId={selectedApp.app_id} />)}
        </div>
      </div>

      {/* Backlog items */}
      {profile.modernizationItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Modernization Backlog ({profile.modernizationItems.length} items)</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Recommendation</th>
                  <th className="px-3 py-2 text-left">Target Tech</th>
                  <th className="px-3 py-2 text-center">Effort</th>
                  <th className="px-3 py-2 text-center">Risk</th>
                  <th className="px-3 py-2 text-center">Continuity</th>
                  <th className="px-3 py-2 text-center">Priority</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {profile.modernizationItems.map(item => (
                  <tr key={item.backlog_id} className={`border-b border-gray-800 hover:bg-gray-900/50 ${!item.preserves_continuity ? 'bg-red-950/10' : ''}`}>
                    <td className="px-3 py-2 text-xs font-mono text-blue-400">{item.backlog_id}</td>
                    <td className="px-3 py-2 text-xs text-gray-300">{item.recommendation}</td>
                    <td className="px-3 py-2 text-xs text-gray-400">{item.target_tech}</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-400">{item.effort_points}pt</td>
                    <td className="px-3 py-2 text-center"><SeverityBadge s={item.risk_level?.toUpperCase()} /></td>
                    <td className="px-3 py-2 text-center text-xs">
                      {item.preserves_continuity
                        ? <span className="text-green-400">✓ Yes</span>
                        : <span className="text-red-400 font-bold">✗ No</span>}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-400">{item.priority}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
