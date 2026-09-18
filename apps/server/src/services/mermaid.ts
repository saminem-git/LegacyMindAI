export function mermaidNodeId(value: string, prefix = 'node'): string {
    const safe = value.replace(/[^A-Za-z0-9_]/g, '_');
    return `${prefix}_${safe || 'unknown'}`;
}

export function mermaidLabel(value: unknown, maxLength = 80): string {
    return String(value ?? 'Unknown')
        .replace(/[\r\n]+/g, ' ')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, maxLength);
}

export function mermaidEdgeLabel(value: unknown): string {
    return mermaidLabel(value, 40).replace(/[|{};]/g, ' ');
}

export function validateMermaidFlowchart(lines: string[]): string[] {
    return lines.filter(line => {
        if (!line.includes('-->') && !line.includes('~~~') && !line.startsWith('flowchart') && !line.startsWith('    style') && !line.startsWith('    %%')) return false;
        return !line.includes('undefined') && !line.includes('null');
    });
}
