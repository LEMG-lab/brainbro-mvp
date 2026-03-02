import { sanitizeUserText, AI_SAFETY_PREAMBLE } from './safetyPolicy';

type QualityScore = 0 | 1 | 2 | 3 | 4 | 5;
export type ScoringMode = 'ai' | 'heuristic';
export interface ScoreResult { score: QualityScore; notes: string; mode: ScoringMode; }

const CAUSAL_MARKERS = ['porque', 'entonces', 'si ', 'por lo tanto', 'asumo', 'debido a', 'ya que', 'como resultado'];
const CONTRAST_MARKERS = ['pero', 'sin embargo', 'aunque', 'a pesar de'];
const ASSUMPTION_MARKERS = ['asumo', 'verifico', 'supongo', 'creo que', 'considero'];
const EVIDENCE_MARKERS = ['evidencia', 'dato', 'ejemplo', 'muestra', 'prueba', 'según', 'resultado'];
const RISK_MARKERS = ['riesgo', 'tradeoff', 'consecuencia', 'ventaja', 'desventaja', 'costo', 'beneficio'];

function clampScore(n: number): QualityScore {
    return Math.max(0, Math.min(5, Math.round(n))) as QualityScore;
}

function hasAny(text: string, markers: string[]): boolean {
    const t = text.toLowerCase();
    return markers.some(m => t.includes(m));
}

export function scoreWithHeuristics(text: string): ScoreResult {
    if (!text || text.trim().length < 10) return { score: 0, notes: 'Too short or empty', mode: 'heuristic' };

    const t = text.toLowerCase().trim();
    const hasCausal = hasAny(t, CAUSAL_MARKERS);
    const hasContrast = hasAny(t, CONTRAST_MARKERS);
    const hasAssumption = hasAny(t, ASSUMPTION_MARKERS);
    const hasEvidence = hasAny(t, EVIDENCE_MARKERS);
    const hasRisk = hasAny(t, RISK_MARKERS);

    if (hasAssumption && hasEvidence && (hasCausal || hasRisk)) {
        return { score: 5, notes: 'Deep reasoning: assumption + evidence + conclusion/risk', mode: 'heuristic' };
    }
    if (hasContrast || (hasAssumption && hasCausal)) {
        return { score: 4, notes: 'Strong reasoning: contrasts or verified assumption', mode: 'heuristic' };
    }
    if (hasCausal && (hasEvidence || t.length > 80)) {
        return { score: 3, notes: 'Good reasoning: causal with supporting detail', mode: 'heuristic' };
    }
    if (hasCausal || t.includes('regla') || t.includes('fórmula')) {
        return { score: 2, notes: 'Basic reasoning: causal marker or rule mention', mode: 'heuristic' };
    }
    if (t.length >= 10) {
        return { score: 1, notes: 'Minimal: text present but no causal reasoning', mode: 'heuristic' };
    }
    return { score: 0, notes: 'Insufficient', mode: 'heuristic' };
}

export function hasCausalMarker(text: string): boolean {
    return hasAny(text.toLowerCase(), CAUSAL_MARKERS);
}

export function hasReflectionMarker(text: string): boolean {
    const t = text.toLowerCase();
    return t.includes('mi error') || t.includes('la próxima') || t.includes('porque');
}

async function callGeminiForScore(prompt: string): Promise<ScoreResult | null> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, response_mime_type: 'application/json' },
                }),
            }
        );
        clearTimeout(timeout);

        if (!res.ok) return null;
        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!raw) return null;

        let clean = raw.trim();
        if (clean.startsWith('```json')) clean = clean.slice(7);
        if (clean.startsWith('```')) clean = clean.slice(3);
        if (clean.endsWith('```')) clean = clean.slice(0, -3);
        clean = clean.trim();

        const parsed = JSON.parse(clean);
        if (typeof parsed.score === 'number' && parsed.score >= 0 && parsed.score <= 5 && parsed.notes) {
            return { score: clampScore(parsed.score), notes: String(parsed.notes), mode: 'ai' };
        }
        // Guardrail: invalid AI response -> null triggers heuristic fallback
        return null;
    } catch {
        return null;
    }
}

export async function scoreReasoningWithAI(
    text: string,
    context: { areaId: string; question?: string }
): Promise<ScoreResult> {
    const safeText = sanitizeUserText(text);
    const prompt = `${AI_SAFETY_PREAMBLE}
You are a cognitive reasoning evaluator for a child student.
Score the QUALITY of this reasoning on 0-5:
0=empty/gibberish, 1=minimal, 2=has cause/rule, 3=cause+evidence, 4=contrasts/checks assumptions, 5=deep with evidence+conclusion+risk.

Area: ${context.areaId}
${context.question ? `Question: ${context.question}` : ''}
Student reasoning: "${safeText}"

Return ONLY JSON: {"score": 0-5, "notes": "brief explanation"}`;

    const aiResult = await callGeminiForScore(prompt);
    return aiResult || scoreWithHeuristics(text);
}

export async function scoreAmbiguityWithAI(
    text: string,
    ambiguityPrompt: string
): Promise<ScoreResult> {
    const safeText = sanitizeUserText(text);
    const safePrompt = sanitizeUserText(ambiguityPrompt);
    const prompt = `${AI_SAFETY_PREAMBLE}
You are a cognitive reasoning evaluator for a child student.
Score how well they handled this ambiguous/open-ended scenario (0-5):
0=empty/gibberish, 1=superficial, 2=considers one perspective, 3=weighs pros/cons, 4=considers consequences + stakeholders, 5=nuanced with tradeoffs + values + long-term thinking.

Scenario: "${safePrompt}"
Student answer: "${safeText}"

Return ONLY JSON: {"score": 0-5, "notes": "brief explanation"}`;

    const aiResult = await callGeminiForScore(prompt);
    return aiResult || scoreWithHeuristics(text);
}


export const SCORER_VERSION = '1.0.0';
