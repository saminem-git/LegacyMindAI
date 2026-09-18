import type { ApplicationProfile } from '@legacymind/shared';
import type { LLMProvider } from './provider.js';
import { buildEvidenceContext } from './context.js';

interface AISummary {
  executiveSummary: string;
  modernizationApproach: string;
  topRisks: string[];
  keyInsights: string[];
}

interface AITestScenario {
  title: string;
  scenario: string;
  expectedBehavior: string;
  ruleId: string;
  evidence: string;
}

function buildContext(profile: ApplicationProfile): string {
  return buildEvidenceContext(profile, 'executive').context;
}

const BASE_INSTRUCTION = `You are a legacy application modernization analyst.
Use ONLY the supplied evidence context below.
Do NOT invent facts. If information is missing, use "UNKNOWN".
Every conclusion must reference evidence IDs from the context.
Return valid JSON only.`;

export async function generateAISummary(profile: ApplicationProfile, llm: LLMProvider): Promise<AISummary> {
  const ctx = buildContext(profile);
  const prompt = `${BASE_INSTRUCTION}

EVIDENCE CONTEXT:
${ctx}

Generate an executive summary for modernizing application ${profile.application.app_id} (${profile.application.app_name}).

Return JSON with this exact structure:
{
  "executiveSummary": "2-3 sentence summary of the application and its modernization readiness",
  "modernizationApproach": "Recommended high-level approach based on evidence",
  "topRisks": ["risk1", "risk2", "risk3"],
  "keyInsights": ["insight1", "insight2", "insight3"]
}`;

  return llm.generateStructured<AISummary>(prompt);
}

export async function generateAITestScenarios(profile: ApplicationProfile, llm: LLMProvider): Promise<AITestScenario[]> {
  const untestedRules = profile.businessRules.filter(r =>
    (r.criticality?.toLowerCase() === 'high' || r.criticality?.toLowerCase() === 'critical') && !r.has_test_case
  ).slice(0, 5);

  if (untestedRules.length === 0) return [];

  const ctx = JSON.stringify(untestedRules, null, 2);
  const prompt = `${BASE_INSTRUCTION}

EVIDENCE CONTEXT (untested critical business rules):
${ctx}

Generate parity test scenarios for these untested critical business rules.
These are AI-generated from available business-rule evidence — not from executed source code.

Return JSON array:
[
  {
    "title": "Test scenario title",
    "scenario": "Describe the test scenario",
    "expectedBehavior": "What should happen based on the rule summary",
    "ruleId": "RULE-XXX",
    "evidence": "Business_Rules → RULE-XXX"
  }
]`;

  return llm.generateStructured<AITestScenario[]>(prompt);
}

export async function generateAIDocumentation(profile: ApplicationProfile, llm: LLMProvider): Promise<string> {
  const ctx = buildContext(profile);
  const prompt = `${BASE_INSTRUCTION}

EVIDENCE CONTEXT:
${ctx}

Generate a concise functional documentation section explaining the business purpose and key capabilities of application ${profile.application.app_id}.
Focus on what the application does based on the business rules and module names.
Label all conclusions as "Evidence indicates..." or "Derived from discovery artifacts".

Return JSON:
{
  "businessPurpose": "paragraph explaining business purpose",
  "keyCapabilities": ["capability1", "capability2"],
  "dataFlowSummary": "brief description of data flow based on integrations and data stores"
}`;

  try {
    const result = await llm.generateStructured<{ businessPurpose: string; keyCapabilities: string[]; dataFlowSummary: string }>(prompt);
    return `## AI-Generated Business Context
> ⚠️ AI-generated from available business-rule evidence. Not from executed source code.

**Business Purpose:** ${result.businessPurpose}

**Key Capabilities:**
${result.keyCapabilities.map(c => `- ${c}`).join('\n')}

**Data Flow:** ${result.dataFlowSummary}`;
  } catch {
    return `## AI-Generated Business Context\n> AI analysis unavailable. Configure VW LLMaaS for AI-enhanced documentation.`;
  }
}
