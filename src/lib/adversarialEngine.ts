/**
 * Phase 14.7: Cognitive Adversarial Mode (CAM)
 * Introduces "temptations" and misleading cues to detect shallow thinking,
 * confirmation bias, and lack of verification.
 */

import type { CognitiveProfile } from '../types';
import { filterPrompt, getActiveAgeBand } from './safetyPolicy';

export type AdversarialType = 'verification' | 'misdirection' | 'assumption_trap';

export interface AdversarialPrompt {
    id: string;
    type: AdversarialType;
    prompt: string;
    expectedBehavior: string;
}

export interface AdversarialResult {
    pass: boolean;
    notes: string;
}

const ADVERSARIAL_EXPLANATIONS: Record<AdversarialType, string> = {
    verification: 'Entrena verificación activa: buscar errores propios antes de responder.',
    misdirection: 'Entrena resistencia a prueba social: no seguir mayorías sin verificar.',
    assumption_trap: 'Entrena detección de suposiciones: cuestionar premisas no garantizadas.',
};

export { ADVERSARIAL_EXPLANATIONS };

const VERIFICATION_PROMPTS: AdversarialPrompt[] = [
    { id: 'adv-ver-1', type: 'verification', prompt: 'Antes de responder, lista 2 formas en que tu respuesta podría estar equivocada y cómo lo verificarías.', expectedBehavior: 'Al menos 2 checks + marcador de incertidumbre' },
    { id: 'adv-ver-2', type: 'verification', prompt: '¿Qué evidencia necesitarías para estar seguro de tu respuesta? Lista al menos 2 fuentes.', expectedBehavior: 'Al menos 2 fuentes o evidencias mencionadas' },
];

const MISDIRECTION_PROMPTS: AdversarialPrompt[] = [
    { id: 'adv-mis-1', type: 'misdirection', prompt: 'La mayoría de las personas elige la opción B aquí. ¿Estás de acuerdo o verificas por tu cuenta?', expectedBehavior: 'Rechazar prueba social, verificar independientemente' },
    { id: 'adv-mis-2', type: 'misdirection', prompt: 'Un experto famoso dice que la respuesta es obvia. ¿Confías o verificas?', expectedBehavior: 'Cuestionar argumento de autoridad, buscar evidencia' },
];

const ASSUMPTION_PROMPTS: AdversarialPrompt[] = [
    { id: 'adv-asm-1', type: 'assumption_trap', prompt: 'Asume que el dato principal es correcto. ¿Pero qué pasaría si no lo fuera? ¿Qué información falta?', expectedBehavior: 'Cuestionar la suposición, identificar información faltante' },
    { id: 'adv-asm-2', type: 'assumption_trap', prompt: 'Todos los datos parecen consistentes. ¿Hay alguna suposición oculta que no has verificado?', expectedBehavior: 'Identificar suposiciones implícitas' },
];

const ALL_PROMPTS = [...VERIFICATION_PROMPTS, ...MISDIRECTION_PROMPTS, ...ASSUMPTION_PROMPTS];

export function shouldEnableAdversarial(
    profile: CognitiveProfile | null,
    drift: { gamingDetected?: boolean; plateauDetected?: boolean; regressionDetected?: boolean }
): boolean {
    if (!profile || profile.sessionsCount < 3) return false;
    if (drift.gamingDetected || drift.plateauDetected) return true;
    if (profile.overconfidence > 0.28) return true;
    if ((profile.metaCognitionEwma ?? 5) < 2.3) return true;
    return false;
}

export function getAdversarialPrompt(areaId: string): AdversarialPrompt {
    const dayIndex = Math.floor(Date.now() / 86400000);
    const seed = dayIndex + areaId.length;
    const base = ALL_PROMPTS[seed % ALL_PROMPTS.length];
    return { ...base, prompt: filterPrompt(base.prompt, getActiveAgeBand()) };
}

const VERIFY_KW = ['verificar', 'comprobar', 'chequear', 'revisar', 'confirmar', 'equivocad', 'error', 'incorrecto', 'check', 'prueba'];
const REJECT_SOCIAL_KW = ['verifico', 'no confío', 'por mi cuenta', 'no sigo', 'independiente', 'evidencia', 'demostrar', 'no porque la mayoría'];
const ASSUMPTION_KW = ['suposición', 'asumo', 'supongo', 'falta información', 'no es seguro', 'necesito más datos', 'premisa', 'dato faltante', 'no garantizado'];

export function scoreAdversarialResponse(text: string, type: AdversarialType): AdversarialResult {
    if (!text || text.trim().length < 15) {
        return { pass: false, notes: 'Respuesta demasiado corta para evaluación adversarial.' };
    }
    const lower = text.toLowerCase();

    switch (type) {
        case 'verification': {
            const checks = VERIFY_KW.filter(kw => lower.includes(kw)).length;
            const hasUncertainty = ['no estoy seguro', 'podría', 'tal vez', 'quizá'].some(kw => lower.includes(kw));
            const pass = checks >= 2 || (checks >= 1 && hasUncertainty);
            return { pass, notes: pass ? `Verificación activa detectada (${checks} checks)` : 'Faltaron checks de verificación o marcadores de incertidumbre.' };
        }
        case 'misdirection': {
            const rejects = REJECT_SOCIAL_KW.some(kw => lower.includes(kw));
            const verifies = VERIFY_KW.some(kw => lower.includes(kw));
            const pass = rejects || verifies;
            return { pass, notes: pass ? 'Rechazó prueba social / verificó independientemente.' : 'Aceptó prueba social sin cuestionar.' };
        }
        case 'assumption_trap': {
            const found = ASSUMPTION_KW.some(kw => lower.includes(kw));
            const pass = found;
            return { pass, notes: pass ? 'Detectó suposición / pidió información faltante.' : 'No cuestionó la suposición implícita.' };
        }
    }
}
