import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mermaidEdgeLabel, mermaidLabel, mermaidNodeId, validateMermaidFlowchart } from '../services/mermaid.js';

describe('Mermaid safety helpers', () => {
    it('sanitizes labels with syntax-sensitive content', () => {
        const label = mermaidLabel('Quote " ampersand & (paren) / slash\nnext <tag>');
        assert.ok(!label.includes('\n'));
        assert.ok(!label.includes('<'));
        assert.ok(label.includes('\\"'));
        assert.equal(mermaidNodeId('MOD-001/quoted'), 'node_MOD_001_quoted');
        assert.ok(!mermaidEdgeLabel('kind|{unsafe};').match(/[|{};]/));
    });

    it('filters malformed generated lines without hiding valid flow structure', () => {
        const result = validateMermaidFlowchart([
            'flowchart TD',
            '    node_A["A"] -->|kind| node_B',
            '    node_B --> undefined',
            '    style node_A fill:#fff',
        ]);
        assert.deepEqual(result, ['flowchart TD', '    node_A["A"] -->|kind| node_B', '    style node_A fill:#fff']);
    });
});
