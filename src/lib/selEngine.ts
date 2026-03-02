/**
 * Phase 16.0: Social-Emotional & Ethics (SEE) Engine
 * Weekly micro-scenarios for impulse control, empathy, conflict resolution, ethical AI use.
 */

import type { AgeBand, SELScenario, SELAttempt, SELTheme } from '../types';
import { getLastSELWeekKey } from './storage';
import { filterPrompt } from './safetyPolicy';

// ─── Week Key ───

function getWeekKey(now: number): string {
    const d = new Date(now);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export { getWeekKey as getSELWeekKey };

// ─── Should Show ───

export function shouldShowSEL(dateNow: number): boolean {
    const weekKey = getWeekKey(dateNow);
    const lastWeek = getLastSELWeekKey();
    return lastWeek !== weekKey;
}

// ─── Scenario Bank (4 per band × 4 themes = 16 per band = 64 total) ───
// Keeping 4 per band (1 per theme) for manageable size. Deterministic rotation picks by week.

const SCENARIOS: SELScenario[] = [
    // ─── 6-8 ───
    { id: 'sel01', ageBand: '6-8', theme: 'impulse', scenario: 'Estás jugando un juego de mesa y pierdes. Sientes ganas de tirar las piezas.', prompts: ['¿Qué sientes en ese momento?', '¿Qué podrías hacer en vez de tirar las piezas?'] },
    { id: 'sel02', ageBand: '6-8', theme: 'empathy', scenario: 'Tu compañero no fue invitado a una fiesta y está triste en el recreo.', prompts: ['¿Cómo crees que se siente tu compañero?', '¿Qué podrías hacer para que se sienta mejor?'] },
    { id: 'sel03', ageBand: '6-8', theme: 'conflict', scenario: 'Dos amigos quieren jugar cosas diferentes en el recreo y empiezan a discutir.', prompts: ['¿Por qué crees que discuten?', '¿Cómo resolverías el problema para que ambos estén contentos?'] },
    { id: 'sel04', ageBand: '6-8', theme: 'ethics_ai', scenario: 'Tu maestra pide que dibujes tu animal favorito. Un amigo dice: "Pide a la computadora que lo haga por ti."', prompts: ['¿Está bien que la computadora haga tu tarea?', '¿Cuándo sí y cuándo no deberías usar una computadora para ayudarte?'] },

    // ─── 9-11 ───
    { id: 'sel05', ageBand: '9-11', theme: 'impulse', scenario: 'Recibes un mensaje en el grupo de clase que te molesta mucho. Quieres responder inmediatamente con algo fuerte.', prompts: ['¿Qué emoción sientes? ¿Qué impulso tienes?', '¿Qué pasaría si respondes con calma mañana en vez de ahora?'] },
    { id: 'sel06', ageBand: '9-11', theme: 'empathy', scenario: 'Un compañero nuevo llega a tu escuela. No habla bien el idioma y algunos se ríen de él.', prompts: ['¿Cómo crees que se siente el compañero nuevo?', '¿Qué harías tú? ¿Por qué?'] },
    { id: 'sel07', ageBand: '9-11', theme: 'conflict', scenario: 'Tu mejor amigo le contó un secreto tuyo a otra persona. Te sientes traicionado.', prompts: ['¿Cómo te sientes? Completa: "Yo siento ___ cuando ___"', '¿Qué le dirías a tu amigo para resolver esto?', '¿Qué podrían acordar para el futuro?'] },
    { id: 'sel08', ageBand: '9-11', theme: 'ethics_ai', scenario: 'Tienes que escribir un ensayo para la escuela. Un compañero dice: "Yo le pedí a ChatGPT que lo escribiera todo."', prompts: ['¿Qué opinas de lo que hizo tu compañero?', '¿Cómo usarías la IA de forma responsable para ese ensayo?'] },

    // ─── 12-14 ───
    { id: 'sel09', ageBand: '12-14', theme: 'impulse', scenario: 'Alguien publica un meme burlándose de ti en redes sociales. Varios lo comparten. Sientes rabia y vergüenza.', prompts: ['¿Qué emociones identificas? ¿Cuál es tu primer impulso?', '¿Qué consecuencias tendría actuar por impulso? ¿Qué harías después de una pausa de 10 minutos?'] },
    { id: 'sel10', ageBand: '12-14', theme: 'empathy', scenario: 'Tu amigo ha bajado sus calificaciones y sus padres lo castigan mucho. Últimamente está irritable contigo.', prompts: ['¿Qué podría estar sintiendo tu amigo que no dice?', '¿Cómo podrías apoyarlo sin invadir su espacio? Usa: "Desde su punto de vista..."'] },
    { id: 'sel11', ageBand: '12-14', theme: 'conflict', scenario: 'En un proyecto grupal, un miembro no hace su parte. El equipo está frustrado y quieren excluirlo.', prompts: ['Usa: "Yo siento ___ cuando ___, me gustaría ___"', '¿Qué pasos concretos propondrías para resolver el conflicto?', '¿Cómo podrían repartir el trabajo de forma justa?'] },
    { id: 'sel12', ageBand: '12-14', theme: 'ethics_ai', scenario: 'Un amigo usa IA para generar respuestas de examen y las comparte por grupo. Te las ofrecen.', prompts: ['¿Cuáles son las consecuencias de aceptar?', '¿Cómo podrías usar la IA éticamente para estudiar sin copiar?'] },

    // ─── 15-18 ───
    { id: 'sel13', ageBand: '15-18', theme: 'impulse', scenario: 'Un profesor te califica injustamente en público. Sientes humillación y quieres confrontarlo frente a todos.', prompts: ['¿Qué emociones sientes? Nombra al menos dos.', '¿Qué estrategia de regulación emocional usarías? ¿Cuál sería el mejor momento y forma para hablar con el profesor?'] },
    { id: 'sel14', ageBand: '15-18', theme: 'empathy', scenario: 'Un compañero sale del armario como LGBTQ+ y algunos del grupo empiezan a alejarse de él. Tú no compartes necesariamente su perspectiva pero notas su aislamiento.', prompts: ['¿Qué podría estar sintiendo esa persona? Usa perspectiva-taking.', '¿Qué podrías hacer que sea respetuoso sin comprometer tus propios valores?'] },
    { id: 'sel15', ageBand: '15-18', theme: 'conflict', scenario: 'Estás en un debate político con un familiar. La conversación se vuelve personal y agresiva.', prompts: ['Usa: "Yo siento ___ cuando ___, me gustaría ___"', '¿Cómo podrías desescalar sin ceder tu posición? Propón un paso concreto.', '¿Es posible llegar a un acuerdo parcial? ¿Cuál?'] },
    { id: 'sel16', ageBand: '15-18', theme: 'ethics_ai', scenario: 'Para tu proyecto de investigación, encuentras que una IA genera texto que parece original pero no cita fuentes. Tu universidad tiene políticas de integridad académica.', prompts: ['¿Cuáles son los riesgos éticos y académicos?', '¿Cómo usarías la IA como herramienta y no como sustituto? Menciona: verificar, citar, no datos personales.'] },
];

function dateHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) >>> 0;
    return h;
}

