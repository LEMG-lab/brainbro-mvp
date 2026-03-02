/**
 * Phase 14.8: Transfer & Real-World Decision Lab (TRDL)
 * Weekly labs forcing real-life application of cognitive skills.
 */

export type DecisionLabTheme = 'money' | 'social' | 'time' | 'safety' | 'ethics_ai';

import { childLS } from './childStorage';
import { filterPrompt, getActiveAgeBand } from './safetyPolicy';

export interface DecisionLabScenario {
    id: string;
    theme: DecisionLabTheme;
    scenario: string;
    questions: string[];
    scoringRubric: string[];
}

export interface DecisionLabScore {
    score: 0 | 1 | 2 | 3 | 4 | 5;
    notes: string;
}


const THEME_LABELS: Record<DecisionLabTheme, string> = {
    money: 'Decisiones de Dinero',
    social: 'Presión Social',
    time: 'Gestión del Tiempo',
    safety: 'Seguridad Digital',
    ethics_ai: 'Ética e IA',
};

export { THEME_LABELS };

const SCENARIOS: DecisionLabScenario[] = [
    // MONEY
    { id: 'dl-money-1', theme: 'money', scenario: 'Tu amigo te ofrece comprar un juego con descuento del 50%, pero solo hoy. Tienes el dinero ahorrado para otra cosa que querías.', questions: ['¿Qué sacrificas si compras el juego? (costo de oportunidad)', '¿Cómo verificarías si realmente es buen precio?'], scoringRubric: ['tradeoff', 'verificar'] },
    { id: 'dl-money-2', theme: 'money', scenario: 'Recibes $500 de regalo. Puedes gastarlo ahora o ahorrarlo. Tu grupo de amigos dice "gástalo, YOLO".', questions: ['¿Qué harías y por qué? Menciona al menos 1 riesgo.', '¿Cómo resistirías la presión del grupo?'], scoringRubric: ['riesgo', 'prueba_social'] },
    // SOCIAL
    { id: 'dl-social-1', theme: 'social', scenario: 'En clase, todos copian la tarea de alguien. Te presionan para que tú también lo hagas.', questions: ['¿Qué consecuencias de segundo orden tendría copiar?', '¿Qué le dirías al grupo? ¿Cómo te protegerías?'], scoringRubric: ['consecuencia', 'prueba_social'] },
    { id: 'dl-social-2', theme: 'social', scenario: 'Un influencer dice que un producto es "increíble" y todos tus amigos lo quieren. Es caro.', questions: ['¿Cómo verificarías si realmente vale la pena?', '¿Qué modelo mental aplicarías?'], scoringRubric: ['verificar', 'modelo'] },
    // TIME
    { id: 'dl-time-1', theme: 'time', scenario: 'Tienes examen mañana, pero tu amigo quiere jugar online. Dice "solo 30 minutos".', questions: ['¿Cuál es el verdadero costo de esos 30 minutos?', '¿Qué plan B tendrías si la partida se extiende?'], scoringRubric: ['tradeoff', 'plan_b'] },
    { id: 'dl-time-2', theme: 'time', scenario: 'Puedes estudiar 2 horas o ver 4 videos de TikTok educativos. ¿Qué eliges?', questions: ['¿Cuál tiene mayor valor esperado para tu aprendizaje?', '¿Qué suposición estás haciendo sobre los videos?'], scoringRubric: ['tradeoff', 'suposicion'] },
    // SAFETY
    { id: 'dl-safety-1', theme: 'safety', scenario: 'Recibes un enlace de un "amigo" que dice "mira esto, es urgente". No esperabas ningún mensaje.', questions: ['Lista 2 señales de que podría ser peligroso.', '¿Qué pasos seguirías antes de hacer clic?'], scoringRubric: ['riesgo', 'verificar'] },
    { id: 'dl-safety-2', theme: 'safety', scenario: 'Una app nueva te pide acceso a tu cámara, micrófono, contactos y ubicación para "funcionar mejor".', questions: ['¿Qué riesgos hay en dar todos esos permisos?', '¿Qué información extra necesitarías para decidir?'], scoringRubric: ['riesgo', 'verificar'] },
    // ETHICS_AI
    { id: 'dl-ethics-1', theme: 'ethics_ai', scenario: 'Tu compañero usa ChatGPT para hacer toda su tarea y saca 10. Tú estudias y sacas 8.', questions: ['¿Qué está perdiendo tu compañero a largo plazo?', '¿Cuándo SÍ sería correcto usar IA y cuándo NO?'], scoringRubric: ['consecuencia', 'tradeoff'] },
    { id: 'dl-ethics-2', theme: 'ethics_ai', scenario: 'Una IA te da una respuesta que "suena correcta" pero no cita fuentes. Tu profesor dice que lo verifiques.', questions: ['¿Cómo verificarías la información?', '¿Qué sesgo podrías tener al confiar en la IA?'], scoringRubric: ['verificar', 'sesgo'] },
];

