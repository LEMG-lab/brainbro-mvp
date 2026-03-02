/**
 * Phase 16.4: Experiment Engine
 * Manages A/B experiment lifecycle: active check, metric collection, result computation.
 */

import type { ExperimentConfig, ExperimentMetrics, ExperimentResult, ExperimentVariantId } from '../types';
import { getCognitiveProfile, getCognitiveSessions, getOutcomeSurveys, getDailyLedger } from './storage';
import { computeFollowThrough } from './storage';

// ─── Date Helpers ───

export function getDateKey(now: number): string {
    const d = new Date(now);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(dateKey: string, days: number): string {
    const d = new Date(dateKey + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return getDateKey(d.getTime());
}

// ─── Active Check ───

export function isExperimentActive(cfg: ExperimentConfig | undefined, dateKey: string): boolean {
    if (!cfg || !cfg.enabled) return false;
    return dateKey >= cfg.startDateKey && dateKey <= cfg.endDateKey;
}

export function getActiveVariant(_childId: string, dateKey: string): ExperimentVariantId {
    const profile = getCognitiveProfile();
    if (!profile?.currentExperiment) return 'baseline';
    if (!isExperimentActive(profile.currentExperiment, dateKey)) return 'baseline';
    return profile.currentExperiment.variant;
}

export function getDaysRemaining(cfg: ExperimentConfig): number {
    const now = new Date();
    const end = new Date(cfg.endDateKey + 'T23:59:59');
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

// ─── Metric Collection (ledger-first, fallback to raw) ───

function collectMetrics(startKey: string, endKey: string): ExperimentMetrics {
    // Try ledger first
    const ledger = getDailyLedger();
    const ledgerEntries = Object.values(ledger).filter(
        (e: any) => e.dateKey >= startKey && e.dateKey <= endKey
    );

    if (ledgerEntries.length > 0) {
        const avg = (key: string) => {
            const vals = ledgerEntries.map((e: any) => e.metrics[key]).filter((v: any) => v != null && v > 0);
            return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
        };
        return {
            outcomeAvg: Math.round(avg('outcomeAvg') * 100) / 100,
            calibration: Math.round(avg('calibration') * 100) / 100,
            overconfidence: Math.round(avg('overconfidence') * 1000) / 1000,
            followThrough: Math.round(avg('followThrough') * 100) / 100,
            meta: Math.round(avg('meta') * 100) / 100,
        };
    }

    // Fallback: raw data
    const sessions = getCognitiveSessions();
    const startMs = new Date(startKey + 'T00:00:00').getTime();
    const endMs = new Date(endKey + 'T23:59:59').getTime();

    const windowSessions = sessions.filter(s => {
        const sMs = new Date(s.createdAtISO).getTime();
        return sMs >= startMs && sMs <= endMs;
    });

    const calibrations = windowSessions.map(s => s.calibrationScore).filter(c => c !== undefined);
    const calibration = calibrations.length > 0 ? calibrations.reduce((a, b) => a + b, 0) / calibrations.length : 0;

    const allAttempts = windowSessions.flatMap(s => s.attempts || []);
    const highConfWrong = allAttempts.filter(a => (a.confidence ?? 50) >= 80 && !a.isCorrect).length;
    const overconfidence = allAttempts.length > 0 ? highConfWrong / allAttempts.length : 0;

    const metas = windowSessions.map(s => s.avgMetaCognitionScore).filter(m => m !== undefined && m > 0);
    const meta = metas.length > 0 ? metas.reduce((a, b) => a + b, 0) / metas.length : 0;

    const ft = computeFollowThrough();

    const surveys = getOutcomeSurveys();
    const windowSurveys = surveys.filter((s: any) => s.createdAt >= startMs && s.createdAt <= endMs);
    let outcomeAvg = 0;
    if (windowSurveys.length > 0) {
        const latest = windowSurveys[0];
        const vals = Object.values(latest.ratings as Record<string, number>);
        outcomeAvg = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    }

    return {
        outcomeAvg: Math.round(outcomeAvg * 100) / 100,
        calibration: Math.round(calibration * 100) / 100,
        overconfidence: Math.round(overconfidence * 1000) / 1000,
        followThrough: Math.round(ft.rate * 100) / 100,
        meta: Math.round(meta * 100) / 100,
    };
}

// ─── Result Computation ───

export function computeExperimentResult(childId: string, cfg: ExperimentConfig): ExperimentResult {
    const beforeStart = addDays(cfg.startDateKey, -7);
    const beforeEnd = addDays(cfg.startDateKey, -1);

    const before = collectMetrics(beforeStart, beforeEnd);
    const during = collectMetrics(cfg.startDateKey, cfg.endDateKey);

    const delta: ExperimentMetrics = {
        outcomeAvg: Math.round((during.outcomeAvg - before.outcomeAvg) * 100) / 100,
        calibration: Math.round((during.calibration - before.calibration) * 100) / 100,
        overconfidence: Math.round((during.overconfidence - before.overconfidence) * 1000) / 1000,
        followThrough: Math.round((during.followThrough - before.followThrough) * 100) / 100,
        meta: Math.round((during.meta - before.meta) * 100) / 100,
    };

    return {
        id: `exp-${Date.now()}`,
        childId,
        variant: cfg.variant,
        startDateKey: cfg.startDateKey,
        endDateKey: cfg.endDateKey,
        before,
        during,
        delta,
        createdAt: Date.now(),
    };
}

// ─── Verdict ───

export function getVerdict(delta: ExperimentMetrics): 'improved' | 'neutral' | 'worse' {
    let score = 0;
    if (delta.outcomeAvg > 0.2) score++;
    if (delta.outcomeAvg < -0.2) score--;
    if (delta.calibration > 3) score++;
    if (delta.calibration < -3) score--;
    if (delta.overconfidence < -0.02) score++;
    if (delta.overconfidence > 0.02) score--;
    if (delta.followThrough > 0.05) score++;
    if (delta.followThrough < -0.05) score--;

    if (score >= 2) return 'improved';
    if (score <= -2) return 'worse';
    return 'neutral';
}

// ─── Variant Labels ───

export const VARIANT_LABELS: Record<ExperimentVariantId, string> = {
    baseline: 'Baseline (sin cambios)',
    oc_penalty_strict: 'Penalización estricta por sobreconfianza',
    ambiguity_boost: 'Más ambigüedad en sesiones',
    reflection_boost: 'Reflexiones más profundas',
    writing_boost: 'Escritura 2x/semana',
    short_sessions: 'Sesiones cortas + más drills',
};
