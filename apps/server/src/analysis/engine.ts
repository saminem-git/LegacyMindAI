import type {
  WorkbookData, ApplicationProfile, Finding, Recommendation,
  GraphNode, GraphEdge, Evidence, CodeModule, BusinessRule,
  DataStore, Integration, Dependency, TestCase, ModernizationItem
} from '@legacymind/shared';

// Risk scoring weights
const WEIGHTS = {
  criticality: { Critical: 40, High: 30, Medium: 20, Low: 10 },
  complexity: { high: 20, medium: 10, low: 0 },
  noTests: 15,
  deadCode: 5,
  runtimeCriticalDep: 10,
  noContinuity: 20,
  piiStore: 10,
  lowConfidenceRule: 5,
};

function ev(sheet: string, recordId: string, field?: string, value?: unknown): Evidence {
  return { sheet, recordId, field, value };
}

// DFS cycle detection
function detectCycles(deps: Dependency[], moduleIds: Set<string>): string[][] {
  const adj = new Map<string, string[]>();
  for (const d of deps) {
    if (d.target_type === 'Module' && moduleIds.has(d.target_id)) {
      if (!adj.has(d.source_module_id)) adj.set(d.source_module_id, []);
      adj.get(d.source_module_id)!.push(d.target_id);
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    inStack.add(node);
    for (const neighbor of adj.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      } else if (inStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        } else {
          cycles.push([...path, neighbor]);
        }
      }
    }
    inStack.delete(node);
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) dfs(node, [node]);
  }
  return cycles;
}

function detectOrphans(deps: Dependency[], moduleIds: Set<string>): Dependency[] {
  return deps.filter(d => d.target_type === 'Module' && !moduleIds.has(d.target_id));
}

