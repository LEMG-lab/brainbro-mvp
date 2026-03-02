/**
 * Phase 15.5: Autopilot Program Engine
 * Generates deterministic daily plans per child based on weekly config + cognitive metrics.
 */

import { sessions } from '../data/sessions';
import type { WeeklyProgramConfig, DailyPlan, DailyPlanItem } from '../types';
import { getGoalContract } from './storage';
import { getContractWeekKey } from './contractEngine';
import { getCognitiveProfile, getOpenStepsForDate } from './storage';
import { getActiveChildId } from './childStorage';
import { shouldShowDecisionLab } from './decisionLabEngine';
import { shouldShowWriting } from './writingEngine';
import { shouldShowReading } from './readingEngine';
import { shouldShowSEL } from './selEngine';

// ─── Helpers ───

export function getDateKey(now: number): string {
    const d = new Date(now);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateHash(dateKey: string, salt: string = ''): number {
    const str = dateKey + salt;
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) >>> 0;
    }
    return h;
}

export function computeDailyTargetMinutes(cfg: WeeklyProgramConfig): number {
    return Math.ceil(cfg.weeklyMinutes / 7);
}

// ─── Main Generator ───

export function generateDailyPlan(params: {
    now: number;
    cfg: WeeklyProgramConfig;
}): DailyPlan | null {
    const { now, cfg } = params;
    if (!cfg.enabled) return null;

    const dateKey = getDateKey(now);
    const childId = getActiveChildId();
    const profile = getCognitiveProfile();
    let dailyTarget = computeDailyTargetMinutes(cfg);
    const items: DailyPlanItem[] = [];
    let usedMinutes = 0;

    // Phase 16.9: Contract enforcement
    const contract = getGoalContract(getContractWeekKey(now), childId);
    let activeCfg = cfg;
    if (contract && contract.parentSigned) {
        // Bias weights toward academic goal
        const ag = (contract.academicGoal as string).toLowerCase();
        const w = { ...(cfg.areaWeights || {}) };
        if (ag.includes('vocab')) { w.vocabulary = (w.vocabulary ?? 5) + 3; }
        if (ag.includes('writing')) { w.writing = (w.writing ?? 5) + 3; }
        if (ag.includes('sesion') || ag.includes('session')) { w.thinking = (w.thinking ?? 5) + 2; }
        activeCfg = { ...cfg, areaWeights: w };
        // Integrity >= 80: reduce daily target 10%
        if (contract.integrityGoal >= 80) {
            dailyTarget = Math.round(dailyTarget * 0.9);
        }
    }

    // Phase 15.7: Inject open action steps as review items (max 2, 3 min each)
    const openSteps = getOpenStepsForDate(dateKey);
    const stepsToInject = openSteps.slice(0, 2);
    for (const step of stepsToInject) {
        if (usedMinutes + 3 <= dailyTarget) {
            items.push({
                id: `${dateKey}-r2a-${step.id}`,
                type: 'review',
                minutes: 3,
                reason: `Follow-through: ${step.text.slice(0, 60)}`,
            });
            usedMinutes += 3;
        }
    }

    // Phase 15.8: Inject writing lab once per week
    if (shouldShowWriting(now) && usedMinutes + 12 <= dailyTarget) {
        items.push({
            id: `${dateKey}-WRITING_LAB`,
            type: 'review',
            minutes: 12,
            reason: 'Writing Lab semanal — argumentación y pensamiento crítico',
        });
        usedMinutes += 12;
    }

    // Phase 15.9: Inject reading lab once per week
    if (shouldShowReading(now) && usedMinutes + 10 <= dailyTarget) {
        items.push({
            id: `${dateKey}-READING_LAB`,
            type: 'review',
            minutes: 10,
            reason: 'Reading Lab semanal — comprensión lectora y verificación',
        });
        usedMinutes += 10;
    }

    // Phase 16.0: Inject SEL lab once per week
    if (shouldShowSEL(now) && usedMinutes + 8 <= dailyTarget) {
        items.push({
            id: `${dateKey}-SEL_LAB`,
            type: 'review',
            minutes: 8,
            reason: 'SEL Lab semanal — habilidades socioemocionales',
        });
        usedMinutes += 8;
    }

    // Determine cognitive weaknesses for bias
    const overconfident = profile && profile.overconfidence > 0.25;
    const lowReasoning = profile && (profile.reasoningQualityEwma ?? 3) < 2.5;
    const lowMeta = profile && (profile.metaCognitionEwma ?? 3) < 2;

    // 1) Vocab drill if due (check vocabDue count heuristic)
    // Simple: always include if time allows and target > 15
    if (dailyTarget >= 15) {
        items.push({
            id: `${dateKey}-vocab`,
            type: 'vocab',
            minutes: 8,
            reason: 'Repaso de vocabulario pendiente (spaced repetition)',
        });
        usedMinutes += 8;
    }

    // 2) Decision Lab if due
    if (shouldShowDecisionLab(now) && usedMinutes + 7 <= dailyTarget) {
        items.push({
            id: `${dateKey}-lab`,
            type: 'decision_lab',
            minutes: 7,
            reason: 'Lab de decisiones semanal — transferencia real',
        });
        usedMinutes += 7;
    }

    // 3) Review if regression detected
    if (profile && (profile.overconfidence > 0.30 || (profile.calibration ?? 80) < 55)) {
        if (usedMinutes + 5 <= dailyTarget) {
            items.push({
                id: `${dateKey}-review`,
                type: 'review',
                minutes: 5,
                reason: overconfident ? 'Sobreconfianza detectada — revisión de errores recientes' : 'Calibración baja — revisión de fundamentos',
            });
            usedMinutes += 5;
        }
    }

    // 4) Fill remaining with sessions based on area weights
    const areaWeights = activeCfg.areaWeights || {};
    const weightedAreas = Object.entries(areaWeights)
        .filter(([_, w]) => w > 0)
        .sort((a, b) => b[1] - a[1]);

    // Apply cognitive bias
    const biasedAreas = [...weightedAreas];
    if (overconfident || lowMeta) {
        const thinkingIdx = biasedAreas.findIndex(([id]) => id === 'thinking');
        if (thinkingIdx >= 0) biasedAreas[thinkingIdx][1] += 3;
        else biasedAreas.push(['thinking', 3]);
    }
    if (lowReasoning) {
        const mathIdx = biasedAreas.findIndex(([id]) => id === 'math');
        if (mathIdx >= 0) biasedAreas[mathIdx][1] += 2;
        else biasedAreas.push(['math', 2]);
    }

    const totalWeight = biasedAreas.reduce((s, [_, w]) => s + w, 0) || 1;
    const hash = dateHash(dateKey, childId);
    let sessionSlot = 0;

    while (usedMinutes < dailyTarget && sessionSlot < 3) {
        // Deterministic area selection using hash + slot
        const pickValue = (hash + sessionSlot * 7919) % totalWeight;
        let cumulative = 0;
        let chosenArea = biasedAreas[0]?.[0] || 'english';
        for (const [aId, w] of biasedAreas) {
            cumulative += w;
            if (pickValue < cumulative) {
                chosenArea = aId;
                break;
            }
        }

        // Pick session from that area
        const areaSessions = sessions.filter(s => {
            if (s.areaId && s.areaId === chosenArea) return true;
            if (!s.areaId && chosenArea === 'english') return true;
            return false;
        });
        const pool = areaSessions.length > 0 ? areaSessions : sessions.slice(0, 8);
        const sessionIdx = (hash + sessionSlot * 1301) % pool.length;
        const picked = pool[sessionIdx];

        const sessionMinutes = Math.min(dailyTarget - usedMinutes, 12);
        if (sessionMinutes < 5) break;

        const areaLabel = chosenArea.charAt(0).toUpperCase() + chosenArea.slice(1);
        let reason = `Sesión de ${areaLabel}`;
        if (overconfident && chosenArea === 'thinking') reason += ' (combatir sobreconfianza)';
        if (lowReasoning && chosenArea === 'math') reason += ' (fortalecer razonamiento)';

        items.push({
            id: `${dateKey}-s${sessionSlot}`,
            type: 'session',
            areaId: chosenArea,
            sessionId: picked.id,
            minutes: sessionMinutes,
            reason,
        });
        usedMinutes += sessionMinutes;
        sessionSlot++;
    }

    return {
        dateKey,
        items,
        totalMinutes: usedMinutes,
        generatedAt: now,
    };
}
