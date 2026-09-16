import { useApp } from '../hooks/useApp';
import { AlertTriangle, CheckCircle, GitBranch, FileText, Layers, ShieldAlert, Zap, Upload, Play } from 'lucide-react';
import { SeverityBadge } from '../components/Layout';

function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-800 bg-blue-950/30',
    red: 'border-red-800 bg-red-950/30',
    green: 'border-green-800 bg-green-950/30',
    yellow: 'border-yellow-800 bg-yellow-950/30',
    purple: 'border-purple-800 bg-purple-950/30',
  };
  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { workbookData, analysisResult, selectedApp, importWorkbook, analyzeApp, isImporting, isAnalyzing } = useApp();

  if (!workbookData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
        <div className="w-16 h-16 bg-blue-900/40 rounded-full flex items-center justify-center">
          <Upload size={28} className="text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Welcome to LegacyMind AI</h2>
          <p className="text-gray-400 text-sm max-w-md">
            Import your legacy application discovery dataset to begin analysis.
            <br />
            <span className="text-gray-600 text-xs mt-1 block italic">"Understand what exists. Prove what matters. Modernize with confidence."</span>
          </p>
        </div>
        <button
          onClick={importWorkbook}
          disabled={isImporting}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium disabled:opacity-50"
        >
          <Upload size={16} />
          {isImporting ? 'Importing...' : 'Import Dataset'}
        </button>
      </div>
    );
  }

  const { importSummary } = workbookData;
  const profile = analysisResult?.profile;
  const metrics = profile?.metrics;

  const criticalApps = workbookData.applications.filter(a =>
    a.criticality?.toLowerCase() === 'critical' || a.criticality?.toLowerCase() === 'high'
  ).length;

  const totalTests = workbookData.tests.length;
  const passTests = workbookData.tests.filter(t => t.parity_status === 'PASS').length;
  const mismatchTests = workbookData.tests.filter(t => t.parity_status === 'MISMATCH').length;
  const avgDoc = workbookData.applications.length > 0
    ? Math.round(workbookData.applications.reduce((s, a) => s + a.doc_coverage_pct, 0) / workbookData.applications.length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Legacy application modernization workspace</p>
        </div>
        {selectedApp && !analysisResult && (
          <button
            onClick={analyzeApp}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Play size={14} />
            Analyze {selectedApp.app_name}
          </button>
        )}
      </div>

      {/* Dataset stats */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dataset</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <StatCard label="Applications" value={importSummary.applications} color="blue" />
          <StatCard label="Critical/High Apps" value={criticalApps} color="red" />
          <StatCard label="Code Modules" value={importSummary.modules} color="purple" />
          <StatCard label="Business Rules" value={importSummary.businessRules} color="yellow" />
          <StatCard label="Dependencies" value={importSummary.dependencies} color="blue" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Test Cases" value={totalTests} sub={`${passTests} PASS · ${mismatchTests} MISMATCH`} color="green" />
        <StatCard label="Avg Doc Coverage" value={`${avgDoc}%`} color={avgDoc < 30 ? 'red' : 'green'} />
        <StatCard label="Integrations" value={importSummary.integrations} color="blue" />
        <StatCard label="Data Stores" value={importSummary.dataStores} color="purple" />
      </div>

      {/* Import warnings */}
      {importSummary.warnings.length > 0 && (
        <div className="bg-yellow-950/30 border border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-yellow-400" />
            <span className="text-sm font-medium text-yellow-300">Import Warnings ({importSummary.warnings.length})</span>
          </div>
          <ul className="space-y-1">
            {importSummary.warnings.slice(0, 5).map((w, i) => (
              <li key={i} className="text-xs text-yellow-400/80">• {w}</li>
            ))}
            {importSummary.warnings.length > 5 && (
              <li className="text-xs text-yellow-600">...and {importSummary.warnings.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Analysis results */}
      {profile && metrics && (
        <>
          <div className="border-t border-gray-800 pt-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Analysis: {profile.application.app_name}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Critical Findings" value={metrics.criticalFindings} color="red" />
              <StatCard label="Test Coverage" value={`${metrics.testCoverage}%`} color={metrics.testCoverage < 50 ? 'red' : 'green'} />
              <StatCard label="High Complexity Modules" value={metrics.highComplexityModules} color="yellow" />
              <StatCard label="Continuity Risks" value={metrics.continuityRisks} color="red" />
            </div>
          </div>

          {/* Critical findings */}
          {profile.findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Critical Findings</h2>
              <div className="space-y-2">
                {profile.findings
                  .filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH')
                  .slice(0, 6)
                  .map(f => (
                    <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-start gap-3">
                      <ShieldAlert size={14} className={f.severity === 'CRITICAL' ? 'text-red-400 mt-0.5 shrink-0' : 'text-orange-400 mt-0.5 shrink-0'} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <SeverityBadge s={f.severity} />
                          <span className="text-xs text-gray-500">{f.type.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="text-sm text-gray-200 mt-1">{f.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{f.description}</p>
                        {f.evidence[0] && (
                          <p className="text-xs text-blue-500 mt-1">
                            Source: {f.evidence[0].sheet} → {f.evidence[0].recordId}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Top recommendations */}
          {profile.recommendations.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Modernization Priorities</h2>
              <div className="space-y-2">
                {profile.recommendations.slice(0, 4).map(r => (
                  <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-start gap-3">
                    <Zap size={14} className="text-blue-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityBadge s={r.priority} />
                        <span className="text-xs text-gray-500">{r.roadmapPhase}</span>
                        <span className="text-xs text-gray-600">Risk score: {r.riskScore}</span>
                      </div>
                      <p className="text-sm text-gray-200 mt-1">{r.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.rationale}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* No analysis yet */}
      {!profile && selectedApp && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Layers size={20} className="text-gray-600" />
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Application <span className="text-white font-medium">{selectedApp.app_name}</span> selected. Run analysis to generate findings.
          </p>
          <button
            onClick={analyzeApp}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium mx-auto disabled:opacity-50"
          >
            <Play size={14} />
            Analyze Application
          </button>
        </div>
      )}

      {!selectedApp && workbookData && (
        <div className="bg-gray-900 border border-dashed border-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-500 text-sm">Select an application from the top bar to begin analysis.</p>
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {workbookData.applications.map(a => (
              <span key={a.app_id} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded border border-gray-700">
                {a.app_name} <span className="text-gray-600">({a.app_id})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent analyses */}
      <div className="flex items-center gap-2 text-xs text-gray-600 pt-2 border-t border-gray-800">
        <CheckCircle size={12} className="text-green-600" />
        <span>All findings derived from imported dataset. No hardcoded values.</span>
        <GitBranch size={12} className="text-gray-700 ml-2" />
        <FileText size={12} className="text-gray-700" />
      </div>
    </div>
  );
}
