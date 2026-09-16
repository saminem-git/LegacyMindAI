import type { ApplicationProfile, GeneratedDocument, Evidence } from '../../../packages/shared/src/index.js';

function ev(sheet: string, recordId: string, field?: string): Evidence {
  return { sheet, recordId, field };
}

export function generateFunctionalDoc(profile: ApplicationProfile): GeneratedDocument {
  const { application: app, modules, businessRules, dataStores, integrations, findings, metrics } = profile;

  const criticalRules = businessRules.filter(r => r.criticality?.toLowerCase() === 'high' || r.criticality?.toLowerCase() === 'critical');
  const untestedCritical = criticalRules.filter(r => !r.has_test_case);
  const piiStores = dataStores.filter(d => d.pii_present);
  const highComplexMods = modules.filter(m => m.cyclomatic_complexity > 20);

  const evidence: Evidence[] = [
    ev('Applications', app.app_id),
    ...modules.slice(0, 5).map(m => ev('Code_Modules', m.module_id)),
    ...businessRules.slice(0, 5).map(r => ev('Business_Rules', r.rule_id)),
  ];

  const content = `# Functional Documentation: ${app.app_name}

> **Source:** Recovered from discovery evidence — not from original source code.
> **Application ID:** ${app.app_id}
> **Generated:** ${new Date().toISOString()}

---

## Application Overview

| Field | Value |
|-------|-------|
| Application ID | ${app.app_id} |
| Name | ${app.app_name} |
| Language | ${app.primary_language} |
| Platform | ${app.platform} |
| Business Domain | ${app.business_domain} |
| Criticality | ${app.criticality} |
| Owner | ${app.owner} |
| Last Deployed | ${app.last_deployed} |
| Annual Maintenance Cost | €${app.annual_maint_cost_eur.toLocaleString()} |
| Documentation Coverage | ${app.doc_coverage_pct}% |

---

## Business Purpose

Evidence indicates this application operates within the **${app.business_domain}** domain.
It is classified as **${app.criticality}** criticality with an annual maintenance cost of €${app.annual_maint_cost_eur.toLocaleString()}.
The system is owned by **${app.owner}** and was last deployed on **${app.last_deployed}**.

*Source: Applications → ${app.app_id}*

---

## Functional Capabilities

Derived from ${modules.length} discovered code modules:

${modules.map(m => `- **${m.module_name}** (${m.module_id}): ${m.module_type}, ${m.lines_of_code} LOC, complexity ${m.cyclomatic_complexity}${m.is_dead_code ? ' ⚠️ DEAD CODE' : ''}${m.has_unit_tests ? '' : ' ⚠️ NO TESTS'}`).join('\n')}

*Source: Code_Modules — ${modules.length} records*

---

## Business Rules

${businessRules.length} business rules recovered from discovery evidence:

${businessRules.map(r => `### ${r.rule_id} — ${r.criticality} Criticality
- **Summary:** ${r.rule_summary}
- **Domain:** ${r.business_domain}
- **Module:** ${r.module_id}
- **Extraction Confidence:** ${(r.extraction_confidence * 100).toFixed(0)}%
- **Has Test:** ${r.has_test_case ? '✅ Yes' : '❌ No'}${r.duplicate_of ? `\n- **Duplicate of:** ${r.duplicate_of}` : ''}
- *Source: Business_Rules → ${r.rule_id}*
`).join('\n')}

---

## Integrations

${integrations.length === 0 ? '_No integrations found for this application._' : integrations.map(i =>
  `- **${i.interface_name}** (${i.integration_id}): ${i.integration_type}, ${i.direction}, ${i.protocol} → ${i.downstream_target} [${i.status}]`
).join('\n')}

*Source: Integrations — ${integrations.length} records*

---

## Data Stores

${dataStores.length === 0 ? '_No data stores found for this application._' : dataStores.map(d =>
  `- **${d.store_name}** (${d.store_id}): ${d.store_type}, ${d.classification}${d.pii_present ? ' ⚠️ PII' : ''}, ~${d.record_count_est.toLocaleString()} records`
).join('\n')}

*Source: Data_Stores — ${dataStores.length} records*

---

## Known Risks

${findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').map(f =>
  `- **[${f.severity}]** ${f.title}\n  ${f.description}\n  *Evidence: ${f.evidence.map(e => `${e.sheet} → ${e.recordId}`).join(', ')}*`
).join('\n\n') || '_No critical/high findings detected._'}

---

## Unknowns

- Source code not available — all findings derived from discovery artifacts
- ${untestedCritical.length > 0 ? `${untestedCritical.length} critical rules have no test coverage — behavior UNKNOWN` : 'All critical rules have test coverage'}
- Documentation coverage is ${app.doc_coverage_pct}% — ${100 - app.doc_coverage_pct}% of application behavior may be undocumented
${piiStores.length > 0 ? `- PII data present in ${piiStores.map(s => s.store_name).join(', ')} — data handling requirements UNKNOWN` : ''}

---

## Metrics Summary

| Metric | Value |
|--------|-------|
| Modules | ${metrics.moduleCount} |
| Business Rules | ${metrics.ruleCount} |
| Test Coverage | ${metrics.testCoverage}% |
| High Complexity Modules | ${metrics.highComplexityModules} |
| Critical Rules Without Tests | ${metrics.criticalRulesWithoutTests} |
| Dead Code Modules | ${metrics.deadCodeModules} |
| Critical Findings | ${metrics.criticalFindings} |
`;

  return {
    id: `DOC-FUNC-${app.app_id}`,
    appId: app.app_id,
    type: 'FUNCTIONAL',
    title: `Functional Documentation: ${app.app_name}`,
    content,
    evidence,
    generatedAt: new Date().toISOString(),
    isAiGenerated: false,
  };
}

