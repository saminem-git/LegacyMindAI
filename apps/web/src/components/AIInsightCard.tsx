import { useEffect, useState } from 'react';
import { Brain, Loader2, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import type { AIInsight } from '../types';

interface Props {
  appId: string;
  intent: string;
  entityId?: string;
  title?: string;
  compact?: boolean;
}

export default function AIInsightCard({ appId, intent, entityId, title = 'AI interpretation', compact = false }: Props) {
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const load = () => {
    setLoading(true);
    setUnavailable(false);
    api.getAIInsight(appId, intent, entityId)
      .then(setInsight)
      .catch(() => setUnavailable(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [appId, intent, entityId]);

  return (
    <section className="bg-blue-950/20 border border-blue-900/70 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-blue-400" />
        <h2 className="text-xs font-semibold text-blue-300 uppercase tracking-wider">{title}</h2>
        {insight && <span className="text-[10px] text-gray-500 ml-auto">Evidence confidence: {insight.confidence}</span>}
      </div>
      {loading && <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 size={12} className="animate-spin" /> Preparing evidence-grounded insight...</div>}
      {!loading && unavailable && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <Brain size={14} /> AI insights are currently unavailable.
          <button onClick={load} className="text-blue-400 hover:text-blue-300">Retry</button>
        </div>
      )}
      {!loading && insight && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-white">{insight.title}</h3>
          <p className="text-sm text-gray-300">{insight.summary}</p>
          {!compact && <>
            <p className="text-xs text-gray-400"><span className="text-gray-500">Why it matters:</span> {insight.whyItMatters}</p>
            <p className="text-xs text-gray-400"><span className="text-gray-500">Recommended next step:</span> {insight.recommendedAction}</p>
          </>}
          {insight.evidence.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {insight.evidence.map((e, i) => <span key={`${e.recordId}-${i}`} className="text-[10px] font-mono text-blue-300 bg-gray-950 border border-gray-800 rounded px-1.5 py-0.5">{e.sheet} → {e.recordId}</span>)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
