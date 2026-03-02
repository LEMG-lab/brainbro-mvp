/**
 * Phase 16.4: Variant Hooks
 * Centralized functions for adjusting engine behavior based on active experiment variant.
 * Each hook returns adjusted parameters; default baseline returns original values.
 */

import type { ExperimentVariantId } from '../types';
import { getActiveVariant, getDateKey } from './experimentEngine';
import { getActiveChildId } from './childStorage';

function currentVariant(): ExperimentVariantId {
    return getActiveVariant(getActiveChildId(), getDateKey(Date.now()));
}

// ─── Session Scoring: Overconfidence Penalty ───

export function getOverconfidencePenalty(confidence: number, isCorrect: boolean): number {
    const variant = currentVariant();
    if (isCorrect) return 0;

    if (variant === 'oc_penalty_strict') {
        // Stricter thresholds
        if (confidence >= 85) return -5;
        if (confidence >= 70) return -3;
        if (confidence >= 60) return -1;
        return 0;
    }

    // Default baseline penalties
    if (confidence >= 90) return -3;
    if (confidence >= 80) return -2;
    return 0;
}

// ─── Program Engine: Writing Frequency ───

export function getWritingFrequency(): number {
    const variant = currentVariant();
    if (variant === 'writing_boost') return 2; // 2x/week
    return 1; // default 1x/week
}

// ─── Program Engine: Session Limits ───

export function getSessionLimits(): { maxSessionsPerDay: number; preferDrills: boolean } {
    const variant = currentVariant();
    if (variant === 'short_sessions') {
        return { maxSessionsPerDay: 1, preferDrills: true };
    }
    return { maxSessionsPerDay: 3, preferDrills: false };
}

// ─── Pressure Engine: Reflection Minimum ───

export function getMinReflectionChars(): number {
    const variant = currentVariant();
    if (variant === 'reflection_boost') return 60; // +10 from default 50
    return 50;
}

// ─── Ambiguity Boost: Extra Uncertainty ───

export function shouldBoostAmbiguity(): boolean {
    return currentVariant() === 'ambiguity_boost';
}

// ─── Meta: Get current variant label for UI ───

export function getCurrentVariantLabel(): string {
    const variant = currentVariant();
    const labels: Record<ExperimentVariantId, string> = {
        baseline: 'Normal',
        oc_penalty_strict: 'OC Strict',
        ambiguity_boost: 'Ambiguity+',
        reflection_boost: 'Reflection+',
        writing_boost: 'Writing 2x',
        short_sessions: 'Short Sessions',
    };
    return labels[variant];
}
