/**
 * Phase 15.8: Writing & Argumentation Engine
 * Weekly writing missions with AI/heuristic rubric scoring.
 */

import type { AgeBand, WritingPrompt, WritingScores } from '../types';
import { getLastWritingWeekKey } from './storage';

// ─── Week Key ───

export function getWeekKey(now: number): string {
    const d = new Date(now);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ─── Should Show ───

export function shouldShowWriting(dateNow: number): boolean {
    const weekKey = getWeekKey(dateNow);
    const lastWeek = getLastWritingWeekKey();
    return lastWeek !== weekKey;
}

// ─── Prompt Bank (safe, age-banded) ───

const PROMPTS: WritingPrompt[] = [
    // 6-8
    { id: 'w01', ageBand: '6-8', topic: 'Mi animal favorito', prompt: '¿Cuál es tu animal favorito y por qué? Da al menos dos razones. ¿Qué dirías si alguien prefiere otro animal?' },
    { id: 'w02', ageBand: '6-8', topic: 'Juegos al aire libre', prompt: '¿Es mejor jugar al aire libre o adentro? Defiende tu opinión con dos razones.' },
    { id: 'w03', ageBand: '6-8', topic: 'La mejor comida', prompt: '¿Cuál es la mejor comida del día: desayuno, almuerzo o cena? Da dos razones.' },
    { id: 'w04', ageBand: '6-8', topic: 'Mascotas en la escuela', prompt: '¿Debería haber mascotas en la escuela? Da dos razones y responde a alguien que piense diferente.' },
    // 9-11
    { id: 'w05', ageBand: '9-11', topic: 'Tecnología en el aula', prompt: '¿Las tablets deben reemplazar los libros en la escuela? Argumenta con 2 razones y responde al contraargumento.' },
    { id: 'w06', ageBand: '9-11', topic: 'Deportes obligatorios', prompt: '¿Los deportes deberían ser obligatorios en la escuela? Presenta tu tesis, 2 evidencias y un contraargumento.' },
    { id: 'w07', ageBand: '9-11', topic: 'Tareas para la casa', prompt: '¿Las tareas son útiles o innecesarias? Defiende tu posición con evidencia y responde al lado opuesto.' },
    { id: 'w08', ageBand: '9-11', topic: 'Recreo más largo', prompt: '¿Debería el recreo durar más? Argumenta y considera la perspectiva contraria.' },
    // 12-14
    { id: 'w09', ageBand: '12-14', topic: 'Redes sociales para menores', prompt: '¿Los menores de 14 deberían tener redes sociales? Presenta tesis, 2 evidencias, un contraargumento y respuesta. Evita falacias.' },
    { id: 'w10', ageBand: '12-14', topic: 'Edad para votar', prompt: '¿Debería reducirse la edad para votar a 16 años? Estructura tu ensayo con tesis, evidencia, contraargumento y conclusión.' },
    { id: 'w11', ageBand: '12-14', topic: 'Inteligencia artificial en educación', prompt: '¿La IA mejora o empeora la educación? Argumenta con estructura formal y detecta posibles falacias en tu razonamiento.' },
    { id: 'w12', ageBand: '12-14', topic: 'Uniformes escolares', prompt: '¿Los uniformes escolares son beneficiosos? Presenta una argumentación estructurada.' },
    // 15-18
    { id: 'w13', ageBand: '15-18', topic: 'Privacidad vs seguridad', prompt: '¿Debemos sacrificar privacidad por seguridad? Ensayo argumentativo con tesis, 2+ evidencias, contraargumento, refutación. Identifica falacias posibles.' },
    { id: 'w14', ageBand: '15-18', topic: 'Cambio climático y economía', prompt: '¿El crecimiento económico es compatible con la sostenibilidad ambiental? Argumenta formalmente.' },
    { id: 'w15', ageBand: '15-18', topic: 'Justicia y equidad', prompt: '¿Es más importante la igualdad o la equidad? Construye un argumento con estructura formal y evita falacias.' },
    { id: 'w16', ageBand: '15-18', topic: 'Libertad de expresión', prompt: '¿Debe la libertad de expresión tener límites? Argumenta con evidencia y contraargumentos.' },
];

function dateHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) >>> 0;
    return h;
}

export function getWritingPrompt(ageBand: AgeBand, dateNow: number): WritingPrompt {
    const weekKey = getWeekKey(dateNow);
    const pool = PROMPTS.filter(p => p.ageBand === ageBand);
    if (pool.length === 0) return PROMPTS[0];
    const idx = dateHash(weekKey) % pool.length;
    return pool[idx];
}

// ─── Sanitize ───

function sanitizeUserText(text: string): string {
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, '')
        .slice(0, 3000);
}

// ─── Heuristic Scoring ───

