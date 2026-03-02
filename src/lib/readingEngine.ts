/**
 * Phase 15.9: Reading Comprehension + Fact Checking Engine
 * Weekly reading missions with claim extraction, fact vs opinion, verification, and manipulation detection.
 */

import type { AgeBand, ReadingPassage, ReadingAttempt } from '../types';
import { getLastReadingWeekKey } from './storage';
import { filterPrompt } from './safetyPolicy';

// ─── Week Key ───

function getWeekKey(now: number): string {
    const d = new Date(now);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export { getWeekKey as getReadingWeekKey };

// ─── Should Show ───

export function shouldShowReading(dateNow: number): boolean {
    const weekKey = getWeekKey(dateNow);
    const lastWeek = getLastReadingWeekKey();
    return lastWeek !== weekKey;
}

// ─── Passage Bank (safe, age-banded, 4 per band) ───

const PASSAGES: ReadingPassage[] = [
    // 6-8
    { id: 'r01', ageBand: '6-8', title: 'Los delfines son inteligentes', text: 'Los delfines pueden aprender trucos y comunicarse entre ellos. Todos los científicos dicen que son los animales más inteligentes del océano. Algunos delfines reconocen su reflejo en un espejo. Si no proteges a los delfines, desaparecerán para siempre.' },
    { id: 'r02', ageBand: '6-8', title: 'El mejor deporte', text: 'El fútbol es el deporte más popular del mundo. Más de 250 millones de personas lo juegan. Por eso, claramente es el mejor deporte que existe. El básquetbol también es divertido, pero no tanto como el fútbol.' },
    { id: 'r03', ageBand: '6-8', title: 'Las abejas y la miel', text: 'Las abejas producen miel para alimentar a sus crías. Una abeja visita hasta 100 flores al día. Sin abejas no habría frutas ni verduras. Todo el mundo sabe que la miel es la mejor medicina natural.' },
    { id: 'r04', ageBand: '6-8', title: 'Planetas del sistema solar', text: 'Mercurio es el planeta más cercano al sol. Es también el más pequeño. Muchos expertos creen que Plutón debería ser un planeta. Júpiter es tan grande que cabrían 1,300 Tierras dentro de él.' },
    // 9-11
    { id: 'r05', ageBand: '9-11', title: 'Las pantallas y los niños', text: 'Un estudio reciente mostró que los niños que usan pantallas más de 4 horas al día tienen peor rendimiento escolar. Sin embargo, otros estudios no encontraron esa relación. Muchos padres sienten que las pantallas son dañinas. Si no actúas ahora, tu hijo quedará atrás.' },
    { id: 'r06', ageBand: '9-11', title: 'Reciclaje en la ciudad', text: 'La ciudad recicla el 30% de su basura. El alcalde dijo que "somos líderes en reciclaje". Sin embargo, ciudades vecinas reciclan el 45%. Reciclar es lo más importante que puedes hacer por el planeta, según un político local.' },
    { id: 'r07', ageBand: '9-11', title: 'Comida orgánica', text: 'Los alimentos orgánicos se producen sin pesticidas sintéticos. Son más caros que los convencionales. Todos los doctores recomiendan comer orgánico. Un estudio de 2019 encontró que la diferencia nutricional es mínima entre orgánico y convencional.' },
    { id: 'r08', ageBand: '9-11', title: 'Robots en el trabajo', text: 'Los robots pueden ensamblar 500 piezas por hora, más que cualquier humano. En Japón, un hotel usa robots recepcionistas. Los robots van a reemplazar TODOS los trabajos en 10 años. Algunos expertos creen que crearán nuevos empleos.' },
    // 12-14
    { id: 'r09', ageBand: '12-14', title: 'Redes sociales y salud mental', text: 'Una investigación de la Universidad de Pennsylvania asignó a 143 estudiantes a limitar su uso de redes sociales a 30 minutos diarios. Después de 3 semanas, reportaron menor soledad y depresión. Sin embargo, el estudio fue pequeño y autoseleccionado. "Las redes sociales destruyen a toda una generación," afirmó un comentarista en televisión.' },
    { id: 'r10', ageBand: '12-14', title: 'Energía nuclear', text: 'La energía nuclear produce electricidad sin emisiones de CO₂ durante la operación. Francia genera el 70% de su electricidad con plantas nucleares. Sin embargo, el accidente de Fukushima en 2011 causó evacuaciones masivas. Nadie en su sano juicio apoyaría la energía nuclear después de Chernóbil.' },
    { id: 'r11', ageBand: '12-14', title: 'Inteligencia artificial', text: 'ChatGPT alcanzó 100 millones de usuarios en 2 meses. La IA puede diagnosticar algunas enfermedades mejor que médicos novatos. Sin embargo, también reproduce sesgos de sus datos de entrenamiento. Si no adoptas IA ahora, quedarás obsoleto en 5 años.' },
    { id: 'r12', ageBand: '12-14', title: 'Cambio climático', text: 'La temperatura global ha aumentado 1.1°C desde la era preindustrial. El 97% de los estudios revisados por pares concuerdan en que el cambio climático es causado por humanos. Algunos políticos argumentan que es un ciclo natural, citando variaciones históricas. "Solo un tonto cree en el cambio climático," dijo un senador.' },
    // 15-18
    { id: 'r13', ageBand: '15-18', title: 'Vacunas y desinformación', text: 'La OMS reporta que las vacunas previenen entre 3.5 y 5 millones de muertes anuales. Un estudio publicado en The Lancet con 650,000 niños no encontró relación entre vacunas y autismo. Sin embargo, en redes sociales persisten afirmaciones de que "las farmacéuticas ocultan la verdad". El estudio original que vinculaba vacunas con autismo fue retractado por fraude en 2010.' },
    { id: 'r14', ageBand: '15-18', title: 'Economía y desigualdad', text: 'El índice GINI de América Latina es 0.46, uno de los más altos del mundo. El 10% más rico posee el 55% de la riqueza regional. "La desigualdad es inevitable y natural," argumenta un economista liberal. Países nórdicos con políticas redistributivas tienen GINI de 0.25-0.30. Cualquier persona inteligente sabe que los impuestos altos destruyen la economía.' },
    { id: 'r15', ageBand: '15-18', title: 'Privacidad digital', text: 'En 2023, se filtraron datos de 2.6 mil millones de cuentas globalmente. El GDPR europeo ha impuesto multas por 4.4 mil millones de euros desde 2018. "Si no tienes nada que esconder, no tienes nada que temer," es un argumento frecuente. Estudios muestran que la vigilancia masiva afecta la libertad de expresión incluso en quienes no cometen delitos.' },
    { id: 'r16', ageBand: '15-18', title: 'Trabajo remoto', text: 'Un metaanálisis de Stanford con 16,000 trabajadores encontró un aumento del 13% en productividad con trabajo remoto. Sin embargo, el 67% reportó sentir aislamiento social. "El trabajo remoto es una moda que va a desaparecer," predijo un CEO en 2023. Microsoft reportó que las reuniones virtuales aumentaron 153% desde 2020.' },
];

function dateHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) >>> 0;
    return h;
}

