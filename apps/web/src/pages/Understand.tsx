import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { SeverityBadge } from '../components/Layout';
import { Search, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import type { Finding } from '../types';
import AIInsightCard from '../components/AIInsightCard';
import WhyButton from '../components/WhyButton';

function EvidencePanel({ evidence }: { evidence: Finding['evidence'] }) {
  return (
    <div className="mt-2 space-y-1">
      {evidence.map((e, i) => (
        <div key={i} className="text-xs bg-gray-950 border border-gray-800 rounded px-2 py-1 font-mono">
          <span className="text-blue-400">{e.sheet}</span>
          <span className="text-gray-600"> → </span>
          <span className="text-green-400">{e.recordId}</span>
          {e.field && <><span className="text-gray-600"> · </span><span className="text-yellow-400">{e.field}</span></>}
          {e.value !== undefined && <><span className="text-gray-600"> = </span><span className="text-gray-300">{String(e.value)}</span></>}
        </div>
      ))}
    </div>
  );
}

export { EvidencePanel };

function ModuleRow({ m }: { m: ReturnType<typeof useApp>['analysisResult'] extends null ? never : NonNullable<ReturnType<typeof useApp>['analysisResult']>['profile']['modules'][0] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="border-b border-gray-800 hover:bg-gray-900/50 cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <td className="px-3 py-2 text-xs text-gray-400">{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</td>
        <td className="px-3 py-2 text-sm font-mono text-blue-400">{m.module_id}</td>
        <td className="px-3 py-2 text-sm text-gray-200">{m.module_name}</td>
        <td className="px-3 py-2 text-xs text-gray-400">{m.module_type}</td>
        <td className="px-3 py-2 text-sm text-right">
          <span className={m.cyclomatic_complexity > 30 ? 'text-red-400 font-bold' : m.cyclomatic_complexity > 15 ? 'text-yellow-400' : 'text-green-400'}>
            {m.cyclomatic_complexity}
          </span>
        </td>
        <td className="px-3 py-2 text-sm text-right text-gray-400">{m.lines_of_code.toLocaleString()}</td>
        <td className="px-3 py-2 text-center">
          {m.has_unit_tests ? <span className="text-green-400 text-xs">✓</span> : <span className="text-red-400 text-xs">✗</span>}
        </td>
        <td className="px-3 py-2 text-center">
          {m.is_dead_code ? <span className="text-gray-500 text-xs">💀</span> : <span className="text-gray-700 text-xs">—</span>}
        </td>
        <td className="px-3 py-2 text-center">
          {m.description_present ? <span className="text-green-400 text-xs">✓</span> : <span className="text-yellow-400 text-xs">✗</span>}
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-950">
          <td colSpan={9} className="px-6 py-3">
            <div className="text-xs text-gray-400 space-y-1">
              <div><span className="text-gray-600">Last changed:</span> {m.last_changed} by {m.last_change_author}</div>
              <div className="text-xs text-blue-500 mt-1">Source: Code_Modules → {m.module_id}</div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Understand() {
  const { analysisResult, selectedApp } = useApp();
  const [search, setSearch] = useState('');
  const [ruleSearch, setRuleSearch] = useState('');
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

  if (!selectedApp) {
    return <div className="p-8 text-center text-gray-500">Select an application to view understanding.</div>;
  }
  if (!analysisResult) {
    return <div className="p-8 text-center text-gray-500">Run analysis to generate application understanding.</div>;
  }

  const { profile } = analysisResult;
  const { application: app, modules, businessRules, metrics, findings } = profile;

  const filteredModules = modules.filter(m =>
    m.module_name.toLowerCase().includes(search.toLowerCase()) ||
    m.module_id.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRules = businessRules.filter(r =>
    r.rule_summary.toLowerCase().includes(ruleSearch.toLowerCase()) ||
    r.rule_id.toLowerCase().includes(ruleSearch.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Understand: {app.app_name}</h1>
      <AIInsightCard appId={app.app_id} intent="understanding" title="AI Understanding" />

      {/* App profile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Language', value: app.primary_language },
          { label: 'Platform', value: app.platform },
          { label: 'Domain', value: app.business_domain },
          { label: 'Criticality', value: app.criticality },
          { label: 'Owner', value: app.owner },
          { label: 'Last Deployed', value: app.last_deployed },
          { label: 'Doc Coverage', value: `${app.doc_coverage_pct}%` },
          { label: 'Maint. Cost', value: `€${app.annual_maint_cost_eur.toLocaleString()}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-sm font-medium text-white mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Modules', value: metrics.moduleCount },
          { label: 'Rules', value: metrics.ruleCount },
          { label: 'Dependencies', value: metrics.dependencyCount },
          { label: 'Test Coverage', value: `${metrics.testCoverage}%` },
          { label: 'High Complexity', value: metrics.highComplexityModules },
          { label: 'Critical Findings', value: metrics.criticalFindings },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Key findings */}
      {findings.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Key Findings ({findings.length})</h2>
          <div className="space-y-2">
            {findings.map(f => (
              <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <button
                  className="w-full text-left px-4 py-3 flex items-center gap-3"
                  onClick={() => setExpandedFinding(expandedFinding === f.id ? null : f.id)}
                >
                  <SeverityBadge s={f.severity} />
                  <span className="text-xs text-gray-500 font-mono">{f.type.replace(/_/g, ' ')}</span>
                  <span className="text-sm text-gray-200 flex-1">{f.title}</span>
                  <span className="text-xs text-gray-600">{f.confidence}</span>
                  {expandedFinding === f.id ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
                </button>
                {expandedFinding === f.id && (
                  <div className="px-4 pb-3 border-t border-gray-800">
                    <p className="text-sm text-gray-400 mt-2">{f.description}</p>
                    <EvidencePanel evidence={f.evidence} />
                    <WhyButton appId={app.app_id} intent="understanding" entityId={f.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module inventory */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Module Inventory ({modules.length})</h2>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search modules..."
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 pl-7 text-xs text-gray-300 w-48 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500">
                <th className="px-3 py-2 w-6" />
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Complexity</th>
                <th className="px-3 py-2 text-right">LOC</th>
                <th className="px-3 py-2 text-center">Tests</th>
                <th className="px-3 py-2 text-center">Dead</th>
                <th className="px-3 py-2 text-center">Docs</th>
              </tr>
            </thead>
            <tbody>
              {filteredModules.map(m => <ModuleRow key={m.module_id} m={m} />)}
            </tbody>
          </table>
          {filteredModules.length === 0 && (
            <div className="text-center py-6 text-gray-600 text-sm">No modules match search</div>
          )}
        </div>
      </div>

      {/* Business rules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Business Rules ({businessRules.length})</h2>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={ruleSearch}
              onChange={e => setRuleSearch(e.target.value)}
              placeholder="Search rules..."
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 pl-7 text-xs text-gray-300 w-48 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500">
                <th className="px-3 py-2 text-left">Rule ID</th>
                <th className="px-3 py-2 text-left">Summary</th>
                <th className="px-3 py-2 text-left">Domain</th>
                <th className="px-3 py-2 text-center">Criticality</th>
                <th className="px-3 py-2 text-center">Confidence</th>
                <th className="px-3 py-2 text-center">Tested</th>
                <th className="px-3 py-2 text-left">Duplicate Of</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map(r => (
                <tr key={r.rule_id} className="border-b border-gray-800 hover:bg-gray-900/50">
                  <td className="px-3 py-2 text-xs font-mono text-blue-400">{r.rule_id}</td>
                  <td className="px-3 py-2 text-xs text-gray-300 max-w-xs">{r.rule_summary}</td>
                  <td className="px-3 py-2 text-xs text-gray-400">{r.business_domain}</td>
                  <td className="px-3 py-2 text-center"><SeverityBadge s={r.criticality?.toUpperCase()} /></td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs ${r.extraction_confidence < 0.7 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {(r.extraction_confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.has_test_case
                      ? <span className="text-green-400 text-xs">✓</span>
                      : <span className="text-red-400 text-xs flex items-center justify-center gap-1"><AlertTriangle size={10} />No</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-yellow-400 font-mono">{r.duplicate_of || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
