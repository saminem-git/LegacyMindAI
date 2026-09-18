import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import type {
  WorkbookData, Application, CodeModule, BusinessRule, DataStore,
  Integration, Dependency, TestCase, ModernizationItem, DocumentationArtifact,
  ImportSummary
} from '@legacymind/shared';

const REQUIRED_SHEETS = [
  'Applications', 'Code_Modules', 'Business_Rules', 'Data_Stores',
  'Integrations', 'Dependencies', 'Test_Cases', 'Modernization_Backlog',
  'Documentation_Artifacts'
];

function norm(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function normBool(v: unknown): boolean {
  return norm(v).toUpperCase() === 'Y' || norm(v).toUpperCase() === 'YES' || norm(v) === '1' || norm(v).toLowerCase() === 'true';
}

function normNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function normParity(expected: string, legacy: string, status: string): 'PASS' | 'MISMATCH' | 'UNKNOWN' {
  const s = norm(status).toLowerCase();
  if (s === 'mismatch') return 'MISMATCH';
  if (expected && legacy) {
    if (norm(expected) !== norm(legacy)) return 'MISMATCH';
    return 'PASS';
  }
  if (s === 'match') return 'PASS';
  return 'UNKNOWN';
}

function extractCellValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('result' in value) return extractCellValue((value as { result: ExcelJS.CellValue }).result);
    if ('text' in value) return (value as { text: string }).text;
    if ('richText' in value) return (value as { richText: { text: string }[] }).richText.map(rt => rt.text).join('');
    return String(value);
  }
  return value;
}

function getSheet(wb: ExcelJS.Workbook, name: string): Record<string, unknown>[] {
  const ws = wb.getWorksheet(name);
  if (!ws) return [];

  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = norm(extractCellValue(cell.value));
  });

  const records: Record<string, unknown>[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const record: Record<string, unknown> = {};
    let hasValue = false;
    for (let c = 1; c < headers.length; c++) {
      const header = headers[c];
      if (!header) continue;
      const value = extractCellValue(row.getCell(c).value);
      record[header] = value;
      if (value !== '' && value !== null && value !== undefined) hasValue = true;
    }
    if (hasValue) records.push(record);
  }
  return records;
}

// ExcelJS's docProps parser is strict about property order/shape and rejects
// files from many non-Excel producers (Google Sheets, LibreOffice, openpyxl, etc.)
// with errors like "Unexpected xml node in parseOpen". These properties are pure
// metadata we don't use, so replace them with a minimal valid version instead of
// depending on every producer matching Excel's exact XML shape.
async function sanitizeWorkbookBuffer(input: Buffer): Promise<Buffer> {
  const minimalCore = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"></cp:coreProperties>';
  const minimalApp = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
    'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"></Properties>';

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(input);
  } catch {
    // Not a zip we can inspect (e.g. legacy .xls) — let ExcelJS handle/report it as-is.
    return input;
  }

  let changed = false;
  if (zip.file('docProps/core.xml')) {
    zip.file('docProps/core.xml', minimalCore);
    changed = true;
  }
  if (zip.file('docProps/app.xml')) {
    zip.file('docProps/app.xml', minimalApp);
    changed = true;
  }
  if (!changed) return input;

  return zip.generateAsync({ type: 'nodebuffer' });
}

export async function importWorkbook(filePath: string): Promise<WorkbookData> {
  const wb = new ExcelJS.Workbook();
  try {
    const raw = await readFile(filePath);
    const sanitized = await sanitizeWorkbookBuffer(raw);
    await wb.xlsx.load(sanitized as unknown as ExcelJS.Buffer);
  } catch (e) {
    throw new Error(`Failed to read workbook at ${filePath}: ${(e as Error).message}`);
  }

  return parseWorkbook(wb);
}

export async function importWorkbookBuffer(buffer: Buffer, fileName = 'uploaded workbook'): Promise<WorkbookData> {
  const wb = new ExcelJS.Workbook();
  try {
    const sanitized = await sanitizeWorkbookBuffer(buffer);
    await wb.xlsx.load(sanitized as unknown as ExcelJS.Buffer);
  } catch (e) {
    throw new Error(`Failed to read workbook ${fileName}: ${(e as Error).message}`);
  }

  return parseWorkbook(wb);
}

