import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { EvidencePanel } from './Understand';
import { AlertTriangle, CheckCircle, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import AIInsightCard from '../components/AIInsightCard';
import WhyButton from '../components/WhyButton';

function ParityBadge({ status }: { status: string }) {
  if (status === 'PASS') return <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={11} />PASS</span>;
  if (status === 'MISMATCH') return <span className="flex items-center gap-1 text-xs text-red-400 font-bold"><AlertTriangle size={11} />MISMATCH</span>;
  return <span className="flex items-center gap-1 text-xs text-gray-500"><HelpCircle size={11} />UNKNOWN</span>;
}

export default function Tests() {
  const { analysisResult, selectedApp } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'PASS' | 'MISMATCH' | 'UNKNOWN'>('all');

  if (!selectedApp) return <div className="p-8 text-center text-gray-500">Select an application.</div>;
  if (!analysisResult) return <div className="p-8 text-center text-gray-500">Run analysis to view test results.</div>;

  const { profile } = analysisResult;
  const { tests, businessRules, metrics } = profile;

  const pass = tests.filter(t => t.parity_status === 'PASS').length;
  const mismatch = tests.filter(t => t.parity_status === 'MISMATCH').length;
  const unknown = tests.filter(t => t.parity_status === 'UNKNOWN').length;

  const filtered = filter === 'all' ? tests : tests.filter(t => t.parity_status === filter);

  const untestedCritical = businessRules.filter(r =>
    (r.criticality?.toLowerCase() === 'high' || r.criticality?.toLowerCase() === 'critical') && !r.has_test_case
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Tests & Parity: {selectedApp.app_name}</h1>
      <AIInsightCard appId={selectedApp.app_id} intent="tests" title="AI Test Coverage Interpretation" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{tests.length}</div>
          <div className="text-xs text-gray-500">Total Tests</div>
        </div>
        <div className="bg-green-950/30 border border-green-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{pass}</div>
          <div className="text-xs text-gray-500">PASS</div>
        </div>
        <div className="bg-red-950/30 border border-red-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{mismatch}</div>
          <div className="text-xs text-gray-500">MISMATCH</div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-400">{unknown}</div>
          <div className="text-xs text-gray-500">UNKNOWN</div>
        </div>
        <div className="bg-orange-950/30 border border-orange-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-400">{metrics.criticalRulesWithoutTests}</div>
          <div className="text-xs text-gray-500">Untested Critical Rules</div>
        </div>
      </div>

      {/* Mismatch alert */}
      {mismatch > 0 && (
        <div className="bg-red-950/30 border border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">
              {mismatch} parity mismatch{mismatch > 1 ? 'es' : ''} detected
            </p>
            <p className="text-xs text-red-400/70 mt-1">
              Expected results differ from legacy results. These must be investigated before modernization.
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'PASS', 'MISMATCH', 'UNKNOWN'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded border ${filter === f ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
          >
            {f === 'all' ? `All (${tests.length})` : f === 'PASS' ? `PASS (${pass})` : f === 'MISMATCH' ? `MISMATCH (${mismatch})` : `UNKNOWN (${unknown})`}
          </button>
        ))}
      </div>

      {/* Test table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500">
              <th className="px-3 py-2 w-6" />
              <th className="px-3 py-2 text-left">Test ID</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Rule</th>
              <th className="px-3 py-2 text-left">Module</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-center">Expected</th>
              <th className="px-3 py-2 text-center">Legacy</th>
              <th className="px-3 py-2 text-center">Parity</th>
              <th className="px-3 py-2 text-left">Last Run</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <>
                <tr
                  key={t.test_id}
                  className={`border-b border-gray-800 hover:bg-gray-900/50 cursor-pointer ${t.parity_status === 'MISMATCH' ? 'bg-red-950/10' : ''}`}
                  onClick={() => setExpanded(expanded === t.test_id ? null : t.test_id)}
                >
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {expanded === t.test_id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-blue-400">{t.test_id}</td>
                  <td className="px-3 py-2 text-xs text-gray-300">{t.test_name}</td>
                  <td className="px-3 py-2 text-xs font-mono text-purple-400">{t.rule_id}</td>
                  <td className="px-3 py-2 text-xs font-mono text-green-400">{t.module_id}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{t.test_type}</td>
                  <td className="px-3 py-2 text-center text-xs text-gray-300">{t.expected_result}</td>
                  <td className="px-3 py-2 text-center text-xs text-gray-300">{t.legacy_result}</td>
                  <td className="px-3 py-2 text-center"><ParityBadge status={t.parity_status} /></td>
                  <td className="px-3 py-2 text-xs text-gray-600">{t.last_run}</td>
                </tr>
                {expanded === t.test_id && (
                  <tr className="bg-gray-950">
                    <td colSpan={10} className="px-6 py-3">
                      <div className="text-xs space-y-2">
                        {t.parity_status === 'MISMATCH' && (
                          <div className="text-red-400 font-medium">
                            ⚠ Parity mismatch: expected "{t.expected_result}" but legacy produced "{t.legacy_result}"
                          </div>
                        )}
                        <EvidencePanel evidence={[
                          { sheet: 'Test_Cases', recordId: t.test_id, field: 'expected_result', value: t.expected_result },
                          { sheet: 'Test_Cases', recordId: t.test_id, field: 'legacy_result', value: t.legacy_result },
                          { sheet: 'Test_Cases', recordId: t.test_id, field: 'parity_status', value: t.parity_status },
                        ]} />
                        <WhyButton appId={selectedApp.app_id} intent="tests" entityId={t.test_id} />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-6 text-gray-600 text-sm">No tests match filter</div>
        )}
      </div>

      {/* Untested critical rules */}
      {analysisResult.aiTestScenarios && analysisResult.aiTestScenarios.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">AI-Generated Parity Scenarios</h2>
          <div className="space-y-2">
            {analysisResult.aiTestScenarios.map(scenario => (
              <div key={`${scenario.ruleId}-${scenario.title}`} className="bg-blue-950/20 border border-blue-900/70 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1"><span className="text-xs font-mono text-blue-300">{scenario.ruleId}</span><span className="text-sm text-gray-200">{scenario.title}</span></div>
                <p className="text-xs text-gray-400">{scenario.scenario}</p>
                <p className="text-xs text-gray-500 mt-1"><span className="text-gray-400">Expected:</span> {scenario.expectedBehavior}</p>
                <p className="text-[10px] text-blue-400 mt-2">{scenario.evidence}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Untested critical rules */}
      {untestedCritical.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-orange-400" />
            Untested Critical Business Rules ({untestedCritical.length})
          </h2>
          <div className="space-y-2">
            {untestedCritical.map(r => (
              <div key={r.rule_id} className="bg-orange-950/20 border border-orange-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-orange-400">{r.rule_id}</span>
                  <span className="text-xs text-gray-500">{r.criticality} criticality</span>
                  <span className="text-xs text-gray-600">Module: {r.module_id}</span>
                </div>
                <p className="text-sm text-gray-300">{r.rule_summary}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Source: Business_Rules → {r.rule_id} · has_test_case = N
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
