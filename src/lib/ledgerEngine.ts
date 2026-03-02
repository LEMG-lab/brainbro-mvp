/**
 * Phase 16.5: Ledger Engine
 * Computes daily ledger entries from existing data sources.
 * Append-only, 180-day cap, backfill last 30 days on first run.
 */

import { getCognitiveSessions, getDailyPlan, getWritingAttempts, getReadingAttempts, getSELAttempts, getOutcomeSurveys, getDailyLedger, upsertLedgerEntry, computeFollowThrough } from './storage';
import { getActiveChildId } from './childStorage';
import type { DailyLedgerEntry } from '../types';

// ─── Date Helpers ───

function toDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateKeyToMs(dk: string): { start: number; end: number } {
    return {
        start: new Date(dk + 'T00:00:00').getTime(),
        end: new Date(dk + 'T23:59:59').getTime(),
    };
}

// ─── Compute Single Day ───

export function computeLedgerEntry(dateKey: string, childId: string): DailyLedgerEntry {
    const { start, end } = dateKeyToMs(dateKey);

    // Sessions
    const allSessions = getCognitiveSessions();
    const daySessions = allSessions.filter(s => {
        const ms = new Date(s.createdAtISO).getTime();
        return ms >= start && ms <= end;
    });

    const calibrations = daySessions.map(s => s.calibrationScore);
    const avgCalibration = calibrations.length > 0 ? calibrations.reduce((a, b) => a + b, 0) / calibrations.length : 0;

    const ocRates = daySessions.map(s => s.overconfidenceRate);
    const avgOC = ocRates.length > 0 ? ocRates.reduce((a, b) => a + b, 0) / ocRates.length : 0;

    const reflRates = daySessions.map(s => s.reflectionRate);
    const avgRefl = reflRates.length > 0 ? reflRates.reduce((a, b) => a + b, 0) / reflRates.length : 0;

    const metas = daySessions.map(s => s.avgMetaCognitionScore);
    const avgMeta = metas.length > 0 ? metas.reduce((a, b) => a + b, 0) / metas.length : 0;

    const advRates = daySessions.map(s => s.adversarialPassRate);
    const avgAdv = advRates.length > 0 ? advRates.reduce((a, b) => a + b, 0) / advRates.length : 0;

    // Daily plan
    const plan = getDailyPlan();
    let minutesPlanned = 0;
    let minutesCompleted = 0;
    if (plan && plan.dateKey === dateKey) {
        minutesPlanned = plan.totalMinutes;
        minutesCompleted = plan.items.filter((i: any) => i.completed).reduce((s: number, i: any) => s + i.minutes, 0);
    }
    const planIntegrity = minutesPlanned > 0 ? Math.round((minutesCompleted / minutesPlanned) * 100) : 0;

    // Vocab - best effort: count session attempts that day
    const vocabReviewed = daySessions.reduce((s, sess) => s + (sess.attempts?.length || 0), 0);

    // Decision lab
    const decisionLabDone: 0 | 1 = plan?.items?.some((i: any) => i.type === 'decision_lab' && i.completed) ? 1 : 0;

    // Writing
    const writings = getWritingAttempts();
    const writingDone: 0 | 1 = writings.some((w: any) => {
        const wMs = w.createdAt;
        return wMs >= start && wMs <= end;
    }) ? 1 : 0;

    // Reading
    const readings = getReadingAttempts();
    const readingDone: 0 | 1 = readings.some((r: any) => {
        const rMs = r.createdAt;
        return rMs >= start && rMs <= end;
    }) ? 1 : 0;

    // SEL
    const sels = getSELAttempts();
    const selDone: 0 | 1 = sels.some((s: any) => {
        const sMs = s.createdAt;
        return sMs >= start && sMs <= end;
    }) ? 1 : 0;

    // Follow-through
    const ft = computeFollowThrough();

    // Outcome avg (weekly, map to dateKey if survey exists)
    const surveys = getOutcomeSurveys();
    let outcomeAvg: number | undefined = undefined;
    const daySurvey = surveys.find((s: any) => s.createdAt >= start && s.createdAt <= end);
    if (daySurvey) {
        const vals = Object.values(daySurvey.ratings as Record<string, number>);
        outcomeAvg = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    }

    // Flags
    const flags: string[] = [];
    if (avgCalibration < 40 && daySessions.length > 0) flags.push('LOW_CALIBRATION');
    if (avgOC > 0.3) flags.push('HIGH_OVERCONFIDENCE');
    if (planIntegrity < 30 && minutesPlanned > 0) flags.push('LOW_INTEGRITY');
    if (ft.rate < 0.3 && (ft.completed + ft.skipped) > 0) flags.push('LOW_FOLLOW_THROUGH');
    // Gaming: high integrity but low calibration
    if (planIntegrity > 90 && avgCalibration < 30 && daySessions.length > 0) flags.push('GAMING');
    // Regression: calibration dropped significantly (would need prev day, skip here)

    return {
        id: `${dateKey}__${childId}`,
        dateKey,
        childId,
        createdAt: Date.now(),
        metrics: {
            minutesPlanned,
            minutesCompleted,
            planIntegrity,
            sessionsCompleted: daySessions.length,
            vocabReviewed,
            decisionLabDone,
            writingDone,
            readingDone,
            selDone,
            calibration: Math.round(avgCalibration * 100) / 100,
            overconfidence: Math.round(avgOC * 1000) / 1000,
            reflection: Math.round(avgRefl * 1000) / 1000,
            meta: Math.round(avgMeta * 100) / 100,
            adversarialPass: Math.round(avgAdv * 1000) / 1000,
            followThrough: Math.round(ft.rate * 100) / 100,
            outcomeAvg,
        },
        flags,
    };
}

// ─── Recompute Today ───

export function recomputeLedgerForToday(): DailyLedgerEntry {
    const childId = getActiveChildId();
    const today = toDateKey(new Date());
    const entry = computeLedgerEntry(today, childId);
    upsertLedgerEntry(entry);
    return entry;
}

// ─── Backfill ───

export function backfillLedger(days: number = 30): void {
    const ledger = getDailyLedger();
    const childId = getActiveChildId();
    const now = new Date();

    for (let i = 0; i < days; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dk = toDateKey(d);
        const id = `${dk}__${childId}`;
        if (!ledger[id]) {
            const entry = computeLedgerEntry(dk, childId);
            upsertLedgerEntry(entry);
        }
    }
}

// ─── Init: backfill on first use ───

export function initLedger(): void {
    const ledger = getDailyLedger();
    if (Object.keys(ledger).length === 0) {
        backfillLedger(30);
    }
    // Always recompute today
    recomputeLedgerForToday();
}

// ─── Aggregate helpers for consumers ───

export function getLedgerAvg(entries: any[], key: string): number {
    const vals = entries.map(e => e.metrics[key]).filter((v: any) => v !== undefined && v !== null);
    if (vals.length === 0) return 0;
    return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
}

export function getLedgerFlagCount(entries: any[], flag: string): number {
    return entries.filter(e => e.flags?.includes(flag)).length;
}
