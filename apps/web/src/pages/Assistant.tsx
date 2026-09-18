import { FormEvent, useState } from 'react';
import { Bot, Send, Loader2, Sparkles, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { api } from '../api/client';
import type { AIChatMessage, AIChatResponse, AIViewMode } from '../types';

const SUGGESTIONS = [
  'What should I worry about most before modernization?',
  'Which critical rules are untested?',
  'Explain the modernization roadmap.',
  'Which dependencies could block migration?',
];

export default function Assistant() {
  const { selectedApp, analysisResult } = useApp();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState<AIChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AIViewMode>('executive');

  if (!selectedApp) return <div className="p-8 text-center text-gray-700">Select an application to use the Assistant.</div>;
  if (!analysisResult) return <div className="p-8 text-center text-gray-700">Run analysis to give the Assistant project evidence.</div>;

  const askQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || loading) return;
    setInput('');
    setError(null);
    setLoading(true);
    try {
      const response = await api.chatAI(selectedApp.app_id, question, messages, answer?.followUpContext, mode);
      const nextMessages: AIChatMessage[] = [...messages, { role: 'user', content: question }, { role: 'assistant', content: response.answer }];
      setMessages(nextMessages.slice(-8));
      setAnswer(response);
    } catch (e) {
      setError((e as Error).message || 'AI insights are currently unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    await askQuestion(input);
  };

  return (
    <div className="h-full min-h-0 p-4 md:p-6 flex flex-col max-w-5xl mx-auto">
      <header className="shrink-0 border-b border-gray-800 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center"><Sparkles size={18} className="text-[var(--lm-electric-neon)]" /></div><div><h1 className="text-xl md:text-2xl font-bold text-[var(--color-primary)]">LegacyMind AI Assistant</h1><p className="text-xs text-gray-800 mt-1">Project Intelligence · {selectedApp.app_name}</p></div></div>
          <div className="flex items-center gap-2 text-[11px] text-gray-800"><ShieldCheck size={14} className="text-[var(--lm-vivid-green)]" /> Evidence-backed</div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3"><p className="text-sm text-gray-800">Ask about architecture, dependencies, risks, tests, and modernization evidence.</p><div className="inline-flex border border-gray-700 rounded-lg overflow-hidden shrink-0" aria-label="Assistant explanation mode">{(['technical', 'executive'] as const).map(option => <button key={option} type="button" onClick={() => setMode(option)} className={`text-[11px] px-3 py-1.5 ${mode === option ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-900 text-gray-700 hover:text-gray-400'}`}>{option === 'technical' ? 'Technical' : 'Executive'}</button>)}</div></div>
      </header>

      <section className="flex-1 min-h-0 overflow-y-auto py-5 space-y-4" aria-live="polite">
        {messages.length === 0 && !answer && <div className="min-h-full flex flex-col justify-center"><div className="text-center max-w-xl mx-auto"><Bot size={28} className="mx-auto text-[var(--lm-vivid-green)]" /><h2 className="mt-4 text-lg font-semibold text-[var(--color-primary)]">Ask about your legacy system</h2><p className="mt-2 text-sm text-gray-700">LegacyMind can explain what the project evidence means and what deserves attention next.</p></div><div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto mt-8 w-full">{SUGGESTIONS.map(question => <button key={question} type="button" onClick={() => void askQuestion(question)} className="text-left text-sm text-gray-600 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 hover:-translate-y-0.5 hover:border-[var(--lm-vivid-green)] hover:shadow-sm transition-all">{question}<span className="block text-xs text-gray-400 mt-1">Ask LegacyMind AI</span></button>)}</div></div>}
        {messages.map((message, i) => <div key={`${message.role}-${i}`} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-xl border p-4 ${message.role === 'user' ? 'bg-slate-100 border-slate-200' : 'bg-white border-gray-800 shadow-sm'}`}><div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">{message.role === 'user' ? <><UserRound size={11} /> You</> : <><Sparkles size={11} className="text-[var(--lm-vivid-green)]" /> LegacyMind AI</>}</div><div className="text-sm text-gray-600 whitespace-pre-wrap leading-6">{message.content}</div></div></div>)}
        {answer && <div className="bg-[var(--lm-deep-space-blue)] text-white rounded-xl p-4 space-y-3"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wider text-[var(--lm-electric-neon)]">AI interpretation</span><span className="text-[10px] text-slate-300">{answer.confidence} confidence</span></div><div className="text-xs text-slate-300">Source facts and AI interpretation are separated below.</div>{answer.claims.length > 0 && <div className="space-y-2">{answer.claims.map((claim, i) => <div key={i} className="text-sm text-slate-200"><span className="text-[var(--lm-electric-neon)] text-xs mr-1">{claim.kind}</span>{claim.text}{claim.evidenceIds.length > 0 && <span className="block mt-1">{claim.evidenceIds.map(id => <a key={id} href={`/traceability?search=${encodeURIComponent(id)}`} className="inline-block text-[11px] text-[var(--lm-electric-neon)] border border-[var(--lm-vivid-green)]/60 rounded px-1.5 py-0.5 mr-1 hover:bg-[var(--lm-vivid-green)]">{id}</a>)}</span>}</div>)}</div>}</div>}
        {loading && <div className="flex items-center gap-2 text-sm text-gray-700"><Sparkles size={15} className="text-[var(--lm-vivid-green)] animate-pulse" /> Analyzing project evidence...</div>}
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>}
      </section>

      <form onSubmit={ask} className="shrink-0 border-t border-gray-800 pt-4"><div className="flex items-end gap-2 bg-white border border-gray-700 rounded-xl p-2 shadow-sm focus-within:border-[var(--lm-vivid-green)] focus-within:ring-2 focus-within:ring-[var(--lm-vivid-green)]/15"><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void askQuestion(input); } }} rows={1} placeholder="Ask about your legacy system..." aria-label="Ask LegacyMind AI" className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-gray-700 focus:outline-none min-h-10 max-h-28" /><button type="submit" disabled={!input.trim() || loading} aria-label="Send question" className="w-10 h-10 rounded-lg bg-[var(--lm-deep-space-blue)] text-[var(--lm-electric-neon)] flex items-center justify-center hover:bg-[var(--lm-vivid-green)] hover:text-white disabled:opacity-40 transition-colors"><Send size={16} />{loading && <Loader2 size={12} className="absolute animate-spin" />}</button></div><p className="text-[10px] text-gray-400 mt-2 text-center">Enter to send · Shift+Enter for a new line · Human review remains the final decision</p></form>
    </div>
  );
}