export function analyzeApplication(appId: string, data: WorkbookData): ApplicationProfile {
  const app = data.applications.find(a => a.app_id === appId);
  if (!app) throw new Error(`Application ${appId} not found`);

  const modules = data.modules.filter(m => m.app_id === appId);
  const moduleIds = new Set(data.modules.map(m => m.module_id));
  const appModuleIds = new Set(modules.map(m => m.module_id));

  const businessRules = data.businessRules.filter(r => appModuleIds.has(r.module_id));
  const ruleIds = new Set(businessRules.map(r => r.rule_id));

  const dependencies = data.dependencies.filter(d => appModuleIds.has(d.source_module_id));
  const dataStores = data.dataStores.filter(d => d.owning_app_id === appId);
  const integrations = data.integrations.filter(i => i.app_id === appId);
  const tests = data.tests.filter(t => ruleIds.has(t.rule_id) || appModuleIds.has(t.module_id));
  const modernizationItems = data.modernizationItems.filter(m => m.app_id === appId);
  const documentationArtifacts = data.documentationArtifacts.filter(d => d.app_id === appId);

  const findings: Finding[] = [];
  let findingIdx = 0;
  const fid = () => `F-${appId}-${String(++findingIdx).padStart(3, '0')}`;

  // Cycle detection
  const cycles = detectCycles(dependencies, moduleIds);
  if (cycles.length > 0) {
    for (const cycle of cycles) {
      findings.push({
        id: fid(),
        type: 'CIRCULAR_DEPENDENCY',
        severity: 'HIGH',
        title: `Circular dependency detected: ${cycle.join(' → ')}`,
        description: `Modules form a circular dependency chain. This prevents safe independent deployment and increases coupling risk.`,
        applicationId: appId,
        moduleIds: cycle,
        ruleIds: [],
        evidence: cycle.map(mid => {
          const dep = dependencies.find(d => d.source_module_id === mid && cycle.includes(d.target_id));
          return ev('Dependencies', dep?.dependency_id ?? mid, 'source_module_id', mid);
        }),
        confidence: 'HIGH',
      });
    }
  }

  // Orphan detection
  const orphans = detectOrphans(dependencies, moduleIds);
  for (const o of orphans) {
    findings.push({
      id: fid(),
      type: 'ORPHAN_DEPENDENCY',
      severity: 'MEDIUM',
      title: `Orphan dependency: ${o.dependency_id} targets missing ${o.target_id}`,
      description: `Dependency ${o.dependency_id} from ${o.source_module_id} references ${o.target_id} which does not exist in the known module inventory.`,
      applicationId: appId,
      moduleIds: [o.source_module_id],
      ruleIds: [],
      evidence: [ev('Dependencies', o.dependency_id, 'target_id', o.target_id)],
      confidence: 'HIGH',
    });
  }

  // Critical rules without tests
  const testedRuleIds = new Set(tests.map(t => t.rule_id));
  const criticalUntested = businessRules.filter(
    r => r.criticality?.toLowerCase() === 'high' || r.criticality?.toLowerCase() === 'critical'
  ).filter(r => !r.has_test_case && !testedRuleIds.has(r.rule_id));

  for (const r of criticalUntested) {
    findings.push({
      id: fid(),
      type: 'CRITICAL_RULE_NO_TEST',
      severity: 'CRITICAL',
      title: `Critical rule without test: ${r.rule_id}`,
      description: `Business rule "${r.rule_summary}" is marked ${r.criticality} criticality but has no test coverage. Modernization without tests risks undetected behavioral regression.`,
      applicationId: appId,
      moduleIds: [r.module_id],
      ruleIds: [r.rule_id],
      evidence: [ev('Business_Rules', r.rule_id, 'has_test_case', 'N')],
      confidence: 'HIGH',
    });
  }

  // Duplicate business logic
  const duplicates = businessRules.filter(r => r.duplicate_of && r.duplicate_of !== '');
  for (const r of duplicates) {
    findings.push({
      id: fid(),
      type: 'DUPLICATE_BUSINESS_LOGIC',
      severity: 'MEDIUM',
      title: `Duplicate logic: ${r.rule_id} duplicates ${r.duplicate_of}`,
      description: `Rule "${r.rule_summary}" is flagged as a duplicate of ${r.duplicate_of}. Duplicate logic increases maintenance burden and risk of divergence.`,
      applicationId: appId,
      moduleIds: [r.module_id],
      ruleIds: [r.rule_id, r.duplicate_of],
      evidence: [ev('Business_Rules', r.rule_id, 'duplicate_of', r.duplicate_of)],
      confidence: 'HIGH',
    });
  }

  // Dead code
  const deadModules = modules.filter(m => m.is_dead_code);
  for (const m of deadModules) {
    findings.push({
      id: fid(),
      type: 'DEAD_CODE',
      severity: m.cyclomatic_complexity > 20 ? 'HIGH' : 'MEDIUM',
      title: `Dead code: ${m.module_id} (${m.module_name})`,
      description: `Module ${m.module_name} is flagged as dead code with complexity ${m.cyclomatic_complexity}. Dead code adds maintenance overhead and confusion.`,
      applicationId: appId,
      moduleIds: [m.module_id],
      ruleIds: [],
      evidence: [ev('Code_Modules', m.module_id, 'is_dead_code', 'Y')],
      confidence: 'HIGH',
    });
  }

  // Parity mismatches
  const mismatches = tests.filter(t => t.parity_status === 'MISMATCH');
  for (const t of mismatches) {
    findings.push({
      id: fid(),
      type: 'PARITY_MISMATCH',
      severity: 'CRITICAL',
      title: `Parity mismatch: ${t.test_id} (${t.test_name})`,
      description: `Test "${t.test_name}" expected "${t.expected_result}" but legacy produced "${t.legacy_result}". This indicates behavioral divergence that must be resolved before modernization.`,
      applicationId: appId,
      moduleIds: [t.module_id],
      ruleIds: [t.rule_id],
      evidence: [
        ev('Test_Cases', t.test_id, 'expected_result', t.expected_result),
        ev('Test_Cases', t.test_id, 'legacy_result', t.legacy_result),
      ],
      confidence: 'HIGH',
    });
  }

  // Retired integrations still active — check for retired downstream targets
  const allRetiredActive = data.integrations.filter(i =>
    i.app_id === appId &&
    i.status?.toLowerCase() === 'active' &&
    i.downstream_target?.toLowerCase().includes('retired')
  );
  for (const i of allRetiredActive) {
    findings.push({
      id: fid(),
      type: 'RETIRED_INTEGRATION',
      severity: 'HIGH',
      title: `Active integration to retired target: ${i.integration_id}`,
      description: `Integration ${i.interface_name} is Active but targets a retired downstream system "${i.downstream_target}". This is a continuity and reliability risk.`,
      applicationId: appId,
      moduleIds: [],
      ruleIds: [],
      evidence: [ev('Integrations', i.integration_id, 'downstream_target', i.downstream_target)],
      confidence: 'HIGH',
    });
  }

  // Orphan data stores (owning app not in applications)
  const appIdSet = new Set(data.applications.map(a => a.app_id));
  const orphanStores = data.dataStores.filter(d => d.owning_app_id && !appIdSet.has(d.owning_app_id));
  for (const s of orphanStores) {
    findings.push({
      id: fid(),
      type: 'ORPHAN_DATA_STORE',
      severity: 'MEDIUM',
      title: `Orphan data store: ${s.store_id} owned by unknown app ${s.owning_app_id}`,
      description: `Data store ${s.store_name} references owning application ${s.owning_app_id} which is not in the application inventory.`,
      applicationId: appId,
      moduleIds: [],
      ruleIds: [],
      evidence: [ev('Data_Stores', s.store_id, 'owning_app_id', s.owning_app_id)],
      confidence: 'HIGH',
    });
  }

  // Security / PII risks
  const piiStores = dataStores.filter(d => d.pii_present);
  for (const s of piiStores) {
    findings.push({
      id: fid(),
      type: 'SECURITY_RISK',
      severity: 'HIGH',
      title: `PII data store: ${s.store_id} (${s.store_name})`,
      description: `Data store ${s.store_name} contains PII data (classification: ${s.classification}). Any modernization must include data privacy impact assessment.`,
      applicationId: appId,
      moduleIds: [],
      ruleIds: [],
      evidence: [ev('Data_Stores', s.store_id, 'pii_present', 'Y')],
      confidence: 'HIGH',
    });
  }

  // Low confidence rules
  const lowConfidence = businessRules.filter(r => r.extraction_confidence < 0.7);
  for (const r of lowConfidence) {
    findings.push({
      id: fid(),
      type: 'LOW_CONFIDENCE_RULE',
      severity: 'LOW',
      title: `Low-confidence rule extraction: ${r.rule_id}`,
      description: `Rule "${r.rule_summary}" has extraction confidence ${(r.extraction_confidence * 100).toFixed(0)}%. Manual verification recommended before using this rule as modernization input.`,
      applicationId: appId,
      moduleIds: [r.module_id],
      ruleIds: [r.rule_id],
      evidence: [ev('Business_Rules', r.rule_id, 'extraction_confidence', r.extraction_confidence)],
      confidence: 'MEDIUM',
    });
  }

  // High complexity undocumented modules
  const highComplexUndoc = modules.filter(m => m.cyclomatic_complexity > 30 && !m.description_present);
  for (const m of highComplexUndoc) {
    findings.push({
      id: fid(),
      type: 'UNDOCUMENTED_MODULE',
      severity: 'MEDIUM',
      title: `High-complexity undocumented module: ${m.module_id}`,
      description: `Module ${m.module_name} has cyclomatic complexity ${m.cyclomatic_complexity} but no description. This is a knowledge risk.`,
      applicationId: appId,
      moduleIds: [m.module_id],
      ruleIds: [],
      evidence: [
        ev('Code_Modules', m.module_id, 'cyclomatic_complexity', m.cyclomatic_complexity),
        ev('Code_Modules', m.module_id, 'description_present', 'N'),
      ],
      confidence: 'HIGH',
    });
  }

  // Continuity risks from backlog
  const continuityBreakers = modernizationItems.filter(m => !m.preserves_continuity);
  for (const m of continuityBreakers) {
    findings.push({
      id: fid(),
      type: 'CONTINUITY_RISK',
      severity: 'HIGH',
      title: `Continuity risk in backlog: ${m.backlog_id}`,
      description: `Modernization item "${m.recommendation}" (${m.backlog_id}) is flagged as NOT preserving continuity. Execution without mitigation may break dependent systems.`,
      applicationId: appId,
      moduleIds: [m.module_id].filter(Boolean),
      ruleIds: [],
      evidence: [ev('Modernization_Backlog', m.backlog_id, 'preserves_continuity', 'N')],
      confidence: 'HIGH',
    });
  }

  // Build recommendations
  const recommendations = buildRecommendations(appId, modules, businessRules, dependencies, dataStores, integrations, tests, modernizationItems, findings);

  // Metrics
  const testedRules = new Set(tests.map(t => t.rule_id));
  const testCoverage = businessRules.length > 0
    ? Math.round((businessRules.filter(r => r.has_test_case || testedRules.has(r.rule_id)).length / businessRules.length) * 100)
    : 0;

  const metrics = {
    moduleCount: modules.length,
    ruleCount: businessRules.length,
    dependencyCount: dependencies.length,
    integrationCount: integrations.length,
    dataStoreCount: dataStores.length,
    testCoverage,
    docCoverage: app.doc_coverage_pct,
    highComplexityModules: modules.filter(m => m.cyclomatic_complexity > 20).length,
    criticalRulesWithoutTests: criticalUntested.length,
    deadCodeModules: deadModules.length,
    undocumentedModules: modules.filter(m => !m.description_present).length,
    criticalFindings: findings.filter(f => f.severity === 'CRITICAL').length,
    continuityRisks: findings.filter(f => f.type === 'CONTINUITY_RISK').length,
  };

  return {
    application: app,
    modules,
    businessRules,
    dataStores,
    integrations,
    dependencies,
    tests,
    modernizationItems,
    documentationArtifacts,
    findings,
    recommendations,
    metrics,
  };
}

