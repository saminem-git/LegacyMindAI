// Core domain types for LegacyMind AI

export interface Evidence {
  sheet: string;
  recordId: string;
  field?: string;
  value?: unknown;
}

export interface Application {
  app_id: string;
  app_name: string;
  primary_language: string;
  platform: string;
  business_domain: string;
  criticality: string;
  annual_maint_cost_eur: number;
  last_deployed: string;
  owner: string;
  doc_coverage_pct: number;
}

export interface CodeModule {
  module_id: string;
  app_id: string;
  module_name: string;
  module_type: string;
  lines_of_code: number;
  cyclomatic_complexity: number;
  last_changed: string;
  last_change_author: string;
  is_dead_code: boolean;
  has_unit_tests: boolean;
  description_present: boolean;
}

export interface BusinessRule {
  rule_id: string;
  module_id: string;
  rule_summary: string;
  business_domain: string;
  criticality: string;
  extraction_confidence: number;
  duplicate_of: string;
  has_test_case: boolean;
}

export interface DataStore {
  store_id: string;
  store_name: string;
  store_type: string;
  owning_app_id: string;
  classification: string;
  pii_present: boolean;
  record_count_est: number;
}

export interface Integration {
  integration_id: string;
  app_id: string;
  interface_name: string;
  integration_type: string;
  direction: string;
  protocol: string;
  downstream_target: string;
  status: string;
  last_verified: string;
}

export interface Dependency {
  dependency_id: string;
  source_module_id: string;
  target_type: string;
  target_id: string;
  dependency_kind: string;
  is_runtime_critical: boolean;
}

export interface TestCase {
  test_id: string;
  rule_id: string;
  module_id: string;
  test_name: string;
  test_type: string;
  expected_result: string;
  legacy_result: string;
  parity_status: 'PASS' | 'MISMATCH' | 'UNKNOWN';
  last_run: string;
}

export interface ModernizationItem {
  backlog_id: string;
  app_id: string;
  module_id: string;
  recommendation: string;
  target_tech: string;
  effort_points: number;
  risk_level: string;
  preserves_continuity: boolean;
  priority: string;
  status: string;
}

export interface DocumentationArtifact {
  doc_id: string;
  app_id: string;
  doc_type: string;
  doc_title: string;
  last_updated: string;
  author: string;
  excerpt: string;
}

export type FindingType =
  | 'CIRCULAR_DEPENDENCY'
  | 'ORPHAN_DEPENDENCY'
  | 'CRITICAL_RULE_NO_TEST'
  | 'DUPLICATE_BUSINESS_LOGIC'
  | 'DEAD_CODE'
  | 'PARITY_MISMATCH'
  | 'RETIRED_INTEGRATION'
  | 'ORPHAN_DATA_STORE'
  | 'SECURITY_RISK'
  | 'CONTINUITY_RISK'
  | 'LOW_CONFIDENCE_RULE'
  | 'UNDOCUMENTED_MODULE'
  | 'HIGH_COMPLEXITY';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface Finding {
  id: string;
  type: FindingType;
  severity: Severity;
  title: string;
  description: string;
  applicationId?: string;
  moduleIds?: string[];
  ruleIds?: string[];
  evidence: Evidence[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  risk: string;
  continuityRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string;
  evidence: Evidence[];
  relatedModules: string[];
  relatedRules: string[];
  affectedApp: string;
  riskScore: number;
  roadmapPhase: 'NOW' | 'NEXT' | 'LATER';
}

export interface GraphNode {
  id: string;
  type: 'Application' | 'Module' | 'Rule' | 'DataStore' | 'Integration' | 'Test' | 'Documentation' | 'ModernizationItem';
  label: string;
  data: unknown;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'CONTAINS' | 'IMPLEMENTS' | 'DEPENDS_ON' | 'USES_STORE' | 'CONNECTS_TO' | 'TESTS' | 'DOCUMENTED_BY' | 'RECOMMENDS' | 'IMPACTS' | 'TARGETS';
  data?: unknown;
}

export interface ImportSummary {
  applications: number;
  modules: number;
  businessRules: number;
  dataStores: number;
  integrations: number;
  dependencies: number;
  tests: number;
  modernizationItems: number;
  documentationArtifacts: number;
  warnings: string[];
  errors: string[];
}

export interface ApplicationProfile {
  application: Application;
  modules: CodeModule[];
  businessRules: BusinessRule[];
  dataStores: DataStore[];
  integrations: Integration[];
  dependencies: Dependency[];
  tests: TestCase[];
  modernizationItems: ModernizationItem[];
  documentationArtifacts: DocumentationArtifact[];
  findings: Finding[];
  recommendations: Recommendation[];
  metrics: {
    moduleCount: number;
    ruleCount: number;
    dependencyCount: number;
    integrationCount: number;
    dataStoreCount: number;
    testCoverage: number;
    docCoverage: number;
    highComplexityModules: number;
    criticalRulesWithoutTests: number;
    deadCodeModules: number;
    undocumentedModules: number;
    criticalFindings: number;
    continuityRisks: number;
  };
}

export interface GeneratedDocument {
  id: string;
  appId: string;
  type: 'FUNCTIONAL' | 'PROCESS_FLOW' | 'API_SPEC';
  title: string;
  content: string;
  evidence: Evidence[];
  generatedAt: string;
  isAiGenerated: boolean;
}

export interface AnalysisResult {
  id: string;
  appId: string;
  analyzedAt: string;
  profile: ApplicationProfile;
  documents: GeneratedDocument[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
}

export interface WorkbookData {
  applications: Application[];
  modules: CodeModule[];
  businessRules: BusinessRule[];
  dataStores: DataStore[];
  integrations: Integration[];
  dependencies: Dependency[];
  tests: TestCase[];
  modernizationItems: ModernizationItem[];
  documentationArtifacts: DocumentationArtifact[];
  importSummary: ImportSummary;
}
