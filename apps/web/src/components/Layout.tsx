import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Brain, GitBranch, FileText, TestTube,
  Zap, ShieldAlert, Link2, ChevronDown, Upload, Play,
  Loader2, AlertCircle, X, Database
} from 'lucide-react';
import { useApp } from '../hooks/useApp';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/understand', icon: Brain, label: 'Understand' },
  { to: '/dependencies', icon: GitBranch, label: 'Dependencies' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/tests', icon: TestTube, label: 'Tests' },
  { to: '/modernize', icon: Zap, label: 'Modernize' },
  { to: '/risks', icon: ShieldAlert, label: 'Risks' },
  { to: '/traceability', icon: Link2, label: 'Traceability' },
];

function SeverityBadge({ s }: { s: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-900 text-red-200 border-red-700',
    HIGH: 'bg-orange-900 text-orange-200 border-orange-700',
    MEDIUM: 'bg-yellow-900 text-yellow-200 border-yellow-700',
    LOW: 'bg-blue-900 text-blue-200 border-blue-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${colors[s] ?? 'bg-gray-800 text-gray-300 border-gray-600'}`}>
      {s}
    </span>
  );
}

export { SeverityBadge };

export default function Layout({ children }: { children: ReactNode }) {
  const { workbookData, selectedApp, analysisResult, isImporting, isAnalyzing, analyzeProgress, error, importWorkbook, selectApp, analyzeApp, clearError } = useApp();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
              <Brain size={14} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">LegacyMind AI</div>
              <div className="text-xs text-gray-500">Modernization Workspace</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 text-xs text-gray-600 text-center">
          Prove Before You Replace
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-3 shrink-0">
          {/* App selector */}
          <div className="flex items-center gap-2">
            <Database size={14} className="text-gray-500" />
            {workbookData ? (
              <div className="relative group">
                <button className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white bg-gray-800 px-2.5 py-1 rounded border border-gray-700">
                  {selectedApp ? (
                    <><span className="text-blue-400 font-medium">{selectedApp.app_name}</span><span className="text-gray-500 text-xs">({selectedApp.app_id})</span></>
                  ) : (
                    <span className="text-gray-500">Select Application</span>
                  )}
                  <ChevronDown size={12} className="text-gray-500" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded shadow-xl z-50 hidden group-hover:block">
                  {workbookData.applications.map(app => (
                    <button
                      key={app.app_id}
                      onClick={() => { selectApp(app); navigate('/'); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex items-center justify-between"
                    >
                      <span className="text-gray-200">{app.app_name}</span>
                      <span className="text-xs text-gray-500">{app.app_id}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-xs text-gray-600">No dataset loaded</span>
            )}
          </div>

          <div className="flex-1" />

          {/* Status */}
          {analysisResult && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Analyzed {new Date(analysisResult.analyzedAt).toLocaleTimeString()}
            </span>
          )}

          {/* Import */}
          <button
            onClick={importWorkbook}
            disabled={isImporting}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 disabled:opacity-50"
          >
            {isImporting ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {isImporting ? 'Importing...' : 'Import Dataset'}
          </button>

          {/* Analyze */}
          <button
            onClick={analyzeApp}
            disabled={!selectedApp || isAnalyzing || !workbookData}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded disabled:opacity-40 font-medium"
          >
            {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {isAnalyzing ? 'Analyzing...' : 'Analyze Application'}
          </button>
        </header>

        {/* Analysis progress overlay */}
        {isAnalyzing && (
          <div className="bg-gray-900 border-b border-gray-800 px-4 py-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {analyzeProgress.map((step, i) => (
                <span key={i} className="text-xs text-green-400 flex items-center gap-1">
                  <span>✓</span> {step}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-950 border-b border-red-800 px-4 py-2 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <span className="text-sm text-red-300 flex-1">{error}</span>
            <button onClick={clearError}><X size={14} className="text-red-400" /></button>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
