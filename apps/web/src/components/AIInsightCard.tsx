import { useEffect, useState } from 'react';
import { Brain, Loader2, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import type { AIInsight, AIViewMode } from '../types';

interface Props {
  appId: string;
  intent: string;
  entityId?: string;
  title?: string;
  compact?: boolean;
  mode?: AIViewMode;
  onModeChange?: (mode: AIViewMode) => void;
}

const CLAIM_STYLES: Record<string, string> = {
  FACT: 'bg-slate-100 text-slate-700',
  FINDING: 'bg-amber-50 text-amber-700',
  INTERPRETATION: 'bg-cyan-50 text-[var(--color-vw-blue)]',
  RECOMMENDATION: 'bg-emerald-50 text-emerald-700',
};

export default function AIInsightCard({ appId, intent, entityId, title = 'AI interpretation', compact = false, mode: controlledMode, onModeChange }: Props) {
  const [localMode, setLocalMode] = useState<AIViewMode>(controlledMode ?? 'executive');
  const mode = controlledMode ?? localMode;
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const load = () => {
    setLoading(true);
    setUnavailable(false);
    api.getAIInsight(appId, intent, entityId, mode)
      .then(setInsight)
      .catch(() => setUnavailable(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [appId, intent, entityId, mode]);

  const changeMode = (nextMode: AIViewMode) => {
    setLocalMode(nextMode);
    onModeChange?.(nextMode);
  };

  return (
    <section className="bg-white border border-[var(--color-border)] rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shrink-0">
          <Sparkles size={13} className="text-[var(--color-ai)]" />
        </span>
        <h2 className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider">{title}</h2>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex border border-[var(--color-border)] rounded-lg overflow-hidden" aria-label="Explanation mode">
            {(['technical', 'executive'] as const).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => changeMode(option)}
                className={`text-[11px] px-2.5 py-1 font-medium transition-colors ${mode === option ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-slate-500 hover:text-slate-700'}`}
              >
                {option === 'technical' ? 'Technical' : 'Executive'}
              </button>
            ))}
          </div>
          {insight && <span className="text-[10px] text-slate-500">{insight.confidence} confidence</span>}
        </div>
      </div>
      {loading && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 size={12} className="animate-spin text-[var(--color-vw-blue)]" /> Analyzing project evidence...</div>}
      {!loading && unavailable && (
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <Brain size={14} /> AI insights are currently unavailable.
          <button onClick={load} className="text-[var(--color-vw-blue)] hover:text-[var(--color-primary)] font-medium">Retry</button>
        </div>
      )}
      {!loading && insight && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">{insight.title}</h3>
          <p className="text-sm text-slate-600 leading-6">{insight.summary}</p>
          {!compact && <>
            <p className="text-xs text-slate-600"><span className="font-medium text-slate-500">Why it matters:</span> {insight.whyItMatters}</p>
            <p className="text-xs text-slate-600"><span className="font-medium text-slate-500">Impact:</span> {mode === 'technical' ? insight.technicalImpact : insight.businessImpact}</p>
            <p className="text-xs text-slate-600"><span className="font-medium text-slate-500">Recommended next step:</span> {insight.recommendedAction}</p>
          </>}
          {insight.claims.length > 0 && (
            <div className="border-t border-[var(--color-border)] pt-2 space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Source facts and interpretation</div>
              {insight.claims.slice(0, 5).map((claim, i) => (
                <div key={i} className="text-xs text-slate-600 leading-5">
                  <span className={`inline-block text-[9px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 mr-1.5 align-middle ${CLAIM_STYLES[claim.kind] ?? 'bg-slate-100 text-slate-700'}`}>{claim.kind}</span>
                  {claim.text}
                  {claim.evidenceIds.length > 0 && (
                    <span className="ml-1 text-slate-400">
                      [{claim.evidenceIds.map(id => <a key={id} href={`/traceability?search=${encodeURIComponent(id)}`} className="text-[var(--color-vw-blue)] hover:underline mr-1">{id}</a>)}]
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {insight.evidence.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {insight.evidence.map((e, i) => <span key={`${e.recordId}-${i}`} className="text-[10px] font-mono text-[var(--color-vw-blue)] bg-cyan-50 border border-cyan-100 rounded px-1.5 py-0.5">{e.sheet} → {e.recordId}</span>)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