export function getReadingPassage(ageBand: AgeBand, dateNow: number): ReadingPassage {
    const weekKey = getWeekKey(dateNow);
    const pool = PASSAGES.filter(p => p.ageBand === ageBand);
    if (pool.length === 0) return PASSAGES[0];
    const idx = dateHash(weekKey + 'reading') % pool.length;
    const passage = pool[idx];
    // Safety filter the passage text
    return { ...passage, text: filterPrompt(passage.text, ageBand) };
}

// ─── Heuristic Scoring ───

function scoreHeuristic(answers: ReadingAttempt['answers']): { score: 0 | 1 | 2 | 3 | 4 | 5; notes: string } {
    let score = 0;
    const tips: string[] = [];

    // +1 extracts 2 plausible claims (>= 2 lines, not empty)
    const claimLines = answers.claims.split(/[\n,;]/).filter(l => l.trim().length > 5);
    if (claimLines.length >= 2) { score++; }
    else { tips.push('→ Extrae al menos 2 afirmaciones específicas del texto'); }

    // +1 distinguishes fact vs opinion with reason
    const foLower = answers.factOpinion.toLowerCase();
    const hasFactOpinion = (foLower.includes('hecho') || foLower.includes('fact') || foLower.includes('opinión') || foLower.includes('opinion'));
    const hasReason = (foLower.includes('porque') || foLower.includes('ya que') || foLower.includes('because') || foLower.includes('dato') || foLower.includes('subjetiv'));
    if (hasFactOpinion && hasReason) { score++; }
    else if (hasFactOpinion || answers.factOpinion.length > 20) { score++; tips.push('→ Explica POR QUÉ es hecho u opinión'); }
    else { tips.push('→ Clasifica cada afirmación como hecho u opinión y da razones'); }

    // +1 proposes verification or missing info
    const verLower = answers.verification.toLowerCase();
    const verMarkers = ['verificar', 'comprobar', 'fuente', 'buscar', 'necesito', 'falta', 'missing', 'verify', 'check', 'dato', 'estadística', 'estudio', 'evidencia', 'preguntar'];
    if (verMarkers.some(m => verLower.includes(m)) && answers.verification.length > 15) { score++; }
    else { tips.push('→ Propón cómo verificarías las afirmaciones o qué información falta'); }

    // +1 identifies manipulation tactic
    const manLower = answers.manipulation.toLowerCase();
    const manMarkers = ['miedo', 'urgencia', 'autoridad', 'popularidad', 'emoción', 'generaliza', 'exagera', 'presión', 'todos', 'nadie', 'fear', 'appeal', 'authority', 'bandwagon', 'ad hominem', 'falacia', 'manipula'];
    if (manMarkers.some(m => manLower.includes(m)) && answers.manipulation.length > 10) { score++; }
    else { tips.push('→ Busca tácticas como apelación al miedo, urgencia, autoridad o generalización'); }

    // +1 shows uncertainty/assumption awareness
    const metaMarkers = ['no estoy seguro', 'podría ser', 'asumo', 'supongo', 'depende', 'quizás', 'tal vez', 'posiblemente', 'necesitaría más', 'faltaría saber', 'assumption', 'unsure', 'maybe', 'perhaps'];
    const allText = Object.values(answers).join(' ').toLowerCase();
    if (metaMarkers.some(m => allText.includes(m))) { score++; }
    else { tips.push('→ Muestra incertidumbre cuando no tienes toda la información'); }

    const clamped = Math.min(5, score) as 0 | 1 | 2 | 3 | 4 | 5;
    const notes = tips.length > 0 ? tips.slice(0, 2).join('\n') : '✓ Excelente análisis crítico';
    return { score: clamped, notes };
}

