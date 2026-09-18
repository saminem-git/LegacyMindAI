import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Application, AnalysisResult, WorkbookData } from '../types';
import { api } from '../api/client';

interface AppState {
  workbookData: WorkbookData | null;
  selectedApp: Application | null;
  analysisResult: AnalysisResult | null;
  isImporting: boolean;
  isAnalyzing: boolean;
  analyzeProgress: string[];
  error: string | null;
  importWorkbook: (file: File) => Promise<void>;
  selectApp: (app: Application) => void;
  analyzeApp: () => Promise<void>;
  clearError: () => void;
}

const AppContext = createContext<AppState | null>(null);

const PIPELINE_STEPS = [
  'Loading dataset...',
  'Validating records...',
  'Resolving relationships...',
  'Building knowledge graph...',
  'Analyzing architecture...',
  'Detecting findings...',
  'Calculating test coverage...',
  'Evaluating parity...',
  'Generating documentation...',
  'Building modernization plan...',
  'Building traceability...',
  'Saving analysis result...',
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [workbookData, setWorkbookData] = useState<WorkbookData | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(() => {
    const saved = localStorage.getItem('legacymind_selected_app');
    return saved ? JSON.parse(saved) as Application : null;
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const importWorkbook = useCallback(async (file: File) => {
    setIsImporting(true);
    setError(null);
    try {
      await api.importWorkbook(file);
      const data = await api.getWorkbookData();
      setWorkbookData(data);
      // Try to restore last analysis if selected app still valid
      if (selectedApp) {
        const stillExists = data.applications.find(a => a.app_id === selectedApp.app_id);
        if (!stillExists) {
          setSelectedApp(null);
          localStorage.removeItem('legacymind_selected_app');
        } else {
          try {
            const result = await api.getAnalysis(selectedApp.app_id);
            setAnalysisResult(result);
          } catch { /* no prior analysis */ }
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsImporting(false);
    }
  }, [selectedApp]);

  const selectApp = useCallback((app: Application) => {
    setSelectedApp(app);
    setAnalysisResult(null);
    localStorage.setItem('legacymind_selected_app', JSON.stringify(app));
    // Try to load existing analysis
    api.getAnalysis(app.app_id).then(setAnalysisResult).catch(() => {});
  }, []);

  const analyzeApp = useCallback(async () => {
    if (!selectedApp) return;
    setIsAnalyzing(true);
    setAnalyzeProgress([]);
    setError(null);

    // Simulate pipeline progress
    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 200));
      setAnalyzeProgress(prev => [...prev, PIPELINE_STEPS[i]]);
    }

    try {
      const res = await api.analyzeApp(selectedApp.app_id);
      setAnalysisResult(res.result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedApp]);

  return (
    <AppContext.Provider value={{
      workbookData, selectedApp, analysisResult,
      isImporting, isAnalyzing, analyzeProgress, error,
      importWorkbook, selectApp, analyzeApp, clearError: () => setError(null),
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