export function getSELScenario(ageBand: AgeBand, dateNow: number): SELScenario {
    const weekKey = getWeekKey(dateNow);
    const pool = SCENARIOS.filter(s => s.ageBand === ageBand);
    if (pool.length === 0) return SCENARIOS[0];
    const idx = dateHash(weekKey + 'sel') % pool.length;
    const scenario = pool[idx];
    return { ...scenario, scenario: filterPrompt(scenario.scenario, ageBand) };
}

// ─── Heuristic Scoring ───

function scoreHeuristic(answers: SELAttempt['answers'], theme: SELTheme): { score: 0 | 1 | 2 | 3 | 4 | 5; notes: string } {
    let score = 0;
    const tips: string[] = [];
    const all = [answers.a1, answers.a2, answers.a3 || ''].join(' ').toLowerCase();

    // +1 names emotion/impulse
    const emotionMarkers = ['siento', 'enojo', 'enoja', 'rabia', 'frustración', 'miedo', 'tristeza', 'vergüenza', 'impulso', 'ganas', 'cuesta', 'emoción', 'ansiedad', 'molest', 'triste', 'feliz', 'alegría'];
    if (emotionMarkers.some(m => all.includes(m))) { score++; }
    else { tips.push('→ Nombra la emoción o impulso que sientes'); }

    // +1 perspective-taking
    const perspMarkers = ['podría sentir', 'puede sentir', 'siente', 'desde su', 'punto de vista', 'perspectiva', 'en su lugar', 'se sentiría', 'piensa que', 'le afecta'];
    if (perspMarkers.some(m => all.includes(m))) { score++; }
    else { tips.push('→ Intenta ver la situación desde el punto de vista de la otra persona'); }

    // +1 respectful script
    const scriptMarkers = ['yo siento', 'cuando tú', 'me gustaría', 'te pido', 'podríamos', 'propongo', 'acordar', 'respetuos', 'calma', 'pausar', 'pausa'];
    if (scriptMarkers.some(m => all.includes(m))) { score++; }
    else { tips.push('→ Usa la fórmula: "Yo siento ___ cuando ___, me gustaría ___"'); }

    // +1 concrete next step / repair
    const repairMarkers = ['pedir perdón', 'disculpar', 'hablar', 'resolver', 'próximo paso', 'voy a', 'haría', 'propondría', 'acordar', 'compromiso', 'reparar', 'solución'];
    if (repairMarkers.some(m => all.includes(m))) { score++; }
    else { tips.push('→ Propón un paso concreto para reparar o mejorar la situación'); }

    // +1 ethical AI habit (for ethics_ai theme)
    if (theme === 'ethics_ai') {
        const ethicsMarkers = ['citar', 'verificar', 'no copiar', 'fuente', 'datos personales', 'integridad', 'ético', 'responsable', 'herramienta', 'no sustitu'];
        if (ethicsMarkers.some(m => all.includes(m))) { score++; }
        else { tips.push('→ Menciona prácticas éticas: verificar, citar fuentes, no compartir datos personales'); }
    } else {
        // +1 meta-awareness for non-ethics themes
        const metaMarkers = ['me doy cuenta', 'reconozco', 'aprendí', 'la próxima vez', 'entiendo que', 'reflexion', 'importante'];
        if (metaMarkers.some(m => all.includes(m))) { score++; }
        else { tips.push('→ Reflexiona sobre qué aprendiste de esta situación'); }
    }

    const clamped = Math.min(5, score) as 0 | 1 | 2 | 3 | 4 | 5;
    const notes = tips.length > 0 ? tips.slice(0, 2).join('\n') : '✓ Excelente respuesta socioemocional';
    return { score: clamped, notes };
}

