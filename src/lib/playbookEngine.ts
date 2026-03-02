/**
 * Phase 16.7: Playbook Engine
 * Deterministic mapping from early warning triggers to concrete intervention playbooks.
 */

import type { WeeklyProgramConfig, ExperimentVariantId } from '../types';

export type PlaybookTrigger = 'LOW_INTEGRITY' | 'HIGH_OVERCONFIDENCE' | 'LOW_FOLLOW_THROUGH' | 'LOW_CALIBRATION' | 'LOW_MINUTES' | 'LOW_OUTCOMES';

export interface Playbook {
    id: string;
    title: string;
    why: string;
    next24h: string[];
    next7d: string[];
    stopDoing: string[];
    successLooksLike: string[];
    recommendedConfigPatch?: Partial<WeeklyProgramConfig>;
    recommendedExperiment?: ExperimentVariantId;
}

// Priority order (highest first)
export const TRIGGER_PRIORITY: PlaybookTrigger[] = [
    'LOW_INTEGRITY', 'HIGH_OVERCONFIDENCE', 'LOW_FOLLOW_THROUGH', 'LOW_CALIBRATION', 'LOW_MINUTES', 'LOW_OUTCOMES',
];

const PLAYBOOKS: Record<PlaybookTrigger, Playbook> = {
    LOW_INTEGRITY: {
        id: 'pb-low-integrity',
        title: 'Plan Integrity Recovery',
        why: 'El niño/a completa menos del 30% del plan diario. Esto puede indicar que el plan es demasiado ambicioso o que hay resistencia.',
        next24h: [
            'Reducir el plan del día a 3 actividades máximo (15 min total)',
            'Hacer la primera actividad juntos (padre e hijo)',
            'Celebrar cualquier completación, sin importar calidad',
        ],
        next7d: [
            'Mantener plan reducido por 5 días, luego subir gradualmente',
            'Agregar una actividad favorita del niño como recompensa intermedia',
            'Revisar el horario: ¿hay conflictos con otras actividades?',
        ],
        stopDoing: [
            'Dejar de agregar actividades "extra" al plan',
            'No comparar con semanas anteriores frente al niño',
        ],
        successLooksLike: [
            'Integridad del plan sube a 50%+ en 5 días',
            'El niño empieza por su cuenta al menos 1 actividad/día',
        ],
        recommendedConfigPatch: { weeklyMinutes: 90 },
    },
    HIGH_OVERCONFIDENCE: {
        id: 'pb-high-oc',
        title: 'Overconfidence Calibration',
        why: 'El niño/a dice "estoy seguro" pero se equivoca frecuentemente. Necesita aprender que la duda es una herramienta, no una debilidad.',
        next24h: [
            'Hacer el "Juego de Verificación": antes de responder, decir una razón de por qué podría estar equivocado',
            'Practicar "Apuesta de Confianza": si dice 90%+ seguro y falla, pierde 1 punto extra',
            'Reforzar: "No sé todavía" es una respuesta inteligente',
        ],
        next7d: [
            'Agregar sesiones de Decision Lab 2x esta semana',
            'Aumentar peso de Thinking/Análisis en el plan semanal',
            'Revisar reflexiones post-sesión: ¿menciona sus errores?',
        ],
        stopDoing: [
            'No premiar velocidad por encima de precisión',
            'No decir "¡Muy bien!" automáticamente sin verificar razonamiento',
        ],
        successLooksLike: [
            'Tasa de sobreconfianza baja de >30% a <20%',
            'El niño empieza a decir "creo que sí, pero déjame pensar" naturalmente',
        ],
        recommendedConfigPatch: { areaWeights: { thinking: 8, analysis: 7 } },
        recommendedExperiment: 'oc_penalty_strict',
    },
    LOW_FOLLOW_THROUGH: {
        id: 'pb-low-ft',
        title: 'Follow-Through Boost',
        why: 'Los compromisos post-reflexión no se están cumpliendo. Las reflexiones se quedan en texto muerto.',
        next24h: [
            'Revisar los 2 action steps pendientes más recientes y hacer UNO ahora',
            'El padre pregunta 3 preguntas del Debrief Script de esta semana',
            'Establecer un "check-in de 2 minutos" antes de la cena',
        ],
        next7d: [
            'Reducir action steps a 1 por día (no más)',
            'Agregar "micro-reviews" de 3 min al plan diario',
            'Simplificar las metas: más concretas, menos abstractas',
        ],
        stopDoing: [
            'No crear compromisos vagos ("voy a estudiar más")',
            'No agregar action steps si los anteriores no se completaron',
        ],
        successLooksLike: [
            'Follow-through sube de <30% a >50% en 7 días',
            'Al menos 1 action step completado por día',
        ],
        recommendedConfigPatch: { weeklyMinutes: 100 },
        recommendedExperiment: 'reflection_boost',
    },
    LOW_CALIBRATION: {
        id: 'pb-low-cal',
        title: 'Calibration Recovery',
        why: 'La calibración cognitiva está baja — el niño/a no está estimando bien su nivel de conocimiento.',
        next24h: [
            'Hacer una sesión corta (5 preguntas) enfocada solo en calibración',
            'Antes de cada respuesta, pedir: "del 1 al 10, ¿qué tan seguro estás?"',
            'Repasar juntos los 3 últimos errores de alta confianza',
        ],
        next7d: [
            'Mantener sesiones cortas y frecuentes (2x5min > 1x10min)',
            'Agregar "Confidence Check" antes de cada tarea importante en la vida real',
            'Revisar si el contenido está en el nivel correcto (¿demasiado difícil?)',
        ],
        stopDoing: [
            'No avanzar de nivel si calibración <50%',
            'No aumentar dificultad solo porque el niño lo pide',
        ],
        successLooksLike: [
            'Calibración sube a 50%+ en 5 días',
            'El niño empieza a ajustar su confianza antes de que se lo pidan',
        ],
        recommendedExperiment: 'ambiguity_boost',
    },
    LOW_MINUTES: {
        id: 'pb-low-min',
        title: 'Engagement Recovery',
        why: 'El tiempo dedicado está cayendo. Puede ser fatiga, aburrimiento, o conflicto de horario.',
        next24h: [
            'Hacer UNA actividad de 5 min juntos (algo fácil y divertido)',
            'Preguntar: "¿Hay algo que te gustaría cambiar de BrainBro?"',
            'No forzar tiempo — calidad > cantidad hoy',
        ],
        next7d: [
            'Ajustar el horario: ¿cuál es el mejor momento del día?',
            'Agregar una "actividad bonus" que el niño elija',
            'Considerar sesiones más cortas pero más frecuentes',
        ],
        stopDoing: [
            'No usar BrainBro como castigo o condición',
            'No comparar tiempo con otros niños o con semanas pasadas',
        ],
        successLooksLike: [
            'Minutos completados suben 20%+ en 7 días',
            'El niño usa BrainBro sin que se lo pidan al menos 1x/semana',
        ],
        recommendedConfigPatch: { weeklyMinutes: 80 },
        recommendedExperiment: 'short_sessions',
    },
    LOW_OUTCOMES: {
        id: 'pb-low-outcomes',
        title: 'Behavioral Outcomes Focus',
        why: 'Los resultados conductuales observados están bajos. El entrenamiento cognitivo no se está trasladando a la vida real.',
        next24h: [
            'Identificar UN comportamiento específico para practicar hoy (p.ej. autocontrol con pantallas)',
            'Establecer una "señal secreta" entre padre e hijo para recordar el comportamiento',
            'Al final del día, evaluar juntos: ¿cómo fue?',
        ],
        next7d: [
            'Completar el Outcome Survey con más detalle esta semana',
            'Conectar una sesión de BrainBro con un ejemplo de vida real ("¿recuerdas cuando...?")',
            'Practicar UN escenario del SEL Lab en la vida real',
        ],
        stopDoing: [
            'No esperar cambios inmediatos en todos los comportamientos',
            'No evaluar comportamientos en momentos de estrés (antes de dormir, después de conflictos)',
        ],
        successLooksLike: [
            'Outcome avg sube de <2.5 a >3.0 en 2 semanas',
            'El niño menciona algo de BrainBro en una conversación natural',
        ],
        recommendedExperiment: 'writing_boost',
    },
};

export function getPlaybook(trigger: PlaybookTrigger): Playbook {
    return PLAYBOOKS[trigger];
}

export function getHighestPriorityPlaybook(warnings: { metric: string }[]): Playbook | null {
    // Map warning metrics to trigger names
    const triggerMap: Record<string, PlaybookTrigger> = {
        planIntegrity: 'LOW_INTEGRITY',
        overconfidence: 'HIGH_OVERCONFIDENCE',
        followThrough: 'LOW_FOLLOW_THROUGH',
        calibration: 'LOW_CALIBRATION',
        minutesCompleted: 'LOW_MINUTES',
        outcomeAvg: 'LOW_OUTCOMES',
    };

    for (const t of TRIGGER_PRIORITY) {
        if (warnings.some(w => triggerMap[w.metric] === t)) {
            return PLAYBOOKS[t];
        }
    }
    return null;
}
