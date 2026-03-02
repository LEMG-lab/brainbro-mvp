/**
 * Phase 15.7: Action Step Engine
 * Extracts action commitments from reflections and classifies them.
 */

import type { ActionStepTag } from '../types';

// ─── Extraction ───

const TRIGGER_PATTERNS = [
    /(?:la\s+pr[oó]xima\s+vez|next\s+time|voy\s+a|i\s+will|debo|should)\s+(.+?)(?:\.|$)/gi,
];

export function extractActionSteps(text: string): string[] {
    if (!text || text.trim().length < 10) return [];
    const results: string[] = [];
    for (const pat of TRIGGER_PATTERNS) {
        pat.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pat.exec(text)) !== null) {
            const step = m[1].trim();
            if (step.length >= 5 && step.length < 200) {
                results.push(step);
            }
            if (results.length >= 2) break;
        }
        if (results.length >= 2) break;
    }
    return results;
}

// ─── Classification ───

const TAG_KEYWORDS: Record<ActionStepTag, string[]> = {
    verify: ['verificar', 'verify', 'check', 'revisar', 'comprobar', 'double-check'],
    slow_down: ['despacio', 'slow', 'calma', 'lento', 'pensar más', 'think more', 'pause'],
    assumptions: ['asumir', 'assum', 'suponer', 'suppose', 'premisas'],
    confidence: ['confian', 'confid', 'segur', 'duda', 'doubt'],
    models: ['modelo', 'model', 'inversion', 'first principles', 'second order', 'probabilistic'],
    time: ['tiempo', 'time', 'plazo', 'deadline', 'rápido', 'fast', 'apuro'],
    other: [],
};

export function classifyActionStep(text: string): ActionStepTag {
    const lower = text.toLowerCase();
    for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
        if (tag === 'other') continue;
        if (keywords.some(kw => lower.includes(kw))) return tag as ActionStepTag;
    }
    return 'other';
}
