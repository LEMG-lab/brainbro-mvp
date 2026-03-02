/**
 * Phase 16.3: Outcome Engine
 * Weekly parent-rated behavioral outcomes survey and correlation with cognitive metrics.
 */

import type { OpsSummary } from './parentOps';

// ─── Week Key ───

export function getOutcomeWeekKey(now: number): string {
    const d = new Date(now);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ─── Should Show Survey ───

export function shouldShowOutcomeSurvey(now: number, childId: string): boolean {
    // Show once per week — check if already completed for this week
    try {
        const weekKey = getOutcomeWeekKey(now);
        const raw = localStorage.getItem('brainbro_outcome_surveys_v1');
        if (!raw) return true;
        const surveys = JSON.parse(raw);
        return !surveys.some((s: any) => s.weekKey === weekKey && s.childId === childId);
    } catch {
        return true;
    }
}

// ─── EWMA ───

export function computeOutcomeEwma(prev: number, currentAvg: number): number {
    if (prev === 0) return currentAvg;
    return prev * 0.75 + currentAvg * 0.25;
}

// ─── Survey Item Definitions ───

export const OUTCOME_ITEMS: { id: string; label: string; description: string }[] = [
    { id: 'focus_homework', label: 'Enfoque en tareas', description: 'Se concentra en tareas escolares/deberes sin necesidad de supervisión constante' },
    { id: 'handles_frustration', label: 'Manejo de frustración', description: 'Cuando algo sale mal, se calma solo/a sin perder el control' },
    { id: 'honesty_effort', label: 'Honestidad y esfuerzo', description: 'Es honesto/a sobre lo que sabe y no sabe; no finge entender' },
    { id: 'initiative', label: 'Iniciativa', description: 'Propone ideas, busca soluciones o empieza actividades sin que se lo pidan' },
    { id: 'kindness', label: 'Amabilidad y empatía', description: 'Muestra consideración por los sentimientos de otros (hermanos, amigos, familia)' },
    { id: 'sleep_routine', label: 'Rutina de sueño', description: 'Sigue su rutina de sueño sin resistencia significativa' },
    { id: 'screen_self_control', label: 'Autocontrol con pantallas', description: 'Deja las pantallas cuando se le pide o cuando se acaba el tiempo acordado' },
];

// ─── Insight Builder ───

export function buildOutcomeInsights(summary: OpsSummary, ratings: Record<string, number>): string[] {
    const insights: string[] = [];
    const avg = Object.values(ratings).reduce((s, v) => s + v, 0) / Object.values(ratings).length;

    // Correlation: focus_homework ↔ calibration
    if (ratings.focus_homework <= 2 && summary.metrics.calibration < 60) {
        insights.push('El bajo enfoque en tareas puede estar relacionado con la baja calibración en las sesiones — considere sesiones más cortas y frecuentes.');
    } else if (ratings.focus_homework >= 4 && summary.metrics.calibration >= 70) {
        insights.push('El buen enfoque en tareas se alinea con una calibración fuerte — el entrenamiento parece trasladarse a la vida real.');
    }

    // Correlation: handles_frustration ↔ adversarial pass
    if (ratings.handles_frustration <= 2 && summary.metrics.adversarialPass < 0.5) {
        insights.push('La dificultad con la frustración puede estar relacionada con la susceptibilidad a presión en las sesiones — practiquen juntos el "defender tu respuesta".');
    } else if (ratings.handles_frustration >= 4) {
        insights.push('Buen manejo de frustración — esto puede reflejarse en mayor resiliencia cognitiva durante las sesiones.');
    }

    // Correlation: honesty_effort ↔ overconfidence
    if (ratings.honesty_effort <= 2 && summary.metrics.overconfidence > 0.25) {
        insights.push('La falta de honestidad sobre lo que sabe puede estar relacionada con sobreconfianza en las sesiones — refuerce que "no sé" es una respuesta válida.');
    }

    // Correlation: screen_self_control ↔ plan integrity
    if (ratings.screen_self_control <= 2 && summary.planIntegrity.avg7d < 60) {
        insights.push('El bajo autocontrol con pantallas puede estar afectando la integridad del plan diario — considere límites de tiempo más claros.');
    }

    // General
    if (avg >= 4) {
        insights.push('Los resultados conductuales son positivos — el entrenamiento cognitivo parece tener impacto observable en la vida diaria.');
    } else if (avg <= 2.5 && summary.followThrough.rate < 0.5) {
        insights.push('Los resultados conductuales bajos junto con bajo seguimiento de compromisos sugieren que reforzar el ciclo Reflexión→Acción puede ayudar.');
    }

    // Cap at 3
    return insights.slice(0, 3);
}