function parseWorkbook(wb: ExcelJS.Workbook): WorkbookData {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validate required sheets
  const sheetNames = wb.worksheets.map(ws => ws.name);
  for (const sheet of REQUIRED_SHEETS) {
    if (!sheetNames.includes(sheet)) {
      errors.push(`Missing required sheet: ${sheet}`);
    }
  }

  const applications: Application[] = getSheet(wb, 'Applications').map((r, i) => {
    if (!r['app_id']) warnings.push(`Applications row ${i + 2}: missing app_id`);
    return {
      app_id: norm(r['app_id']),
      app_name: norm(r['app_name']),
      primary_language: norm(r['primary_language']),
      platform: norm(r['platform']),
      business_domain: norm(r['business_domain']),
      criticality: norm(r['criticality']),
      annual_maint_cost_eur: normNum(r['annual_maint_cost_eur']),
      last_deployed: norm(r['last_deployed']),
      owner: norm(r['owner']),
      doc_coverage_pct: normNum(r['doc_coverage_pct']),
    };
  }).filter(a => a.app_id);

  const modules: CodeModule[] = getSheet(wb, 'Code_Modules').map((r, i) => {
    if (!r['module_id']) warnings.push(`Code_Modules row ${i + 2}: missing module_id`);
    return {
      module_id: norm(r['module_id']),
      app_id: norm(r['app_id']),
      module_name: norm(r['module_name']),
      module_type: norm(r['module_type']),
      lines_of_code: normNum(r['lines_of_code']),
      cyclomatic_complexity: normNum(r['cyclomatic_complexity']),
      last_changed: norm(r['last_changed']),
      last_change_author: norm(r['last_change_author']),
      is_dead_code: normBool(r['is_dead_code']),
      has_unit_tests: normBool(r['has_unit_tests']),
      description_present: normBool(r['description_present']),
    };
  }).filter(m => m.module_id);

  const businessRules: BusinessRule[] = getSheet(wb, 'Business_Rules').map((r, i) => {
    if (!r['rule_id']) warnings.push(`Business_Rules row ${i + 2}: missing rule_id`);
    return {
      rule_id: norm(r['rule_id']),
      module_id: norm(r['module_id']),
      rule_summary: norm(r['rule_summary']),
      business_domain: norm(r['business_domain']),
      criticality: norm(r['criticality']),
      extraction_confidence: normNum(r['extraction_confidence']),
      duplicate_of: norm(r['duplicate_of']),
      has_test_case: normBool(r['has_test_case']),
    };
  }).filter(r => r.rule_id);

  const dataStores: DataStore[] = getSheet(wb, 'Data_Stores').map((r, i) => {
    if (!r['store_id']) warnings.push(`Data_Stores row ${i + 2}: missing store_id`);
    return {
      store_id: norm(r['store_id']),
      store_name: norm(r['store_name']),
      store_type: norm(r['store_type']),
      owning_app_id: norm(r['owning_app_id']),
      classification: norm(r['classification']),
      pii_present: normBool(r['pii_present']),
      record_count_est: normNum(r['record_count_est']),
    };
  }).filter(d => d.store_id);

  const integrations: Integration[] = getSheet(wb, 'Integrations').map((r, i) => {
    if (!r['integration_id']) warnings.push(`Integrations row ${i + 2}: missing integration_id`);
    return {
      integration_id: norm(r['integration_id']),
      app_id: norm(r['app_id']),
      interface_name: norm(r['interface_name']),
      integration_type: norm(r['integration_type']),
      direction: norm(r['direction']),
      protocol: norm(r['protocol']),
      downstream_target: norm(r['downstream_target']),
      status: norm(r['status']),
      last_verified: norm(r['last_verified']),
    };
  }).filter(i => i.integration_id);

  const dependencies: Dependency[] = getSheet(wb, 'Dependencies').map((r, i) => {
    if (!r['dependency_id']) warnings.push(`Dependencies row ${i + 2}: missing dependency_id`);
    return {
      dependency_id: norm(r['dependency_id']),
      source_module_id: norm(r['source_module_id']),
      target_type: norm(r['target_type']),
      target_id: norm(r['target_id']),
      dependency_kind: norm(r['dependency_kind']),
      is_runtime_critical: normBool(r['is_runtime_critical']),
    };
  }).filter(d => d.dependency_id);

  const tests: TestCase[] = getSheet(wb, 'Test_Cases').map((r, i) => {
    if (!r['test_id']) warnings.push(`Test_Cases row ${i + 2}: missing test_id`);
    const expected = norm(r['expected_result']);
    const legacy = norm(r['legacy_result']);
    const status = norm(r['parity_status']);
    return {
      test_id: norm(r['test_id']),
      rule_id: norm(r['rule_id']),
      module_id: norm(r['module_id']),
      test_name: norm(r['test_name']),
      test_type: norm(r['test_type']),
      expected_result: expected,
      legacy_result: legacy,
      parity_status: normParity(expected, legacy, status),
      last_run: norm(r['last_run']),
    };
  }).filter(t => t.test_id);

  const modernizationItems: ModernizationItem[] = getSheet(wb, 'Modernization_Backlog').map((r, i) => {
    if (!r['backlog_id']) warnings.push(`Modernization_Backlog row ${i + 2}: missing backlog_id`);
    return {
      backlog_id: norm(r['backlog_id']),
      app_id: norm(r['app_id']),
      module_id: norm(r['module_id']),
      recommendation: norm(r['recommendation']),
      target_tech: norm(r['target_tech']),
      effort_points: normNum(r['effort_points']),
      risk_level: norm(r['risk_level']),
      preserves_continuity: normBool(r['preserves_continuity']),
      priority: norm(r['priority']),
      status: norm(r['status']),
    };
  }).filter(m => m.backlog_id);

  const documentationArtifacts: DocumentationArtifact[] = getSheet(wb, 'Documentation_Artifacts').map((r, i) => {
    if (!r['doc_id']) warnings.push(`Documentation_Artifacts row ${i + 2}: missing doc_id`);
    const excerpt = norm(r['excerpt']);
    // Security: do not echo potential credential values
    const safeExcerpt = /password|secret|credential|api.?key|token/i.test(excerpt)
      ? '[Potential sensitive content detected — see source record for details]'
      : excerpt;
    return {
      doc_id: norm(r['doc_id']),
      app_id: norm(r['app_id']),
      doc_type: norm(r['doc_type']),
      doc_title: norm(r['doc_title']),
      last_updated: norm(r['last_updated']),
      author: norm(r['author']),
      excerpt: safeExcerpt,
    };
  }).filter(d => d.doc_id);

  // Cross-reference validation
  const appIds = new Set(applications.map(a => a.app_id));
  const moduleIds = new Set(modules.map(m => m.module_id));

  modules.forEach(m => {
    if (!appIds.has(m.app_id)) warnings.push(`Module ${m.module_id} references unknown app ${m.app_id}`);
  });
  dataStores.forEach(d => {
    if (d.owning_app_id && !appIds.has(d.owning_app_id)) {
      warnings.push(`DataStore ${d.store_id} owned by unknown app ${d.owning_app_id}`);
    }
  });
  dependencies.forEach(d => {
    if (!moduleIds.has(d.source_module_id)) warnings.push(`Dependency ${d.dependency_id} source ${d.source_module_id} not found`);
    if (d.target_type === 'Module' && !moduleIds.has(d.target_id)) {
      warnings.push(`Dependency ${d.dependency_id} target ${d.target_id} not found (orphan)`);
    }
  });

  const importSummary: ImportSummary = {
    applications: applications.length,
    modules: modules.length,
    businessRules: businessRules.length,
    dataStores: dataStores.length,
    integrations: integrations.length,
    dependencies: dependencies.length,
    tests: tests.length,
    modernizationItems: modernizationItems.length,
    documentationArtifacts: documentationArtifacts.length,
    warnings,
    errors,
  };

  return {
    applications, modules, businessRules, dataStores, integrations,
    dependencies, tests, modernizationItems, documentationArtifacts,
    importSummary,
  };
}

