import { Router } from 'express';
import { loadWorkbookData, saveAnalysisResult, loadAnalysisResult, listAnalysisResults } from '../db/database.js';
import { analyzeApplication, buildGraph } from '../analysis/engine.js';
import { generateFunctionalDoc, generateProcessFlow } from '../services/docgen.js';
import { createLLMProvider } from '../ai/provider.js';
import { generateAISummary, generateAITestScenarios, generateAIDocumentation } from '../ai/assistant.js';
import type { AnalysisResult } from '@legacymind/shared';

const router = Router();

router.post('/:appId', async (req, res) => {
  const appId = req.params.appId;
  const data = loadWorkbookData();
  if (!data) return res.status(400).json({ error: 'No workbook data. Import first.' });

  const app = data.applications.find(a => a.app_id === appId);
  if (!app) return res.status(404).json({ error: `Application ${appId} not found` });

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

    return res.json({ success: true, result, aiSummary, aiTestScenarios });
  } catch (e) {
    console.error('Analysis error:', e);
    return res.status(500).json({ error: (e as Error).message });
  }
});

router.get('/:appId', (req, res) => {
  const appId = req.params.appId;
  const result = loadAnalysisResult(appId);
  if (!result) return res.status(404).json({ error: `No analysis found for ${appId}` });
  return res.json(result);
});

router.get('/', (_req, res) => {
  return res.json(listAnalysisResults());
});

export default router;
