import type { CognitiveProfile } from '../types';

export type PressureLevel = 'low' | 'normal' | 'high' | 'elite';

export interface PressureModifiers {
    level: PressureLevel;
    requireSecondOrder: boolean;
    increaseAmbiguityFrequency: boolean;
    reduceHints: boolean;
    enforceLongerReflection: boolean;
    reduceXPForFastAnswers: boolean;
    minPreReasoningChars: number;
    minPostReflectionChars: number;
    forceReflectionOnCorrect: boolean;
    xpMultiplier: number;
}

export function computePressureLevel(profile: CognitiveProfile | null): PressureLevel {
    if (!profile || profile.sessionsCount < 1) return 'normal';

    const cal = profile.calibration;
    const oc = profile.overconfidence;
    const ref = profile.reflection;
    const rq = profile.reasoningQualityEwma ?? 0;
    const amb = profile.ambiguityEwma ?? 0;

    if (cal < 50 && oc > 0.35) return 'elite';
    if (rq > 4 && amb > 70) return 'elite';
    if (cal < 60 || oc > 0.30) return 'high';
    if (ref < 0.5) return 'high';
    if (cal >= 75 && oc <= 0.10 && ref >= 0.8 && rq >= 3.5) return 'low';

    return 'normal';
}

export function getAdaptiveModifiers(profile: CognitiveProfile | null): PressureModifiers {
    const level = computePressureLevel(profile);

    const mods: PressureModifiers = (() => {
        switch (level) {
            case 'elite':
                return {
                    level,
                    requireSecondOrder: true,
                    increaseAmbiguityFrequency: true,
                    reduceHints: true,
                    enforceLongerReflection: true,
                    reduceXPForFastAnswers: true,
                    minPreReasoningChars: 25,
                    minPostReflectionChars: 30,
                    forceReflectionOnCorrect: true,
                    xpMultiplier: 0.9,
                };
            case 'high':
                return {
                    level,
                    requireSecondOrder: false,
                    increaseAmbiguityFrequency: false,
                    reduceHints: true,
                    enforceLongerReflection: true,
                    reduceXPForFastAnswers: false,
                    minPreReasoningChars: 25,
                    minPostReflectionChars: 20,
                    forceReflectionOnCorrect: true,
                    xpMultiplier: 1.0,
                };
            case 'low':
                return {
                    level,
                    requireSecondOrder: false,
                    increaseAmbiguityFrequency: false,
                    reduceHints: false,
                    enforceLongerReflection: false,
                    reduceXPForFastAnswers: false,
                    minPreReasoningChars: 12,
                    minPostReflectionChars: 12,
                    forceReflectionOnCorrect: false,
                    xpMultiplier: 1.0,
                };
            default:
                return {
                    level: level as PressureLevel,
                    requireSecondOrder: false,
                    increaseAmbiguityFrequency: false,
                    reduceHints: false,
                    enforceLongerReflection: false,
                    reduceXPForFastAnswers: false,
                    minPreReasoningChars: 15,
                    minPostReflectionChars: 15,
                    forceReflectionOnCorrect: false,
                    xpMultiplier: 1.0,
                };
        }
    })();

    // Phase 14.6: Low meta-cognition → enforce longer reflection
    const mcEwma = profile?.metaCognitionEwma ?? 5;
    if (mcEwma < 2.5) {
        mods.enforceLongerReflection = true;
        mods.forceReflectionOnCorrect = true;
        if (mods.minPostReflectionChars < 20) mods.minPostReflectionChars = 20;
    }

    return mods;
}

const SECOND_ORDER_PROMPTS = [
    '¿Si este error se repite 50 veces, qué consecuencias tendrá?',
    '¿Qué patrón mental te está llevando a este tipo de error?',
    '¿Qué sistema, hábito o regla necesitas para prevenir esto permanentemente?',
];

export function getSecondOrderPrompt(questionIdx: number): string {
    return SECOND_ORDER_PROMPTS[questionIdx % SECOND_ORDER_PROMPTS.length];
}