function buildRecommendations(
  appId: string,
  modules: CodeModule[],
  rules: BusinessRule[],
  deps: Dependency[],
  _stores: DataStore[],
  _integrations: Integration[],
  tests: TestCase[],
  backlog: ModernizationItem[],
  _findings: Finding[]
): Recommendation[] {
  const recs: Recommendation[] = [];
  let idx = 0;
  const rid = () => `REC-${appId}-${String(++idx).padStart(3, '0')}`;

  // Score each module
  const moduleScores = modules.map(m => {
    let score = 0;
    score += m.cyclomatic_complexity > 40 ? 30 : m.cyclomatic_complexity > 20 ? 15 : 0;
    score += m.has_unit_tests ? 0 : WEIGHTS.noTests;
    score += m.is_dead_code ? WEIGHTS.deadCode : 0;
    score += !m.description_present ? 5 : 0;
    const moduleRules = rules.filter(r => r.module_id === m.module_id);
    const critRules = moduleRules.filter(r => r.criticality?.toLowerCase() === 'high' || r.criticality?.toLowerCase() === 'critical');
    score += critRules.length * 10;
    const runtimeDeps = deps.filter(d => d.source_module_id === m.module_id && d.is_runtime_critical);
    score += runtimeDeps.length * WEIGHTS.runtimeCriticalDep;
    return { module: m, score };
  });

  // Top risky modules
  const topRisky = moduleScores.sort((a, b) => b.score - a.score).slice(0, 3);
  for (const { module: m, score } of topRisky) {
    if (score < 20) continue;
    const priority = score >= 50 ? 'CRITICAL' : score >= 35 ? 'HIGH' : score >= 20 ? 'MEDIUM' : 'LOW';
    const phase = priority === 'CRITICAL' ? 'NOW' : priority === 'HIGH' ? 'NOW' : 'NEXT';
    recs.push({
      id: rid(),
      title: `Add characterization tests for ${m.module_name}`,
      description: `Module ${m.module_name} (${m.module_id}) has complexity ${m.cyclomatic_complexity} and ${m.has_unit_tests ? 'some' : 'no'} unit tests. Characterization tests must be established before any modernization attempt.`,
      priority: priority as Recommendation['priority'],
      risk: `Complexity ${m.cyclomatic_complexity}, ${m.lines_of_code} LOC`,
      continuityRisk: m.cyclomatic_complexity > 30 ? 'HIGH' : 'MEDIUM',
      rationale: `Risk score ${score}. High complexity without test coverage is the primary modernization blocker.`,
      evidence: [ev('Code_Modules', m.module_id, 'cyclomatic_complexity', m.cyclomatic_complexity)],
      relatedModules: [m.module_id],
      relatedRules: rules.filter(r => r.module_id === m.module_id).map(r => r.rule_id),
      affectedApp: appId,
      riskScore: score,
      roadmapPhase: phase as Recommendation['roadmapPhase'],
    });
  }

  // Backlog items with continuity risk
  const continuityBreakers = backlog.filter(b => !b.preserves_continuity);
  for (const b of continuityBreakers) {
    recs.push({
      id: rid(),
      title: `Mitigate continuity risk before: ${b.recommendation}`,
      description: `Backlog item ${b.backlog_id} "${b.recommendation}" does not preserve continuity. Downstream systems may break. Establish rollback plan and notify stakeholders before execution.`,
      priority: b.risk_level?.toLowerCase() === 'high' ? 'CRITICAL' : 'HIGH',
      risk: b.risk_level,
      continuityRisk: 'CRITICAL',
      rationale: `preserves_continuity=N with risk_level=${b.risk_level}. Derived from discovery evidence.`,
      evidence: [ev('Modernization_Backlog', b.backlog_id, 'preserves_continuity', 'N')],
      relatedModules: [b.module_id].filter(Boolean),
      relatedRules: [],
      affectedApp: appId,
      riskScore: 60,
      roadmapPhase: 'NOW',
    });
  }

  // Critical rules without tests
  const critNoTest = rules.filter(r =>
    (r.criticality?.toLowerCase() === 'high' || r.criticality?.toLowerCase() === 'critical') && !r.has_test_case
  );
  if (critNoTest.length > 0) {
    recs.push({
      id: rid(),
      title: `Document and test ${critNoTest.length} critical untested business rules`,
      description: `${critNoTest.length} critical business rules lack test coverage. These rules govern core business behavior and must be tested before any modernization.`,
      priority: 'CRITICAL',
      risk: 'Behavioral regression risk if rules are misunderstood during modernization',
      continuityRisk: 'HIGH',
      rationale: `Derived from Business_Rules sheet: ${critNoTest.map(r => r.rule_id).join(', ')}`,
      evidence: critNoTest.map(r => ev('Business_Rules', r.rule_id, 'has_test_case', 'N')),
      relatedModules: [...new Set(critNoTest.map(r => r.module_id))],
      relatedRules: critNoTest.map(r => r.rule_id),
      affectedApp: appId,
      riskScore: 55,
      roadmapPhase: 'NOW',
    });
  }

  // Parity mismatches
  const mismatches = tests.filter(t => t.parity_status === 'MISMATCH');
  if (mismatches.length > 0) {
    recs.push({
      id: rid(),
      title: `Resolve ${mismatches.length} parity mismatch(es) before modernization`,
      description: `Parity tests show behavioral divergence between expected and legacy results. These must be investigated and resolved. Do not proceed with modernization until parity is confirmed.`,
      priority: 'CRITICAL',
      risk: 'Unresolved mismatches indicate unknown behavioral differences',
      continuityRisk: 'CRITICAL',
      rationale: `Derived from Test_Cases: ${mismatches.map(t => t.test_id).join(', ')}`,
      evidence: mismatches.map(t => ev('Test_Cases', t.test_id, 'parity_status', 'Mismatch')),
      relatedModules: [...new Set(mismatches.map(t => t.module_id))],
      relatedRules: [...new Set(mismatches.map(t => t.rule_id))],
      affectedApp: appId,
      riskScore: 70,
      roadmapPhase: 'NOW',
    });
  }

  // Backlog items (in-progress or backlog)
  for (const b of backlog.filter(b => b.preserves_continuity).slice(0, 4)) {
    const score = b.risk_level?.toLowerCase() === 'high' ? 40 : b.risk_level?.toLowerCase() === 'medium' ? 25 : 15;
    recs.push({
      id: rid(),
      title: b.recommendation,
      description: `Backlog item ${b.backlog_id}: ${b.recommendation}. Target technology: ${b.target_tech}. Effort: ${b.effort_points} points. Status: ${b.status}.`,
      priority: b.priority === 'P1' ? 'HIGH' : b.priority === 'P2' ? 'MEDIUM' : 'LOW',
      risk: b.risk_level,
      continuityRisk: 'LOW',
      rationale: `Derived from Modernization_Backlog. Continuity preserved.`,
      evidence: [ev('Modernization_Backlog', b.backlog_id, 'recommendation', b.recommendation)],
      relatedModules: [b.module_id].filter(Boolean),
      relatedRules: [],
      affectedApp: appId,
      riskScore: score,
      roadmapPhase: b.priority === 'P1' ? 'NEXT' : 'LATER',
    });
  }

  return recs.sort((a, b) => b.riskScore - a.riskScore);
}

