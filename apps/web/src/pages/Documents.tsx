import { useState, useEffect, useRef } from 'react';
import { useApp } from '../hooks/useApp';
import { Copy, Download } from 'lucide-react';
import type { GeneratedDocument } from '../types';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });

function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const id = `mermaid-${Date.now()}`;
    mermaid.render(id, chart)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      })
      .catch(e => setError(String(e)));
  }, [chart]);

  if (error) return <div className="text-red-400 text-xs p-4 bg-red-950/20 rounded border border-red-800">{error}</div>;
  return <div ref={ref} className="mermaid-output overflow-auto" />;
}

function extractMermaid(content: string): string | null {
  const match = content.match(/```mermaid\s*([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function DocViewer({ doc }: { doc: GeneratedDocument }) {
  const [copied, setCopied] = useState(false);
  const mermaidChart = extractMermaid(doc.content);

  const copy = () => {
    navigator.clipboard.writeText(doc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportMd = () => {
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render markdown-like content
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-white mt-4 mb-2">{line.slice(2)}</h1>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-base font-semibold text-gray-200 mt-4 mb-2 border-b border-gray-800 pb-1">{line.slice(3)}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-semibold text-gray-300 mt-3 mb-1">{line.slice(4)}</h3>;
      if (line.startsWith('> ')) return <blockquote key={i} className="border-l-2 border-blue-600 pl-3 text-xs text-gray-500 italic my-1">{line.slice(2)}</blockquote>;
      if (line.startsWith('- ')) return <li key={i} className="text-sm text-gray-400 ml-4 list-disc">{line.slice(2)}</li>;
      if (line.startsWith('| ')) {
        const cells = line.split('|').filter(c => c.trim());
        if (cells.every(c => /^[-:]+$/.test(c.trim()))) return null;
        return (
          <tr key={i}>
            {cells.map((c, j) => (
              <td key={j} className="border border-gray-700 px-2 py-1 text-xs text-gray-300">{c.trim()}</td>
            ))}
          </tr>
        );
      }
      if (line.startsWith('```mermaid')) return null;
      if (line.startsWith('```')) return null;
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <p key={i} className="text-sm text-gray-400">{line}</p>;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">{doc.title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Generated {new Date(doc.generatedAt).toLocaleString()}
            {doc.isAiGenerated && <span className="ml-2 text-purple-400">· AI-assisted</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={copy} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">
            <Copy size={11} /> {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={exportMd} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">
            <Download size={11} /> Export MD
          </button>
        </div>
      </div>

      {/* Mermaid diagram if present */}
      {mermaidChart && (
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
          <h3 className="text-xs text-gray-500 mb-3 font-medium">Process Flow Diagram</h3>
          <MermaidDiagram chart={mermaidChart} />
        </div>
      )}

      {/* Evidence */}
      {doc.evidence.length > 0 && (
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-2 font-medium">Source Evidence ({doc.evidence.length} records)</div>
          <div className="flex flex-wrap gap-2">
            {doc.evidence.map((e, i) => (
              <span key={i} className="text-xs bg-gray-900 border border-gray-700 rounded px-2 py-0.5 font-mono text-blue-400">
                {e.sheet} → {e.recordId}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-1">
        {renderContent(doc.content)}
      </div>
    </div>
  );
}

export default function Documents() {
  const { analysisResult, selectedApp } = useApp();
  const [activeTab, setActiveTab] = useState(0);

  if (!selectedApp) return <div className="p-8 text-center text-gray-500">Select an application.</div>;
  if (!analysisResult) return <div className="p-8 text-center text-gray-500">Run analysis to generate documentation.</div>;

  const docs = analysisResult.documents;
  if (docs.length === 0) return <div className="p-8 text-center text-gray-500">No documents generated.</div>;

  const tabLabels = docs.map(d => d.type === 'FUNCTIONAL' ? 'Functional Docs' : d.type === 'PROCESS_FLOW' ? 'Process Flow' : 'API Spec');

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-white mb-4">Documentation: {selectedApp.app_name}</h1>
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {tabLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${activeTab === i ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <DocViewer doc={docs[activeTab]} />
    </div>
  );
}
