import type { AIChatMessage, AIChatResponse, AIInsight, AIClaim, ApplicationProfile, AIViewMode } from '@legacymind/shared';
import { buildEvidenceContext, resolveEvidence, type AIIntent } from './context.js';
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

function cacheKey(profile: ApplicationProfile, intent: AIIntent, mode: AIViewMode, entityId?: string, question?: string): string {
  const fingerprint = createHash('sha256').update(JSON.stringify({
    application: profile.application,
    modules: profile.modules.map(m => [m.module_id, m.last_changed, m.has_unit_tests]),
    rules: profile.businessRules.map(r => [r.rule_id, r.has_test_case, r.extraction_confidence]),
    findings: profile.findings.map(f => [f.id, f.severity, f.evidence]),
    recommendations: profile.recommendations.map(r => [r.id, r.priority, r.riskScore]),
  })).digest('hex').slice(0, 16);
  return `${profile.application.app_id}:${fingerprint}:${intent}:${mode}:${entityId ?? ''}:${question ?? ''}`;
}

function normalizeClaims(claims: unknown, profile: ApplicationProfile): AIClaim[] {
  if (!Array.isArray(claims)) return [];
  return claims.filter((claim): claim is AIClaim => {
    if (!claim || typeof claim !== 'object') return false;
    const item = claim as AIClaim;
    return typeof item.text === 'string' && ['FACT', 'FINDING', 'INTERPRETATION', 'RECOMMENDATION'].includes(item.kind) && Array.isArray(item.evidenceIds);
  }).map(claim => ({ ...claim, evidenceIds: resolveEvidence(profile, claim.evidenceIds).map(e => e.recordId) }));
}

export async function generateInsight(profile: ApplicationProfile, provider: AIProvider, intent: AIIntent, entityId?: string, mode: AIViewMode = 'technical'): Promise<AIInsight> {
  const key = cacheKey(profile, intent, mode, entityId);
  const existing = cached<AIInsight>(key);
  if (existing) return existing;
  const { context, evidence } = buildEvidenceContext(profile, intent, entityId, mode);
  const modeInstruction = mode === 'executive'
    ? 'Use plain business-friendly language. Avoid implementation jargon and do not invent business impact.'
    : 'Use implementation-oriented language and include relationships, dependency, testing, and migration implications.';
  const prompt = `${BASE_PROMPT}\n${modeInstruction}\n\nPROJECT EVIDENCE:\n${context}\n\nCreate a ${intent} insight for ${entityId ?? profile.application.app_id}.
Return this exact JSON shape. Claims must cite actual IDs from the evidence context and distinguish FACT, FINDING, INTERPRETATION, and RECOMMENDATION:
{"title":"...","severity":"CRITICAL|HIGH|MEDIUM|LOW|INFO","summary":"...","whyItMatters":"...","businessImpact":"...","technicalImpact":"...","continuityImpact":"...","recommendedAction":"...","confidence":"HIGH|MEDIUM|LOW","claims":[{"text":"...","kind":"FACT|FINDING|INTERPRETATION|RECOMMENDATION","evidenceIds":["..."]}]}`;
  const result = await provider.generateStructured<Omit<AIInsight, 'evidence' | 'mode' | 'claims'> & { claims?: unknown }>(prompt);
  return store(key, { ...result, evidence, mode, claims: normalizeClaims(result.claims, profile) } as AIInsight);
}

export async function chat(profile: ApplicationProfile, provider: AIProvider, message: string, history: AIChatMessage[] = [], followUpContext?: string, mode: AIViewMode = 'technical'): Promise<AIChatResponse> {
  const boundedHistory = history.slice(-6);
  const key = cacheKey(profile, 'chat', mode, undefined, `${message}:${JSON.stringify(boundedHistory)}`);
  const existing = cached<AIChatResponse>(key);
  if (existing) return existing;
  const { context, evidence } = buildEvidenceContext(profile, 'chat', undefined, mode);
  const prompt = `${BASE_PROMPT}\nUse ${mode === 'executive' ? 'plain business-friendly' : 'technical implementation-oriented'} language.\n\nPROJECT EVIDENCE:\n${context}\n\nCONVERSATION:\n${JSON.stringify(boundedHistory)}\n\nPrevious context: ${followUpContext ?? 'none'}\nUser question: ${message}\n\nReturn JSON: {"answer":"Use short sections: Summary, Why it matters, Evidence, Recommended next step.","confidence":"HIGH|MEDIUM|LOW","followUpContext":"short context for the next question","claims":[{"text":"...","kind":"FACT|FINDING|INTERPRETATION|RECOMMENDATION","evidenceIds":["..."]}]}`;
  const result = await provider.generateStructured<Omit<AIChatResponse, 'evidence' | 'mode' | 'claims'> & { claims?: unknown }>(prompt);
  return store(key, { ...result, evidence, mode, claims: normalizeClaims(result.claims, profile) } as AIChatResponse);
}

export function projectAIState(provider: AIProvider) {
  return provider.isAvailable()
    ? { available: true, provider: provider.name() }
    : { available: false, provider: provider.name(), message: 'AI insights are currently unavailable. Configure VW LLMaaS on the server.' };
}
