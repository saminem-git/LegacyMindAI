import { useRef, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { Upload, ArrowRight, CheckCircle2, FileSpreadsheet } from 'lucide-react';

export default function Welcome() {
    const { importWorkbook, isImporting } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) importWorkbook(file);
        e.target.value = '';
    };

    return (
        <div className="min-h-screen overflow-auto bg-[var(--color-background)] p-6 md:p-10 lg:p-14">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.2fr_.8fr] gap-10 items-center">
                <section className="stagger-in">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[.18em] uppercase text-[var(--color-vw-blue)]"><span className="w-2 h-2 rounded-full bg-[var(--color-ai)]" /> Enterprise modernization intelligence</div>
                    <h1 className="mt-5 text-4xl md:text-6xl font-bold tracking-tight text-[var(--color-primary)] leading-[1.05]">LegacyMind <span className="text-[var(--color-vw-blue)]">AI</span></h1>
                    <p className="mt-4 text-xl md:text-2xl text-slate-600 max-w-xl">Understand legacy systems. Recover business logic. Modernize with continuity in mind.</p>
                    <p className="mt-5 text-sm md:text-base text-slate-500 max-w-xl leading-7">Turn discovery evidence into a clear, traceable modernization decision. LegacyMind maps what exists, shows what matters, and keeps every recommendation connected to source records.</p>
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                        {['UNDERSTAND', 'DOCUMENT', 'MAP', 'TEST', 'MODERNIZE'].map((step, index) => <div key={step} className="flex items-center gap-3"><span className="px-3 py-2 rounded-lg bg-white border border-[var(--color-border)] text-xs font-semibold tracking-wider text-[var(--color-primary)] shadow-sm">{step}</span>{index < 4 && <ArrowRight size={14} className="text-[var(--color-vw-blue)]" />}</div>)}
                    </div>
                </section>
                <section className={`stagger-in bg-white border ${dragging ? 'border-[var(--color-vw-blue)] bg-cyan-50' : 'border-[var(--color-border)]'} rounded-2xl p-7 shadow-[var(--shadow-soft)]`} style={{ animationDelay: '120ms' }} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) importWorkbook(file); }}>
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center"><FileSpreadsheet size={24} className="text-[var(--color-vw-blue)]" /></div>
                    <h2 className="mt-5 text-xl font-semibold text-[var(--color-primary)]">Bring your legacy evidence</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Upload an XLSX discovery dataset to begin mapping applications, rules, dependencies, tests, risks, and modernization priorities.</p>
                    <div className="mt-6 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center"><Upload size={22} className="mx-auto text-[var(--color-vw-blue)]" /><p className="mt-3 text-sm font-medium text-slate-700">Drop your dataset here</p><p className="mt-1 text-xs text-slate-400">or choose a file from your computer</p><input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelected} /><button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-emerald-50 bg-[var(--color-primary)] hover:bg-[var(--color-vw-blue)] rounded-lg text-sm font-medium disabled:opacity-50">{isImporting ? 'Loading dataset...' : 'Analyze Legacy Application'} <ArrowRight size={14} /></button></div>
                    <div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 size={14} className="text-emerald-500" /> Supported format: XLSX discovery dataset</div>
                </section>
            </div>
            <div className="max-w-6xl mx-auto mt-12 grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/70 border border-[var(--color-border)] rounded-xl p-4"><div className="font-semibold text-[var(--color-primary)]">Evidence-backed</div><div className="mt-1 text-slate-500">Every finding remains tied to source records.</div></div>
                <div className="bg-white/70 border border-[var(--color-border)] rounded-xl p-4"><div className="font-semibold text-[var(--color-primary)]">AI-assisted</div><div className="mt-1 text-slate-500">AI explains the evidence; it does not replace analysis.</div></div>
                <div className="bg-white/70 border border-[var(--color-border)] rounded-xl p-4"><div className="font-semibold text-[var(--color-primary)]">Human-controlled</div><div className="mt-1 text-slate-500">Teams decide what to modernize and when.</div></div>
            </div>
        </div>
    );
}
