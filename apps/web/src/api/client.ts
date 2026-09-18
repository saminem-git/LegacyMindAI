import type { WorkbookData, AnalysisResult, Application, AIChatMessage, AIChatResponse, AIInsight } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  importWorkbook: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ success: boolean; summary: WorkbookData['importSummary'] }>('/workbook/import', {
      method: 'POST',
      body: formData,
    });
  },

  getWorkbookData: () =>
    request<WorkbookData>('/workbook/data'),

  getApplications: () =>
    request<Application[]>('/workbook/applications'),

  analyzeApp: (appId: string) =>
    request<{ success: boolean; result: AnalysisResult; aiSummary?: unknown; aiTestScenarios?: unknown[] }>(
      `/analysis/${appId}`, { method: 'POST' }
    ),

  getAnalysis: (appId: string) =>
    request<AnalysisResult>(`/analysis/${appId}`),

  listAnalyses: () =>
    request<{ id: string; app_id: string; analyzed_at: string }[]>('/analysis/'),

  getAIInsight: (appId: string, intent: string, entityId?: string) =>
    request<AIInsight>(`/ai/${appId}/insight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, entityId }),
    }),

  chatAI: (appId: string, message: string, history: AIChatMessage[], followUpContext?: string) =>
    request<AIChatResponse>(`/ai/${appId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, followUpContext }),
    }),
};