export function generateProcessFlow(profile: ApplicationProfile): GeneratedDocument {
  const { application: app, modules, businessRules, dependencies } = profile;

  const evidence: Evidence[] = [
    ev('Applications', app.app_id),
    ...dependencies.slice(0, 5).map(d => ev('Dependencies', d.dependency_id)),
  ];

  // Build mermaid from actual dependency data
  const lines: string[] = ['flowchart TD'];

  // App node
  lines.push(`    APP["🏛️ ${app.app_name}\\n${app.app_id}"]`);
  lines.push(`    style APP fill:#1e40af,color:#fff,stroke:#1e3a8a`);

  // Module nodes
  for (const m of modules) {
    const label = m.is_dead_code ? `💀 ${m.module_name}` : m.module_name;
    const style = m.is_dead_code
      ? `fill:#6b7280,color:#fff`
      : m.cyclomatic_complexity > 30
      ? `fill:#dc2626,color:#fff`
      : m.cyclomatic_complexity > 15
      ? `fill:#d97706,color:#fff`
      : `fill:#059669,color:#fff`;
    lines.push(`    ${m.module_id}["${label}\\n${m.module_id}"]`);
    lines.push(`    style ${m.module_id} ${style}`);
    lines.push(`    APP --> ${m.module_id}`);
  }

  // Dependency edges
  for (const dep of dependencies) {
    const label = dep.is_runtime_critical ? `|"⚡ ${dep.dependency_kind}"|` : `|"${dep.dependency_kind}"|`;
    lines.push(`    ${dep.source_module_id} --${label}--> ${dep.target_id}`);
  }

  // Business rule nodes (only critical ones to keep diagram readable)
  const critRules = businessRules.filter(r => r.criticality?.toLowerCase() === 'high' || r.criticality?.toLowerCase() === 'critical');
  for (const r of critRules.slice(0, 8)) {
    lines.push(`    ${r.rule_id}(["📋 ${r.rule_id}\\n${r.rule_summary.substring(0, 40)}..."])`);
    lines.push(`    style ${r.rule_id} fill:#7c3aed,color:#fff`);
    lines.push(`    ${r.module_id} --> ${r.rule_id}`);
  }

  lines.push('');
  lines.push('    %% Legend');
  lines.push('    L1["🔵 Application"] ~~~ L2["🟢 Module (low complexity)"]');
  lines.push('    L2 ~~~ L3["🟡 Module (medium complexity)"]');
  lines.push('    L3 ~~~ L4["🔴 Module (high complexity)"]');
  lines.push('    L4 ~~~ L5["⚫ Dead Code"] ~~~ L6["🟣 Business Rule"]');

  const mermaidContent = lines.join('\n');

  const content = `# Process Flow: ${app.app_name}

> **Source:** Derived from available legacy discovery artifacts (Dependencies, Code_Modules, Business_Rules sheets).
> **Application ID:** ${app.app_id}
> **Generated:** ${new Date().toISOString()}

## Module Dependency Flow

\`\`\`mermaid
${mermaidContent}
\`\`\`

## Flow Notes

- **⚡ Runtime-critical** dependencies are labeled with ⚡
- **Red modules** have cyclomatic complexity > 30 (high risk)
- **Yellow modules** have cyclomatic complexity 15–30 (medium risk)
- **Grey modules** are flagged as dead code
- **Purple nodes** are critical business rules

## Dependency Summary

| Dependency | Source | Target | Kind | Runtime Critical |
|-----------|--------|--------|------|-----------------|
${dependencies.map(d => `| ${d.dependency_id} | ${d.source_module_id} | ${d.target_id} | ${d.dependency_kind} | ${d.is_runtime_critical ? '⚡ Yes' : 'No'} |`).join('\n')}

*Source: Dependencies sheet — ${dependencies.length} records*
`;

  return {
    id: `DOC-FLOW-${app.app_id}`,
    appId: app.app_id,
    type: 'PROCESS_FLOW',
    title: `Process Flow: ${app.app_name}`,
    content,
    evidence,
    generatedAt: new Date().toISOString(),
    isAiGenerated: false,
  };
}
