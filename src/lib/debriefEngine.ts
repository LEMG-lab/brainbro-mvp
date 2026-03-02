/**
 * Phase 16.1: Coach Debrief Engine
 * Auto-generates weekly 5-minute parent debrief scripts from actual child metrics.
 */

import { getOpsSummary, type OpsSummary } from './parentOps';

// ─── Week Key ───

function getWeekKey(now: number): string {
    const d = new Date(now);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export { getWeekKey as getDebriefWeekKey };

// ─── Deterministic Debrief Builder ───

interface DebriefData {
    weekKey: string;
    wins: string[];
    concerns: string[];
    focus: string;
    questions: string[];
    exercise: string;
    settingsTweak: string | null;
}

function buildDeterministic(summary: OpsSummary, _childId: string): DebriefData {
    const wins: string[] = [];
    const concerns: string[] = [];
    const questions: string[] = [];
    const m = summary.metrics;

    // ─── WINS (pick top 3) ───
    const winPool: { priority: number; text: string }[] = [];

    if (m.calibration >= 0.7) winPool.push({ priority: 5, text: `Calibración excelente (${(m.calibration * 100).toFixed(0)}%) — sabe evaluar qué tan seguro está de sus respuestas` });
    if (m.reflection >= 3.5) winPool.push({ priority: 4, text: `Reflexiones de alta calidad (EWMA ${m.reflection.toFixed(1)}/5) — demuestra pensamiento profundo` });
    if (m.metaCognition >= 3) winPool.push({ priority: 4, text: `Buena metacognición (${m.metaCognition.toFixed(1)}/5) — reconoce qué sabe y qué no` });
    if (m.adversarialPass >= 0.7) winPool.push({ priority: 3, text: `Resiste bien la presión adversarial (${(m.adversarialPass * 100).toFixed(0)}%) — no cambia respuestas correctas bajo presión` });
    if (summary.writing.ewma >= 3.5) winPool.push({ priority: 4, text: `Escritura y argumentación fuerte (EWMA ${summary.writing.ewma.toFixed(1)}/5)` });
    if (summary.reading.ewma >= 3.5) winPool.push({ priority: 4, text: `Comprensión lectora destacada (EWMA ${summary.reading.ewma.toFixed(1)}/5)` });
    if (summary.sel.ewma >= 3.5) winPool.push({ priority: 4, text: `Habilidades socioemocionales fuertes (EWMA ${summary.sel.ewma.toFixed(1)}/5)` });
    if (summary.followThrough.rate >= 0.8) winPool.push({ priority: 3, text: `Alto cumplimiento de compromisos (${(summary.followThrough.rate * 100).toFixed(0)}%)` });
    if (summary.planIntegrity.avg7d >= 80) winPool.push({ priority: 3, text: `Integridad del plan alta (${summary.planIntegrity.avg7d.toFixed(0)}%) — completa las tareas con evidencia` });
    if (m.vocabMastered > 0) winPool.push({ priority: 2, text: `${m.vocabMastered} palabras dominadas en vocabulario` });
    if (summary.sessionsCount >= 5) winPool.push({ priority: 2, text: `${summary.sessionsCount} sesiones completadas esta semana — consistencia` });
    if (summary.streakData && summary.streakData.current >= 3) winPool.push({ priority: 3, text: `Racha activa de ${summary.streakData.current} días` });

    // Fallback wins
    if (winPool.length === 0) winPool.push({ priority: 1, text: 'Ha participado en las actividades de la semana' });

    winPool.sort((a, b) => b.priority - a.priority);
    wins.push(...winPool.slice(0, 3).map(w => w.text));

    // ─── CONCERNS (pick top 2) ───
    const concernPool: { priority: number; text: string }[] = [];

    if (m.overconfidence > 0.3) concernPool.push({ priority: 5, text: `Sobreconfianza elevada (${(m.overconfidence * 100).toFixed(0)}%) — reporta alta confianza en respuestas incorrectas` });
    if (summary.followThrough.rate < 0.5 && summary.followThrough.completed + summary.followThrough.skipped > 0) concernPool.push({ priority: 4, text: `Bajo cumplimiento de compromisos (${(summary.followThrough.rate * 100).toFixed(0)}%) — dice que hará algo pero no lo completa` });
    if (summary.planIntegrity.flaggedDays > 2) concernPool.push({ priority: 4, text: `${summary.planIntegrity.flaggedDays} días con integridad baja — posible uso superficial de las actividades` });
    if (m.metaCognition < 2) concernPool.push({ priority: 3, text: `Metacognición baja (${m.metaCognition.toFixed(1)}/5) — dificultad para evaluar su propio conocimiento` });
    if (m.adversarialPass < 0.4) concernPool.push({ priority: 3, text: `Susceptible a presión (${(m.adversarialPass * 100).toFixed(0)}% pass) — cambia respuestas correctas cuando se le cuestiona` });
    if (summary.writing.ewma > 0 && summary.writing.ewma < 2) concernPool.push({ priority: 3, text: `Escritura necesita refuerzo (EWMA ${summary.writing.ewma.toFixed(1)}/5)` });
    if (summary.reading.ewma > 0 && summary.reading.ewma < 2) concernPool.push({ priority: 3, text: `Comprensión lectora baja (EWMA ${summary.reading.ewma.toFixed(1)}/5)` });
    if (summary.sel.ewma > 0 && summary.sel.ewma < 2) concernPool.push({ priority: 3, text: `Habilidades socioemocionales necesitan práctica (EWMA ${summary.sel.ewma.toFixed(1)}/5)` });
    if (m.vocabDue > 20) concernPool.push({ priority: 2, text: `${m.vocabDue} palabras pendientes de repaso en vocabulario` });

    if (concernPool.length === 0) concernPool.push({ priority: 1, text: 'Sin preocupaciones significativas esta semana' });

    concernPool.sort((a, b) => b.priority - a.priority);
    concerns.push(...concernPool.slice(0, 2).map(c => c.text));

    // ─── FOCUS (biggest bottleneck) ───
    let focus = 'Mantener la consistencia y valorar el proceso sobre el resultado';
    if (m.overconfidence > 0.3) focus = 'Reducir sobreconfianza — practicar decir "no estoy seguro" cuando no sabe';
    else if (m.metaCognition < 2) focus = 'Mejorar metacognición — antes de responder, preguntarse "¿qué tan seguro estoy y por qué?"';
    else if (summary.followThrough.rate < 0.5) focus = 'Cumplir compromisos — escribir metas pequeñas y verificar al día siguiente';
    else if (m.adversarialPass < 0.4) focus = 'Construir firmeza — practicar defender respuestas con evidencia';
    else if (m.reflection < 2) focus = 'Profundizar reflexiones — escribir "qué aprendí" después de cada sesión';

    // ─── QUESTIONS (tailored to focus) ───
    if (m.overconfidence > 0.3) {
        questions.push('¿Qué te haría cambiar de opinión sobre algo que crees saber?');
        questions.push('¿Puedes pensar en algo que estabas seguro de saber pero resultó estar mal?');
        questions.push('¿Cómo decides cuánta confianza darle a algo?');
    } else if (m.metaCognition < 2) {
        questions.push('¿Cómo sabes cuándo realmente entiendes algo vs solo lo memorizaste?');
        questions.push('¿Qué haces cuando no entiendes algo?');
        questions.push('¿Puedes explicarme lo que aprendiste hoy con tus propias palabras?');
    } else if (summary.followThrough.rate < 0.5) {
        questions.push('¿Qué te impidió hacer lo que te propusiste ayer?');
        questions.push('¿Cómo podríamos hacer que tus metas sean más alcanzables?');
        questions.push('¿Qué necesitas para cumplir tus compromisos?');
    } else {
        questions.push('¿Qué fue lo más interesante que aprendiste esta semana?');
        questions.push('¿Hubo algo en lo que cambiaste de opinión? ¿Por qué?');
        questions.push('¿Qué quisieras explorar más la próxima semana?');
    }

    // ─── EXERCISE (10 min) ───
    const exercises = [
        { cond: m.overconfidence > 0.3, text: '**Juego de estimación**: Hazle 5 preguntas de cultura general. Por cada una, pide que diga "seguro", "creo que sí" o "no sé" ANTES de responder. Comparar confianza vs resultado.' },
        { cond: m.adversarialPass < 0.4, text: '**Defensa de ideas**: Elige un tema que le guste. Pide que defienda su posición mientras tú haces de "abogado del diablo". Observa si cambia de opinión con presión vs evidencia.' },
        { cond: summary.reading.ewma > 0 && summary.reading.ewma < 3, text: '**Verificación de noticias**: Lee juntos un artículo corto. Pide que identifique 2 hechos y 1 opinión, y proponga cómo verificar los hechos.' },
        { cond: summary.sel.ewma > 0 && summary.sel.ewma < 3, text: '**Práctica de script de conflicto**: Planteen un escenario imaginario (ej: amigo copia tu tarea). Practiquen la fórmula: "Yo siento ___ cuando ___, me gustaría ___".' },
        { cond: summary.writing.ewma > 0 && summary.writing.ewma < 3, text: '**Mini-ensayo oral**: Elige un tema. Dale 2 minutos para pensar y luego 3 minutos para explicar su posición con UN argumento y UN contraargumento.' },
        { cond: true, text: '**Diario de "no sé"**: Durante la cena, cada miembro de la familia comparte algo que NO sabe y le gustaría aprender. Normaliza la incertidumbre.' },
    ];

    const exercise = exercises.find(e => e.cond)?.text || exercises[exercises.length - 1].text;

    // ─── SETTINGS TWEAK ───
    let settingsTweak: string | null = null;
    if (summary.planIntegrity.avg7d < 50) settingsTweak = 'Considere reducir los minutos semanales del Autopilot si el niño se siente abrumado.';
    else if (summary.sessionsCount < 2 && summary.xpTotal < 10) settingsTweak = 'Considere activar recordatorios o ajustar los horarios del programa.';

    return { weekKey: '', wins, concerns, focus, questions, exercise, settingsTweak };
}

function dataToMarkdown(data: DebriefData, weekKey: string): string {
    const lines: string[] = [];
    lines.push(`# 🎯 Debrief Semanal — ${weekKey}`);
    lines.push(`_Script de 5 minutos para conversación con tu hijo_\n`);

    lines.push('## ✅ Victorias de la semana');
    data.wins.forEach(w => lines.push(`- ${w}`));
    lines.push('');

    lines.push('## ⚠️ Puntos de atención');
    data.concerns.forEach(c => lines.push(`- ${c}`));
    lines.push('');

    lines.push('## 🎯 Foco para la próxima semana');
    lines.push(`> ${data.focus}\n`);

    lines.push('## 💬 Preguntas para hacerle');
    data.questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    lines.push('');

    lines.push('## 🧪 Ejercicio real (10 min)');
    lines.push(data.exercise);
    lines.push('');

    if (data.settingsTweak) {
        lines.push('## ⚙️ Ajuste sugerido');
        lines.push(`> ${data.settingsTweak}\n`);
    }

    lines.push('---');
    lines.push('_Generado automáticamente por BrainBro basado en datos reales de la semana._');

    return lines.join('\n');
}

// ─── AI Polish (optional) ───

const AI_SAFETY_PREAMBLE = `You are a PARENT COACHING assistant for BrainBro, an educational app. You rewrite structured debrief bullets into a warm, friendly tone for parents. You MUST NOT add medical, psychological, or therapeutic advice. You MUST NOT reference child's raw text. Output ONLY valid Markdown.`;

async function polishWithAI(md: string): Promise<string | null> {
    try {
        const apiKey = localStorage.getItem('brainbro_gemini_key');
        if (!apiKey) return null;

        const payload = {
            contents: [{
                parts: [{ text: `${AI_SAFETY_PREAMBLE}\n\nRewrite the following weekly debrief in a warm, encouraging parent-friendly tone. Keep the same sections and structure. Keep it concise (same length). Output Markdown only.\n\n${md}` }]
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
        if (raw.length < 50) return null;
        return raw;
    } catch {
        return null;
    }
}

// ─── Public API ───

export async function buildDebrief(childId: string, now: number): Promise<{ weekKey: string; md: string; data: DebriefData }> {
    const weekKey = getWeekKey(now);
    const summary = getOpsSummary(7);

    const data = buildDeterministic(summary, childId);
    data.weekKey = weekKey;

    let md = dataToMarkdown(data, weekKey);

    // Try AI polish
    const polished = await polishWithAI(md);
    if (polished) md = polished;

    return { weekKey, md, data };
}