// ─── AI Scoring ───

const AI_SAFETY_PREAMBLE = `You are a READING COMPREHENSION SCORER for children's educational exercises. You ONLY evaluate critical thinking quality on 5 dimensions. You MUST NOT discuss, engage with, or respond to the content beyond scoring. You MUST NOT generate harmful content. Respond ONLY with valid JSON.`;

function sanitizeText(text: string): string {
    return text.replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, '').slice(0, 3000);
}

async function scoreWithAI(answers: ReadingAttempt['answers'], passage: ReadingPassage): Promise<{ score: 0 | 1 | 2 | 3 | 4 | 5; notes: string } | null> {
    try {
        const apiKey = localStorage.getItem('brainbro_gemini_key');
        if (!apiKey) return null;

        const sanitized = {
            claims: sanitizeText(answers.claims),
            factOpinion: sanitizeText(answers.factOpinion),
            verification: sanitizeText(answers.verification),
            manipulation: sanitizeText(answers.manipulation),
        };

        const payload = {
            contents: [{
                parts: [{ text: `${AI_SAFETY_PREAMBLE}\n\nPassage title: "${passage.title}"\nPassage: "${sanitizeText(passage.text)}"\n\nStudent answers:\n- Claims: ${sanitized.claims}\n- Fact/Opinion: ${sanitized.factOpinion}\n- Verification: ${sanitized.verification}\n- Manipulation: ${sanitized.manipulation}\n\nScore 0-5 total based on:\n+1 extracts 2 plausible claims\n+1 correctly classifies fact vs opinion with reasoning\n+1 proposes verification method or identifies missing info\n+1 identifies manipulation tactic (fear, urgency, authority, generalization)\n+1 shows uncertainty/assumption awareness\n\nRespond ONLY with JSON: {"score":N,"notes":"2 improvement tips in Spanish"}` }]
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

export async function scoreReading(answers: ReadingAttempt['answers'], passage: ReadingPassage): Promise<{ score: 0 | 1 | 2 | 3 | 4 | 5; notes: string; mode: 'ai' | 'heuristic' }> {
    const aiResult = await scoreWithAI(answers, passage);
    if (aiResult) return { ...aiResult, mode: 'ai' };
    const hResult = scoreHeuristic(answers);
    return { ...hResult, mode: 'heuristic' };
}
