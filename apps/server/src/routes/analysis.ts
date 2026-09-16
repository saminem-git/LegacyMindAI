import { Hono } from 'hono';
import { loadWorkbookData, saveAnalysisResult, loadAnalysisResult, listAnalysisResults } from '../db/database.js';
import { analyzeApplication, buildGraph } from '../analysis/engine.js';
import { generateFunctionalDoc, generateProcessFlow } from '../services/docgen.js';
import { createLLMProvider } from '../ai/provider.js';
import { generateAISummary, generateAITestScenarios, generateAIDocumentation } from '../ai/assistant.js';
import type { AnalysisResult } from '../../../packages/shared/src/index.js';

const router = new Hono();

router.post('/:appId', async (c) => {
  const appId = c.req.param('appId');
  const data = loadWorkbookData();
  if (!data) return c.json({ error: 'No workbook data. Import first.' }, 400);

  const app = data.applications.find(a => a.app_id === appId);
  if (!app) return c.json({ error: `Application ${appId} not found` }, 404);

  try {
    const profile = analyzeApplication(appId, data);
    const { nodes, edges } = buildGraph(appId, profile);

    const funcDoc = generateFunctionalDoc(profile);
    const flowDoc = generateProcessFlow(profile);
    const documents = [funcDoc, flowDoc];

    // AI enhancements (graceful fallback)
    const llm = createLLMProvider();
    let aiSummary = null;
    let aiTestScenarios: unknown[] = [];

    if (llm.isAvailable()) {
      try {
        aiSummary = await generateAISummary(profile, llm);
        const aiDoc = await generateAIDocumentation(profile, llm);
        funcDoc.content += '\n\n' + aiDoc;
      } catch (e) {
        console.warn('AI summary failed:', (e as Error).message);
      }
      try {
        aiTestScenarios = await generateAITestScenarios(profile, llm);
      } catch (e) {
        console.warn('AI test generation failed:', (e as Error).message);
      }
    }

    const result: AnalysisResult = {
      id: `ANALYSIS-${appId}-${Date.now()}`,
      appId,
      analyzedAt: new Date().toISOString(),
      profile,
      documents,
      graphNodes: nodes,
      graphEdges: edges,
    };

    saveAnalysisResult(result);

    return c.json({ success: true, result, aiSummary, aiTestScenarios });
  } catch (e) {
    console.error('Analysis error:', e);
    return c.json({ error: (e as Error).message }, 500);
  }
});

router.get('/:appId', (c) => {
  const appId = c.req.param('appId');
  const result = loadAnalysisResult(appId);
  if (!result) return c.json({ error: `No analysis found for ${appId}` }, 404);
  return c.json(result);
});

router.get('/', (c) => {
  return c.json(listAnalysisResults());
});

export default router;
