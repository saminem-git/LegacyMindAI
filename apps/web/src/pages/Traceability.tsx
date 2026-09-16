import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { EvidencePanel } from './Understand';
import { Search } from 'lucide-react';

export default function Traceability() {
  const { analysisResult, selectedApp } = useApp();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'findings' | 'recommendations' | 'tests'>('findings');

  if (!selectedApp) return <div className="p-8 text-center text-gray-500">Select an application.</div>;
  if (!analysisResult) return <div className="p-8 text-center text-gray-500">Run analysis to view traceability.</div>;

  const { profile } = analysisResult;
  const q = search.toLowerCase();

  const filteredFindings = profile.findings.filter(f =>
    !q || f.title.toLowerCase().includes(q) || f.type.toLowerCase().includes(q) ||
    f.evidence.some(e => e.recordId.toLowerCase().includes(q) || e.sheet.toLowerCase().includes(q))
  );

  const filteredRecs = profile.recommendations.filter(r =>
    !q || r.title.toLowerCase().includes(q) ||
    r.evidence.some(e => e.recordId.toLowerCase().includes(q))
  );

  const filteredTests = profile.tests.filter(t =>
    !q || t.test_id.toLowerCase().includes(q) || t.rule_id.toLowerCase().includes(q) ||
    t.test_name.toLowerCase().includes(q)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Traceability: {selectedApp.app_name}</h1>
          <p className="text-xs text-gray-500 mt-0.5">Every finding, recommendation, and test traced back to source evidence.</p>
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search evidence..."
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 pl-7 text-xs text-gray-300 w-56 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        {([
          { key: 'findings', label: `Findings (${filteredFindings.length})` },
          { key: 'recommendations', label: `Recommendations (${filteredRecs.length})` },
          { key: 'tests', label: `Tests (${filteredTests.length})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${activeTab === key ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Findings trace */}
      {activeTab === 'findings' && (
        <div className="space-y-3">
          {filteredFindings.map(f => (
            <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-600">{f.id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${f.severity === 'CRITICAL' ? 'bg-red-900 text-red-300' : f.severity === 'HIGH' ? 'bg-orange-900 text-orange-300' : 'bg-gray-800 text-gray-400'}`}>{f.severity}</span>
                    <span className="text-xs text-gray-600">{f.type.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-200">{f.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>
                </div>
              </div>
              <div className="border-t border-gray-800 pt-3">
                <div className="text-xs text-gray-500 mb-2 font-medium">↓ Source Evidence</div>
                <EvidencePanel evidence={f.evidence} />
              </div>
              {(f.moduleIds?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-xs text-gray-600">Modules:</span>
                  {f.moduleIds!.map(m => <span key={m} className="text-xs font-mono text-green-400 bg-gray-800 px-1.5 py-0.5 rounded">{m}</span>)}
                </div>
              )}
            </div>
          ))}
          {filteredFindings.length === 0 && <div className="text-center py-8 text-gray-600 text-sm">No findings match search.</div>}
        </div>
      )}

      {/* Recommendations trace */}
      {activeTab === 'recommendations' && (
        <div className="space-y-3">
          {filteredRecs.map(r => (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-600">{r.id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${r.priority === 'CRITICAL' ? 'bg-red-900 text-red-300' : r.priority === 'HIGH' ? 'bg-orange-900 text-orange-300' : 'bg-gray-800 text-gray-400'}`}>{r.priority}</span>
                    <span className="text-xs text-gray-600">{r.roadmapPhase}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-200">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.rationale}</p>
                </div>
              </div>
              <div className="border-t border-gray-800 pt-3">
                <div className="text-xs text-gray-500 mb-2 font-medium">↓ Source Evidence</div>
                <EvidencePanel evidence={r.evidence} />
              </div>
              {r.relatedModules.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-xs text-gray-600">Modules:</span>
                  {r.relatedModules.map(m => <span key={m} className="text-xs font-mono text-green-400 bg-gray-800 px-1.5 py-0.5 rounded">{m}</span>)}
                </div>
              )}
              {r.relatedRules.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-xs text-gray-600">Rules:</span>
                  {r.relatedRules.map(ru => <span key={ru} className="text-xs font-mono text-purple-400 bg-gray-800 px-1.5 py-0.5 rounded">{ru}</span>)}
                </div>
              )}
            </div>
          ))}
          {filteredRecs.length === 0 && <div className="text-center py-8 text-gray-600 text-sm">No recommendations match search.</div>}
        </div>
      )}

      {/* Tests trace */}
      {activeTab === 'tests' && (
        <div className="space-y-3">
          {filteredTests.map(t => (
            <div key={t.test_id} className={`bg-gray-900 border rounded-lg p-4 ${t.parity_status === 'MISMATCH' ? 'border-red-800' : 'border-gray-800'}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-blue-400">{t.test_id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${t.parity_status === 'PASS' ? 'bg-green-900 text-green-300' : t.parity_status === 'MISMATCH' ? 'bg-red-900 text-red-300' : 'bg-gray-800 text-gray-400'}`}>
                      {t.parity_status}
                    </span>
                    <span className="text-xs text-gray-600">{t.test_type}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-200">{t.test_name}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>Rule: <span className="text-purple-400 font-mono">{t.rule_id}</span></span>
                    <span>Module: <span className="text-green-400 font-mono">{t.module_id}</span></span>
                    <span>Expected: <span className="text-gray-300">{t.expected_result}</span></span>
                    <span>Legacy: <span className={t.parity_status === 'MISMATCH' ? 'text-red-400 font-bold' : 'text-gray-300'}>{t.legacy_result}</span></span>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-800 pt-3">
                <div className="text-xs text-gray-500 mb-2 font-medium">↓ Source Evidence</div>
                <EvidencePanel evidence={[
                  { sheet: 'Test_Cases', recordId: t.test_id, field: 'parity_status', value: t.parity_status },
                  { sheet: 'Test_Cases', recordId: t.test_id, field: 'expected_result', value: t.expected_result },
                  { sheet: 'Test_Cases', recordId: t.test_id, field: 'legacy_result', value: t.legacy_result },
                  { sheet: 'Business_Rules', recordId: t.rule_id },
                  { sheet: 'Code_Modules', recordId: t.module_id },
                ]} />
              </div>
            </div>
          ))}
          {filteredTests.length === 0 && <div className="text-center py-8 text-gray-600 text-sm">No tests match search.</div>}
        </div>
      )}
    </div>
  );
}
