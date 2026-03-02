/**
 * Phase 14.6: Meta-Cognition Scoring Engine (MCSE)
 * Measures awareness of thinking errors, assumption detection,
 * bias recognition, and reasoning self-correction depth.
 */

import { sanitizeUserText } from './safetyPolicy';

type MetaCogScore = 0 | 1 | 2 | 3 | 4 | 5;

const ASSUMPTION_KW = ['asumo', 'supongo', 'doy por hecho', 'presupongo', 'asumir'];
const UNCERTAINTY_KW = ['no estoy seguro', 'podría', 'tal vez', 'es posible', 'quizá', 'probablemente'];
const ALTERNATIVE_KW = ['otra opción', 'alternativa', 'también podría', 'otra forma', 'otro camino'];
const BIAS_KW = ['sesgo', 'error común', 'riesgo', 'sobreconfianza', 'falacia', 'trampa mental'];
const SELF_CORRECTION_KW = ['me equivoqué', 'mi razonamiento falló', 'cambié de idea', 'estaba mal', 'corrijo', 'reconsidero'];

function matchesAny(text: string, keywords: string[]): boolean {
    const lower = text.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
}

export function scoreMetaCognition(text: string): MetaCogScore {
    if (!text || text.trim().length < 5) return 0;
    const safe = sanitizeUserText(text);
    let score = 0;
    if (matchesAny(safe, ASSUMPTION_KW)) score++;
    if (matchesAny(text, UNCERTAINTY_KW)) score++;
    if (matchesAny(text, ALTERNATIVE_KW)) score++;
    if (matchesAny(text, BIAS_KW)) score++;
    if (matchesAny(text, SELF_CORRECTION_KW)) score++;
    return Math.min(5, score) as MetaCogScore;
}

export function detectBiasMarkers(text: string): string[] {
    if (!text) return [];
    const lower = text.toLowerCase();
    return BIAS_KW.filter(kw => lower.includes(kw));
}

export function detectAssumptionMarkers(text: string): string[] {
    if (!text) return [];
    const lower = text.toLowerCase();
    return ASSUMPTION_KW.filter(kw => lower.includes(kw));
}

export function detectSelfCorrection(text: string): boolean {
    return matchesAny(text, SELF_CORRECTION_KW);
}
