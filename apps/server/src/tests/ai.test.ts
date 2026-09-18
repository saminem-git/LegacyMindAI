import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { importWorkbook } from '../services/importer.js';
import { analyzeApplication } from '../analysis/engine.js';
import { buildEvidenceContext } from '../ai/context.js';
import { generateInsight } from '../ai/service.js';
import type { AIProvider } from '../ai/provider.js';

const XLSX_PATH = path.resolve(process.cwd(), '../../LegacyMind_Mock_Dataset.xlsx');

class MockProvider implements AIProvider {
  calls = 0;
  isAvailable() { return true; }
  name() { return 'mock'; }
  async generateStructured<T>(): Promise<T> {
    this.calls += 1;
    return {
      title: 'Evidence-based insight',
      summary: 'Supported by project evidence.',
      whyItMatters: 'It affects modernization sequencing.',
      businessImpact: 'Business impact is present in the evidence.',
      technicalImpact: 'Technical impact is present in the evidence.',
      continuityImpact: 'Continuity should be validated.',
      recommendedAction: 'Review the cited evidence before changing the system.',
      confidence: 'HIGH',
    } as T;
  }
}

describe('AI evidence layer', () => {
  it('builds bounded context and redacts credential-like values', async () => {
    const data = await importWorkbook(XLSX_PATH);
    const profile = analyzeApplication(data.applications[0].app_id, data);
    const built = buildEvidenceContext(profile, 'executive');
    assert.ok(built.context.length <= 30000);
    assert.ok(!built.context.match(/api[_-]?key\s*[:=]\s*[^,\s]+/i));
  });

  it('caches identical insight requests', async () => {
    const data = await importWorkbook(XLSX_PATH);
    const profile = analyzeApplication(data.applications[0].app_id, data);
    const provider = new MockProvider();
    await generateInsight(profile, provider, 'executive');
    await generateInsight(profile, provider, 'executive');
    assert.equal(provider.calls, 1);
  });
});
