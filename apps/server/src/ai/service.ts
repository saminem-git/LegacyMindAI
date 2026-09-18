import type { AIChatMessage, AIChatResponse, AIInsight, ApplicationProfile, Evidence } from '@legacymind/shared';
import { buildEvidenceContext, type AIIntent } from './context.js';
import type { AIProvider } from './provider.js';
import { createHash } from 'node:crypto';

const BASE_PROMPT = `You are the project-aware LegacyMind modernization analyst.
Use ONLY the supplied project evidence. The dataset and deterministic findings are the source of truth.
Never invent IDs, metrics, relationships, statuses, risks, or behavior. When evidence is insufficient, say exactly: "Insufficient project evidence to determine this."
Keep answers concise and actionable. Preserve the distinction between fact, deterministic finding, AI interpretation, and recommendation.
Return valid JSON only.`;

const cache = new Map<string, unknown>();
const MAX_CACHE = 100;

function cached<T>(key: string): T | undefined { return cache.get(key) as T | undefined; }
function store<T>(key: string, value: T): T {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
  return value;
}

function cacheKey(profile: ApplicationProfile, intent: AIIntent, entityId?: string, question?: string): string {
  const fingerprint = createHash('sha256').update(JSON.stringify({
    application: profile.application,
    modules: profile.modules.map(m => [m.module_id, m.last_changed, m.has_unit_tests]),
    rules: profile.businessRules.map(r => [r.rule_id, r.has_test_case, r.extraction_confidence]),
    findings: profile.findings.map(f => [f.id, f.severity, f.evidence]),
    recommendations: profile.recommendations.map(r => [r.id, r.priority, r.riskScore]),
  })).digest('hex').slice(0, 16);
  return `${profile.application.app_id}:${fingerprint}:${intent}:${entityId ?? ''}:${question ?? ''}`;
}

export async function generateInsight(profile: ApplicationProfile, provider: AIProvider, intent: AIIntent, entityId?: string): Promise<AIInsight> {
  const key = cacheKey(profile, intent, entityId);
  const existing = cached<AIInsight>(key);
  if (existing) return existing;
  const { context, evidence } = buildEvidenceContext(profile, intent, entityId);
  const prompt = `${BASE_PROMPT}\n\nPROJECT EVIDENCE:\n${context}\n\nCreate a ${intent} insight for ${entityId ?? profile.application.app_id}.
Return this exact JSON shape:
{"title":"...","severity":"CRITICAL|HIGH|MEDIUM|LOW|INFO","summary":"...","whyItMatters":"...","businessImpact":"...","technicalImpact":"...","continuityImpact":"...","recommendedAction":"...","confidence":"HIGH|MEDIUM|LOW"}`;
  const result = await provider.generateStructured<Omit<AIInsight, 'evidence'>>(prompt);
  return store(key, { ...result, evidence } as AIInsight);
}

export async function chat(profile: ApplicationProfile, provider: AIProvider, message: string, history: AIChatMessage[] = [], followUpContext?: string): Promise<AIChatResponse> {
  const boundedHistory = history.slice(-6);
  const key = cacheKey(profile, 'chat', undefined, `${message}:${JSON.stringify(boundedHistory)}`);
  const existing = cached<AIChatResponse>(key);
  if (existing) return existing;
  const { context, evidence } = buildEvidenceContext(profile, 'chat');
  const prompt = `${BASE_PROMPT}\n\nPROJECT EVIDENCE:\n${context}\n\nCONVERSATION:\n${JSON.stringify(boundedHistory)}\n\nPrevious context: ${followUpContext ?? 'none'}\nUser question: ${message}\n\nReturn JSON: {"answer":"Use short Markdown sections: Summary, Why it matters, Evidence, Recommended next step.","confidence":"HIGH|MEDIUM|LOW","followUpContext":"short context for the next question"}`;
  const result = await provider.generateStructured<Omit<AIChatResponse, 'evidence'>>(prompt);
  return store(key, { ...result, evidence } as AIChatResponse);
}

export function projectAIState(provider: AIProvider) {
  return provider.isAvailable()
    ? { available: true, provider: provider.name() }
    : { available: false, provider: provider.name(), message: 'AI insights are currently unavailable. Configure VW LLMaaS on the server.' };
}