export function buildGraph(appId: string, profile: ApplicationProfile): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let edgeIdx = 0;
  const eid = () => `E-${++edgeIdx}`;

  nodes.push({ id: profile.application.app_id, type: 'Application', label: profile.application.app_name, data: profile.application });

  for (const m of profile.modules) {
    nodes.push({ id: m.module_id, type: 'Module', label: m.module_name, data: m });
    edges.push({ id: eid(), source: appId, target: m.module_id, type: 'CONTAINS' });
  }

  for (const r of profile.businessRules) {
    nodes.push({ id: r.rule_id, type: 'Rule', label: r.rule_id, data: r });
    edges.push({ id: eid(), source: r.module_id, target: r.rule_id, type: 'IMPLEMENTS' });
  }

  for (const d of profile.dataStores) {
    nodes.push({ id: d.store_id, type: 'DataStore', label: d.store_name, data: d });
    edges.push({ id: eid(), source: appId, target: d.store_id, type: 'USES_STORE' });
  }

  for (const i of profile.integrations) {
    nodes.push({ id: i.integration_id, type: 'Integration', label: i.interface_name, data: i });
    edges.push({ id: eid(), source: appId, target: i.integration_id, type: 'CONNECTS_TO' });
  }

  for (const dep of profile.dependencies) {
    edges.push({ id: eid(), source: dep.source_module_id, target: dep.target_id, type: 'DEPENDS_ON', data: dep });
  }

  for (const t of profile.tests) {
    nodes.push({ id: t.test_id, type: 'Test', label: t.test_name, data: t });
    if (t.rule_id) edges.push({ id: eid(), source: t.test_id, target: t.rule_id, type: 'TESTS' });
  }

  return { nodes, edges };
}
