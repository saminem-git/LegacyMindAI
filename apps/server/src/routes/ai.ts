import { Router } from 'express';
import { loadAnalysisResult } from '../db/database.js';
import { createAIProvider } from '../ai/provider.js';
import { chat, generateInsight, projectAIState } from '../ai/service.js';
import type { AIChatMessage } from '@legacymind/shared';

const router = Router();
const parseMode = (value: unknown): 'technical' | 'executive' => value === 'executive' ? 'executive' : 'technical';

router.get('/state', (_req, res) => res.json(projectAIState(createAIProvider())));

router.post('/:appId/insight', async (req, res) => {
  const result = loadAnalysisResult(req.params.appId);
  if (!result) return res.status(404).json({ error: `No analysis found for ${req.params.appId}` });
  const provider = createAIProvider();
  if (!provider.isAvailable()) return res.status(503).json(projectAIState(provider));
  try {
    const intent = req.body?.intent ?? 'executive';
    const insight = await generateInsight(result.profile, provider, intent, req.body?.entityId, parseMode(req.body?.mode));
    return res.json(insight);
  } catch (error) {
    console.warn('AI insight failed:', (error as Error).message);
    return res.status(503).json({ error: 'AI insights are currently unavailable.' });
  }
});

router.post('/:appId/chat', async (req, res) => {
  const result = loadAnalysisResult(req.params.appId);
  if (!result) return res.status(404).json({ error: `No analysis found for ${req.params.appId}` });
  const provider = createAIProvider();
  if (!provider.isAvailable()) return res.status(503).json(projectAIState(provider));
  const message = String(req.body?.message ?? '').trim();
  if (!message) return res.status(400).json({ error: 'A question is required.' });
  try {
    const response = await chat(result.profile, provider, message, (req.body?.history ?? []) as AIChatMessage[], req.body?.followUpContext, parseMode(req.body?.mode));
    return res.json(response);
  } catch (error) {
    console.warn('AI chat failed:', (error as Error).message);
    return res.status(503).json({ error: 'AI insights are currently unavailable.' });
  }
});

export default router;