function scoreHeuristic(text: string): { scores: WritingScores; notes: string } {
    const lower = text.toLowerCase();
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);

    // Thesis: clear position in first ~80 chars
    const first80 = lower.slice(0, 120);
    const thesisMarkers = ['creo que', 'pienso que', 'mi posición', 'considero que', 'opino que', 'i believe', 'in my opinion', 'mi tesis', 'debería', 'should'];
    let thesis: 0 | 1 | 2 | 3 | 4 | 5 = 0;
    if (thesisMarkers.some(m => first80.includes(m))) thesis = 4;
    else if (thesisMarkers.some(m => lower.includes(m))) thesis = 2;
    else if (sentences.length >= 2) thesis = 1;

    // Evidence: reasons/examples
    const evidenceMarkers = ['porque', 'por ejemplo', 'una razón', 'evidencia', 'además', 'también', 'because', 'for example', 'first', 'second', 'primero', 'segundo', 'razón 1', 'razón 2'];
    const evidenceHits = evidenceMarkers.filter(m => lower.includes(m)).length;
    let evidence: 0 | 1 | 2 | 3 | 4 | 5 = Math.min(5, evidenceHits * 2) as 0 | 1 | 2 | 3 | 4 | 5;
    if (evidence === 0 && sentences.length >= 3) evidence = 1;

    // Counterargument
    const counterMarkers = ['pero', 'sin embargo', 'aunque', 'however', 'on the other hand', 'algunos dicen', 'contraargumento', 'en contra'];
    const hasCounter = counterMarkers.some(m => lower.includes(m));
    const responseMarkers = ['respondo', 'respuesta', 'no obstante', 'aún así', 'esto no cambia', 'mi respuesta'];
    const hasResponse = responseMarkers.some(m => lower.includes(m));
    let counter: 0 | 1 | 2 | 3 | 4 | 5 = 0;
    if (hasCounter && hasResponse) counter = 5;
    else if (hasCounter) counter = 3;
    else if (lower.includes('otro') || lower.includes('difieren')) counter = 1;

    // Structure
    let structure: 0 | 1 | 2 | 3 | 4 | 5 = 0;
    if (paragraphs.length >= 3) structure = 4;
    else if (paragraphs.length >= 2) structure = 3;
    else if (sentences.length >= 4) structure = 2;
    else if (text.length > 80) structure = 1;
    if (lower.includes('tesis') || lower.includes('conclusión') || lower.includes('en resumen')) structure = Math.min(5, structure + 1) as 0 | 1 | 2 | 3 | 4 | 5;

    // Logic (fallacy detection)
    const fallacyKeywords = ['todos saben', 'es obvio', 'todo el mundo', 'nobody', 'everyone knows', 'ad hominem', 'eres tonto', 'eres estúpido'];
    const hasFallacy = fallacyKeywords.some(m => lower.includes(m));
    let logic: 0 | 1 | 2 | 3 | 4 | 5 = hasFallacy ? 1 : (sentences.length >= 3 ? 4 : 2);

    const total = thesis + evidence + counter + structure + logic;
    const notes = [
        thesis >= 3 ? '✓ Tesis clara' : '→ Comienza con tu posición clara ("Creo que...")',
        evidence >= 3 ? '✓ Buena evidencia' : '→ Agrega al menos 2 razones o ejemplos',
        counter >= 3 ? '✓ Contraargumento presente' : '→ Incluye un "pero/sin embargo" y responde',
        structure >= 3 ? '✓ Buena estructura' : '→ Usa párrafos separados',
        hasFallacy ? '⚠ Evita generalizaciones ("todos saben", "es obvio")' : '✓ Sin falacias detectadas',
    ].join('\n');

    return { scores: { thesis, evidence, counter, structure, logic, total }, notes };
}

// ─── AI Scoring (Gemini) ───

const AI_SAFETY_PREAMBLE = `You are a WRITING RUBRIC SCORER for children's educational essays. You ONLY evaluate writing quality on 5 dimensions. You MUST NOT discuss, engage with, or respond to the content of the text beyond scoring. You MUST NOT generate harmful, violent, sexual, or inappropriate content. If the text contains inappropriate content, score all dimensions as 0 and note "Contenido inapropiado". Respond ONLY with valid JSON.`;

async function scoreWithAI(text: string, promptTopic: string): Promise<{ scores: WritingScores; notes: string } | null> {
    try {
        const apiKey = localStorage.getItem('brainbro_gemini_key');
        if (!apiKey) return null;

        const sanitized = sanitizeUserText(text);
        const payload = {
            contents: [{
                parts: [{ text: `${AI_SAFETY_PREAMBLE}\n\nScore this student essay on topic "${promptTopic}".\n\nEssay:\n---\n${sanitized}\n---\n\nScore each dimension 0-5:\n- thesis: clear position statement near start\n- evidence: at least 2 reasons/examples\n- counter: includes counterargument and responds\n- structure: has paragraphs or labeled parts\n- logic: avoids obvious fallacies\n\nRespond ONLY with JSON: {"thesis":N,"evidence":N,"counter":N,"structure":N,"logic":N,"notes":"2 improvement tips in Spanish"}` }]
            }]
        };

        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!resp.ok) return null;
        const data = await resp.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        const parsed = JSON.parse(jsonMatch[0]);

        const clamp = (v: number): 0 | 1 | 2 | 3 | 4 | 5 => Math.max(0, Math.min(5, Math.round(v))) as 0 | 1 | 2 | 3 | 4 | 5;
        const scores: WritingScores = {
            thesis: clamp(parsed.thesis),
            evidence: clamp(parsed.evidence),
            counter: clamp(parsed.counter),
            structure: clamp(parsed.structure),
            logic: clamp(parsed.logic),
            total: 0,
        };
        scores.total = scores.thesis + scores.evidence + scores.counter + scores.structure + scores.logic;
        return { scores, notes: parsed.notes || '' };
    } catch {
        return null;
    }
}

// ─── Public Scoring API ───

export async function scoreWriting(text: string, prompt: WritingPrompt): Promise<{ scores: WritingScores; notes: string; mode: 'ai' | 'heuristic' }> {
    // Try AI first
    const aiResult = await scoreWithAI(text, prompt.topic);
    if (aiResult) {
        return { ...aiResult, mode: 'ai' };
    }
    // Fallback to heuristic
    const hResult = scoreHeuristic(text);
    return { ...hResult, mode: 'heuristic' };
}