function getWeekNumber(dateNow: number): number {
    const d = new Date(dateNow);
    const start = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

export function shouldShowDecisionLab(dateNow: number): boolean {
    const lastSeenWeek = childLS.getItem('brainbro_decision_lab_last_seen_week_v1');
    const currentWeek = `${new Date(dateNow).getFullYear()}-W${getWeekNumber(dateNow)}`;
    if (lastSeenWeek === currentWeek) return false;
    // Show on Sunday (day 0) or anytime if not yet completed this week
    return true;
}

export function markDecisionLabCompleted(dateNow: number): void {
    const currentWeek = `${new Date(dateNow).getFullYear()}-W${getWeekNumber(dateNow)}`;
    childLS.setItem('brainbro_decision_lab_last_seen_week_v1', currentWeek);
}

export function getWeeklyDecisionLab(dateNow: number): DecisionLabScenario {
    const weekNum = getWeekNumber(dateNow);
    const base = SCENARIOS[weekNum % SCENARIOS.length];
    const band = getActiveAgeBand();
    return {
        ...base,
        scenario: filterPrompt(base.scenario, band),
        questions: base.questions.map(q => filterPrompt(q, band)),
    };
}

// Scoring rubric keywords
const TRADEOFF_KW = ['sacrific', 'costo', 'oportunidad', 'pierdo', 'renuncio', 'a cambio', 'trade', 'alternativa'];
const RISK_KW = ['riesgo', 'peligro', 'peor caso', 'consecuencia', 'negativ', 'daño', 'perjuicio'];
const VERIFY_KW = ['verificar', 'comprobar', 'investigar', 'buscar', 'confirmar', 'revisar', 'fuente', 'evidencia'];
const SOCIAL_KW = ['no sigo', 'por mi cuenta', 'no porque todos', 'pienso por mí', 'presión', 'independiente', 'no caer'];
const MODEL_KW = ['modelo mental', 'costo de oportunidad', 'segundo orden', 'valor esperado', 'margen de seguridad', 'incentivo', 'sesgo'];

export function scoreDecisionLab(answers: Record<string, string>): DecisionLabScore {
    const combined = Object.values(answers).join(' ').toLowerCase();
    if (combined.trim().length < 20) return { score: 0, notes: 'Respuestas demasiado cortas.' };

    let score = 0;
    const markers: string[] = [];

    if (TRADEOFF_KW.some(kw => combined.includes(kw))) { score++; markers.push('tradeoff'); }
    if (RISK_KW.some(kw => combined.includes(kw))) { score++; markers.push('riesgo'); }
    if (VERIFY_KW.some(kw => combined.includes(kw))) { score++; markers.push('verificación'); }
    if (SOCIAL_KW.some(kw => combined.includes(kw))) { score++; markers.push('anti-social-proof'); }
    if (MODEL_KW.some(kw => combined.includes(kw))) { score++; markers.push('modelo mental'); }

    const capped = Math.min(5, score) as 0 | 1 | 2 | 3 | 4 | 5;
    const notes = markers.length > 0
        ? `Detectado: ${markers.join(', ')}.`
        : 'No se detectaron marcadores de pensamiento crítico.';

    return { score: capped, notes };
}

export function getDecisionLabImprovement(score: number, theme: DecisionLabTheme): string {
    if (score >= 4) return 'Excelente análisis de decisión.';
    if (score >= 3) return 'Buen análisis. Intenta mencionar modelos mentales específicos.';
    const hints: Record<DecisionLabTheme, string> = {
        money: 'Practica identificar costos de oportunidad antes de cada compra.',
        social: 'Cuestiona siempre: "¿esto lo quiero yo o lo quiere el grupo?"',
        time: 'Estima el valor esperado real de cada actividad antes de elegir.',
        safety: 'Ante enlaces o solicitudes sospechosas, siempre verifica la fuente.',
        ethics_ai: 'Pregúntate: "¿qué habilidad pierdo si la IA lo hace por mí?"',
    };
    return hints[theme];
}
