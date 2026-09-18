import { FormEvent, useState } from 'react';
import { Bot, Send, Loader2 } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { api } from '../api/client';
import type { AIChatMessage, AIChatResponse } from '../types';

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

  if (!selectedApp) return <div className="p-8 text-center text-gray-500">Select an application to use the Assistant.</div>;
  if (!analysisResult) return <div className="p-8 text-center text-gray-500">Run analysis to give the Assistant project evidence.</div>;

  const ask = async (event?: FormEvent) => {
    event?.preventDefault();
    const question = input.trim();
    if (!question || loading) return;
    setInput('');
    setError(null);
    setLoading(true);
    try {
      const response = await api.chatAI(selectedApp.app_id, question, messages, answer?.followUpContext);
      const nextMessages: AIChatMessage[] = [...messages, { role: 'user', content: question }, { role: 'assistant', content: response.answer }];
      setMessages(nextMessages.slice(-8));
      setAnswer(response);
    } catch (e) {
      setError((e as Error).message || 'AI insights are currently unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div>
        <div className="flex items-center gap-2"><Bot size={20} className="text-blue-400" /><h1 className="text-xl font-bold text-white">AI Assistant</h1></div>
        <p className="text-sm text-gray-500 mt-1">Project-aware guidance for {selectedApp.app_name}. Answers are grounded in deterministic findings and source evidence.</p>
      </div>

      {messages.length === 0 && !answer && (
        <div className="grid md:grid-cols-2 gap-2">
          {SUGGESTIONS.map(question => <button key={question} onClick={() => setInput(question)} className="text-left text-xs text-gray-300 bg-gray-900 border border-gray-800 rounded-lg px-3 py-3 hover:border-blue-700">{question}</button>)}
        </div>
      )}

      {messages.length > 0 && <div className="space-y-3">{messages.map((message, i) => <div key={i} className={`rounded-lg border p-3 ${message.role === 'user' ? 'bg-gray-900 border-gray-800 ml-8' : 'bg-blue-950/20 border-blue-900/70 mr-8'}`}><div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{message.role === 'user' ? 'You' : 'LegacyMind AI'}</div><div className="text-sm text-gray-300 whitespace-pre-wrap">{message.content}</div></div>)}</div>}

      {answer && (
        <div className="bg-blue-950/20 border border-blue-900/70 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wider text-blue-300">Evidence-grounded answer</span><span className="text-[10px] text-gray-500">Confidence: {answer.confidence}</span></div>
          <div className="text-sm text-gray-200 whitespace-pre-wrap">{answer.answer}</div>
          {answer.evidence.length > 0 && <div className="flex flex-wrap gap-1">{answer.evidence.map((e, i) => <span key={`${e.recordId}-${i}`} className="text-[10px] font-mono text-blue-300 bg-gray-950 border border-gray-800 rounded px-1.5 py-0.5">{e.sheet} → {e.recordId}</span>)}</div>}
        </div>
      )}

      {error && <div className="text-xs text-red-400 bg-red-950/20 border border-red-900 rounded p-3">{error}</div>}
      <form onSubmit={ask} className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about this project..." className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-600" />
        <button type="submit" disabled={!input.trim() || loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm disabled:opacity-40"><Send size={14} />{loading ? <Loader2 size={14} className="animate-spin" /> : 'Ask'}</button>
      </form>
    </div>
  );
}
