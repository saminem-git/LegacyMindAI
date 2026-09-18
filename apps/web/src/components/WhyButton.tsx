import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import AIInsightCard from './AIInsightCard';
import type { AIViewMode } from '../types';

interface Props {
    appId: string;
    intent: string;
    entityId?: string;
    label?: string;
}

export default function WhyButton({ appId, intent, entityId, label = 'Why?' }: Props) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<AIViewMode>('executive');
    return <div className="mt-2">
        <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-vw-blue)] hover:text-[var(--color-primary)]"><HelpCircle size={12} /> {open ? 'Hide explanation' : label}</button>
        {open && <div className="mt-2"><AIInsightCard appId={appId} intent={intent} entityId={entityId} mode={mode} onModeChange={setMode} title="Why this matters" /></div>}
    </div>;
}
