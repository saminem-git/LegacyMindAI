import { type ReactNode, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Brain, GitBranch, FileText, TestTube, MessageSquare, Network,
  Zap, ShieldAlert, Link2, ChevronDown, Upload, Play,
  Loader2, AlertCircle, X, Database, Menu, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useApp } from '../hooks/useApp';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/understand', icon: Brain, label: 'Understand' },
  { to: '/dependencies', icon: GitBranch, label: 'Dependencies' },
  { to: '/architecture', icon: Network, label: 'Architecture' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/tests', icon: TestTube, label: 'Tests' },
  { to: '/modernize', icon: Zap, label: 'Modernize' },
  { to: '/risks', icon: ShieldAlert, label: 'Risks' },
  { to: '/traceability', icon: Link2, label: 'Traceability' },
  { to: '/assistant', icon: MessageSquare, label: 'AI Assistant' },
];

function SeverityBadge({ s }: { s: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-50 text-red-700 border-red-200',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('legacymind_sidebar_collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(value => { const next = !value; localStorage.setItem('legacymind_sidebar_collapsed', String(next)); return next; });
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importWorkbook(file);
    e.target.value = '';
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-slate-950/30 md:hidden" />}
      <aside className={`fixed md:relative z-50 h-full ${collapsed ? 'md:w-[72px]' : 'md:w-60'} w-72 bg-[var(--lm-deep-space-blue)] text-white border-r border-white/10 flex flex-col shrink-0 transition-all duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className={`p-4 border-b border-gray-800 ${collapsed ? 'md:px-3' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center shrink-0 shadow-lg">
              <Brain size={14} className="text-[var(--lm-electric-neon)]" />
            </div>
            {!collapsed && <div>
              <div className="text-sm font-bold text-white leading-tight">LegacyMind AI</div>
              <div className="text-[11px] text-gray-500">Modernization intelligence</div>
            </div>}
          </div>
        </div>

        <nav className={`flex-1 p-3 space-y-1 overflow-y-auto ${collapsed ? 'md:px-2' : ''}`} aria-label="Primary navigation">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${collapsed ? 'md:justify-center md:px-0' : ''} ${isActive
                  ? 'bg-[var(--color-primary)] text-white shadow-sm before:block before:w-1 before:h-5 before:bg-[var(--lm-electric-neon)] before:rounded-full'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`
              }
              title={collapsed ? label : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={15} />
              <span className={collapsed ? 'md:hidden' : ''}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 text-xs text-gray-600 text-center">
          {!collapsed && 'Evidence before replacement'}
          <button type="button" onClick={toggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="hidden md:flex mx-auto mt-2 items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-800 text-gray-500">
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="min-h-14 bg-[var(--lm-deep-space-blue)] text-white border-b border-white/10 flex items-center px-4 gap-3 shrink-0">
          <button type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="md:hidden w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-gray-800"><Menu size={18} /></button>
          {/* App selector */}
          <div className="flex items-center gap-2 min-w-0">
            <Database size={14} className="text-gray-500" />
            {workbookData ? (
              <div className="relative group">
                <button aria-label="Select application" className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white bg-gray-800 px-2.5 py-2 rounded-lg border border-gray-700 max-w-[42vw]">
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
              <span className="w-1.5 h-1.5 bg-[var(--lm-vivid-green)] rounded-full" />
              Analyzed {new Date(analysisResult.analyzedAt).toLocaleTimeString()}
            </span>
          )}

          {/* Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileSelected}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 disabled:opacity-50"
          >
            {isImporting ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {isImporting ? 'Importing...' : 'Import Dataset'}
          </button>

          {/* Analyze */}
          <button
            onClick={analyzeApp}
            disabled={!selectedApp || isAnalyzing || !workbookData}
            className="flex items-center gap-1.5 text-xs px-3 py-2 bg-[var(--color-vw-blue)] hover:bg-[var(--color-primary)] text-white rounded-lg disabled:opacity-40 font-medium"
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
        <main className="flex-1 overflow-auto page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
