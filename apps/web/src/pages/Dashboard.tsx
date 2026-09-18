import { useApp } from '../hooks/useApp';
import { ShieldAlert, Zap, Play, Layers } from 'lucide-react';
import { SeverityBadge } from '../components/Layout';
import AIInsightCard from '../components/AIInsightCard';
import WhyButton from '../components/WhyButton';
import InfoTooltip from '../components/InfoTooltip';

function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'border-sky-200 bg-sky-50',
    red: 'border-red-200 bg-red-50',
    green: 'border-emerald-200 bg-emerald-50',
    yellow: 'border-amber-200 bg-amber-50',
    purple: 'border-cyan-200 bg-cyan-50',
  };
  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="text-2xl font-bold text-[var(--color-primary)]">{value}</div>
      <div className="text-sm text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { workbookData, analysisResult, selectedApp, analyzeApp, isAnalyzing } = useApp();

  if (!workbookData) return null;

  const profile = analysisResult?.profile;
  const metrics = profile?.metrics;

  return (
    <div className="p-6 md:p-8 space-y-7 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-[var(--color-primary)]">Overview</h1><InfoTooltip text="A decision-support summary of the selected application's evidence, risks, tests, and modernization priorities." /></div>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedApp ? `Analysis for ${selectedApp.app_name}` : 'Select an application to begin analysis'}
          </p>
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

      {/* Analysis results */}
      {profile && metrics && (
        <>
          <AIInsightCard appId={profile.application.app_id} intent="executive" title="AI Executive Insight" />
          <div className="border-t border-gray-800 pt-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              Analysis: {profile.application.app_name} <InfoTooltip text="The deterministic analysis is calculated from the imported discovery dataset." />
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
                        <WhyButton appId={profile.application.app_id} intent="risks" entityId={f.id} />
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

      {!selectedApp && (
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
        <ShieldAlert size={12} className="text-green-600" />
        <span>All findings derived from imported dataset. No hardcoded values.</span>
      </div>
    </div>
  );
}