// ─── AI Scoring ───

const AI_SAFETY_PREAMBLE = `You are a SOCIAL-EMOTIONAL LEARNING SCORER for children's exercises. You ONLY evaluate socio-emotional competency on 5 dimensions. You MUST NOT provide therapy, diagnosis, or mental health advice. You MUST NOT generate harmful content. Respond ONLY with valid JSON.`;

function sanitizeText(text: string): string {
    return text.replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, '').slice(0, 3000);
}

async function scoreWithAI(answers: SELAttempt['answers'], scenario: SELScenario): Promise<{ score: 0 | 1 | 2 | 3 | 4 | 5; notes: string } | null> {
    try {
        const apiKey = localStorage.getItem('brainbro_gemini_key');
        if (!apiKey) return null;

        const payload = {
            contents: [{
                parts: [{ text: `${AI_SAFETY_PREAMBLE}\n\nScenario (theme: ${scenario.theme}): "${sanitizeText(scenario.scenario)}"\n\nStudent answers:\n- A1: ${sanitizeText(answers.a1)}\n- A2: ${sanitizeText(answers.a2)}\n${answers.a3 ? `- A3: ${sanitizeText(answers.a3)}` : ''}\n\nScore 0-5 total based on:\n+1 names emotion or impulse\n+1 perspective-taking (considers other's feelings)\n+1 uses respectful communication script\n+1 proposes concrete repair/next step\n+1 ${scenario.theme === 'ethics_ai' ? 'ethical AI habit (cite, verify, no personal data)' : 'shows self-awareness or reflection'}\n\nRespond ONLY with JSON: {"score":N,"notes":"2 improvement tips in Spanish"}` }]
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
        const clamped = Math.max(0, Math.min(5, Math.round(parsed.score))) as 0 | 1 | 2 | 3 | 4 | 5;
        return { score: clamped, notes: parsed.notes || '' };
    } catch {
        return null;
    }
}

// ─── Public API ───

export async function scoreSEL(answers: SELAttempt['answers'], scenario: SELScenario): Promise<{ score: 0 | 1 | 2 | 3 | 4 | 5; notes: string; mode: 'ai' | 'heuristic' }> {
    const aiResult = await scoreWithAI(answers, scenario);
    if (aiResult) return { ...aiResult, mode: 'ai' };
    const hResult = scoreHeuristic(answers, scenario.theme);
    return { ...hResult, mode: 'heuristic' };
}
