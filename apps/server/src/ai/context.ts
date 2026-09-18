import type { ApplicationProfile, Evidence } from '@legacymind/shared';

export type AIIntent = 'executive' | 'understanding' | 'dependencies' | 'tests' | 'risks' | 'modernization' | 'document' | 'chat';

const SECRET_PATTERN = /(api[_-]?key|secret|password|token|credential)\s*[:=]\s*[^,\s]+/gi;

function redact(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(SECRET_PATTERN, '$1=[REDACTED SECRET]');
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)]));
  }
  return value;
}

function evidenceFor(profile: ApplicationProfile, entityId?: string): Evidence[] {
  if (!entityId) return profile.findings.slice(0, 8).flatMap(f => f.evidence).slice(0, 16);
  return profile.findings
    .filter(f => f.id === entityId || f.applicationId === entityId || f.moduleIds?.includes(entityId) || f.ruleIds?.includes(entityId))
    .flatMap(f => f.evidence)
    .slice(0, 16);
}

export function buildEvidenceContext(profile: ApplicationProfile, intent: AIIntent, entityId?: string): { context: string; evidence: Evidence[] } {
  const app = profile.application;
  const moduleIds = entityId && profile.modules.some(m => m.module_id === entityId)
    ? new Set([entityId])
    : new Set(profile.modules.map(m => m.module_id));
  const ruleIds = new Set(profile.businessRules.filter(r => moduleIds.has(r.module_id)).map(r => r.rule_id));
  const relevantFindings = profile.findings.filter(f =>
    !entityId || f.id === entityId || f.applicationId === entityId || f.moduleIds?.includes(entityId) || f.ruleIds?.includes(entityId)
  );
  const relevantRecommendations = profile.recommendations.filter(r =>
    !entityId || r.id === entityId || r.affectedApp === entityId || r.relatedModules.includes(entityId) || r.relatedRules.includes(entityId)
  );

  const payload = {
    application: app,
    modules: profile.modules.filter(m => !entityId || moduleIds.has(m.module_id)),
    businessRules: profile.businessRules.filter(r => !entityId || ruleIds.has(r.rule_id) || r.rule_id === entityId),
    dependencies: profile.dependencies.filter(d => !entityId || moduleIds.has(d.source_module_id) || d.target_id === entityId),
    dataStores: profile.dataStores,
    integrations: profile.integrations,
    tests: profile.tests.filter(t => !entityId || moduleIds.has(t.module_id) || ruleIds.has(t.rule_id) || t.test_id === entityId),
    modernizationItems: profile.modernizationItems.filter(m => !entityId || m.module_id === entityId || m.backlog_id === entityId),
    documentationArtifacts: profile.documentationArtifacts,
    findings: relevantFindings.slice(0, 20),
    recommendations: relevantRecommendations.slice(0, 12),
    metrics: profile.metrics,
    intent,
  };

  return { context: JSON.stringify(redact(payload), null, 2).slice(0, 30000), evidence: evidenceFor(profile, entityId) };
}

export function resolveEvidence(profile: ApplicationProfile, ids: string[]): Evidence[] {
  const wanted = new Set(ids);
  return profile.findings
    .filter(f => wanted.has(f.id) || f.moduleIds?.some(id => wanted.has(id)) || f.ruleIds?.some(id => wanted.has(id)))
    .flatMap(f => f.evidence)
    .slice(0, 20);
}
