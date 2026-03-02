/**
 * Phase 15.6: Plan Integrity Engine
 * Evaluates evidence per item and computes overall plan integrity score.
 */

import type { DailyPlanItem, DailyPlan } from '../types';

// ─── Per-item evidence evaluation ───

export interface EvidenceResult {
    ok: boolean;
    scoreDelta: number;
    flag?: string;
}

export function evaluateItemEvidence(item: DailyPlanItem): EvidenceResult {
    if (!item.completed) return { ok: true, scoreDelta: 0 };

    // No evidence at all
    if (!item.evidence) {
        return { ok: false, scoreDelta: -25, flag: 'NO_EVIDENCE' };
    }

    switch (item.type) {
        case 'session':
            // Needs attempts >= 1 (answered at least 1 question)
            if (item.evidence.kind !== 'attempts' || item.evidence.value < 1) {
                return { ok: false, scoreDelta: -25, flag: 'NO_EVIDENCE' };
            }
            return { ok: true, scoreDelta: 0 };

        case 'vocab':
            // drill_score, >= 50% correct, at least 8 cards
            if (item.evidence.kind !== 'drill_score') {
                return { ok: false, scoreDelta: -25, flag: 'NO_EVIDENCE' };
            }
            if (item.evidence.value < 50) {
                return { ok: false, scoreDelta: -10, flag: 'LOW_SCORE_EVIDENCE' };
            }
            return { ok: true, scoreDelta: 0 };

        case 'decision_lab':
            // lab_score 0-5 must exist
            if (item.evidence.kind !== 'lab_score') {
                return { ok: false, scoreDelta: -25, flag: 'NO_EVIDENCE' };
            }
            if (item.evidence.value < 1) {
                return { ok: false, scoreDelta: -10, flag: 'LOW_SCORE_EVIDENCE' };
            }
            return { ok: true, scoreDelta: 0 };

        case 'review':
            // timer >= 3 minutes
            if (item.evidence.kind !== 'timer') {
                return { ok: false, scoreDelta: -25, flag: 'NO_EVIDENCE' };
            }
            if (item.evidence.value < 3) {
                return { ok: false, scoreDelta: -15, flag: 'FAST_COMPLETE' };
            }
            return { ok: true, scoreDelta: 0 };

        default:
            return { ok: true, scoreDelta: 0 };
    }
}

// ─── Plan-level integrity ───

export function computePlanIntegrity(plan: DailyPlan): { score: number; flags: string[] } {
    let score = 100;
    const flags: string[] = [];

    for (const item of plan.items) {
        if (!item.completed) continue;

        // Evidence check
        const ev = evaluateItemEvidence(item);
        score += ev.scoreDelta;
        if (ev.flag) flags.push(ev.flag);

        // No startedAt
        if (!item.startedAt) {
            score -= 10;
            if (!flags.includes('NO_START')) flags.push('NO_START');
        }

        // Completed too fast (< 25% of expected minutes)
        if (item.startedAt && item.completedAt) {
            const elapsed = (item.completedAt - item.startedAt) / 60000; // minutes
            const threshold = item.minutes * 0.25;
            if (elapsed < threshold) {
                score -= 15;
                if (!flags.includes('FAST_COMPLETE')) flags.push('FAST_COMPLETE');
            }
        }
    }

    return { score: Math.max(0, Math.min(100, score)), flags };
}
