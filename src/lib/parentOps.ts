/**
 * Phase 15.0: Parent Ops — data aggregation for parent dashboard.
 * Collects metrics, trends, flags, and interventions from all cognitive subsystems.
 */

import { getCognitiveSessions, getCognitiveProfile, getVocabProfile, computeFollowThrough, getWritingAttempts, getReadingAttempts, getSELAttempts, getOutcomeSurveys } from './storage';
import { countDueWords, getMasteredCount } from './vocabEngine';
import { childLS } from './childStorage';
import type { CognitiveSessionSummary } from '../types';

interface OpsTrend {
    label: string;
    current: number;
    previous: number;
    direction: 'up' | 'down' | 'flat';
    unit: string;
}

interface OpsFlag {
    severity: 'warning' | 'critical';
    message: string;
}

interface OpsIntervention {
    priority: 'high' | 'medium' | 'low';
    message: string;
}

export interface OpsSummary {
    period: 7 | 30;
    sessionsCount: number;
    metrics: {
        calibration: number;
        overconfidence: number;
        reflection: number;
        metaCognition: number;
        adversarialPass: number;
        decisionLabEwma: number;
        decisionLabsCompleted: number;
        vocabDue: number;
        vocabMastered: number;
        vocabTotal: number;
    };
    trends: OpsTrend[];
    flags: OpsFlag[];
    interventions: OpsIntervention[];
    streakData: { current: number; best: number } | null;
    xpTotal: number;
    planIntegrity: { avg7d: number; flaggedDays: number; flags: string[] };
    followThrough: { rate: number; completed: number; skipped: number };
    writing: { ewma: number; completed: number; lastScore: number | null; lastNotes: string | null };
    reading: { ewma: number; completed: number; lastScore: number | null; lastNotes: string | null };
    sel: { ewma: number; completed: number; lastScore: number | null; lastTheme: string | null; lastNotes: string | null };
    outcome: { ewma: number; latestAvg: number | null; completed: number; trend: number[] };
}

function getSessionsInRange(sessions: CognitiveSessionSummary[], days: number, offset: number = 0): CognitiveSessionSummary[] {
    const now = Date.now();
    const start = now - (days + offset) * 86400000;
    const end = now - offset * 86400000;
    return sessions.filter(s => {
        const t = new Date(s.createdAtISO).getTime();
        return t >= start && t <= end;
    });
}

function avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function getOpsSummary(days: 7 | 30): OpsSummary {
    const allSessions = getCognitiveSessions();
    const profile = getCognitiveProfile();
    const vocabProfile = getVocabProfile();
    const current = getSessionsInRange(allSessions, days);
    const previous = getSessionsInRange(allSessions, days, days);

    // Metrics from profile
    const cal = profile?.calibration ?? 0;
    const oc = profile?.overconfidence ?? 0;
    const ref = profile?.reflection ?? 0;
    const mc = profile?.metaCognitionEwma ?? 0;
    const ap = profile?.adversarialPassEwma ?? 0;
    const dlEwma = profile?.decisionLabEwma ?? 0;
    const dlCount = profile?.decisionLabsCompleted ?? 0;
    const vocabDue = countDueWords(vocabProfile, Date.now());
    const vocabMastered = getMasteredCount(vocabProfile);
    const vocabTotal = vocabProfile ? Object.keys(vocabProfile.words).length : 0;

    // Trends
    const trends: OpsTrend[] = [];
    const curCal = avg(current.map(s => s.calibrationScore));
    const prevCal = avg(previous.map(s => s.calibrationScore));
    trends.push({ label: 'Calibration', current: Math.round(curCal), previous: Math.round(prevCal), direction: curCal > prevCal + 2 ? 'up' : curCal < prevCal - 2 ? 'down' : 'flat', unit: '%' });

    const curOC = avg(current.map(s => s.overconfidenceRate));
    const prevOC = avg(previous.map(s => s.overconfidenceRate));
    trends.push({ label: 'Overconfidence', current: parseFloat(curOC.toFixed(2)), previous: parseFloat(prevOC.toFixed(2)), direction: curOC < prevOC - 0.03 ? 'up' : curOC > prevOC + 0.03 ? 'down' : 'flat', unit: '' });

    const curRef = avg(current.map(s => s.reflectionRate));
    const prevRef = avg(previous.map(s => s.reflectionRate));
    trends.push({ label: 'Reflection', current: parseFloat(curRef.toFixed(2)), previous: parseFloat(prevRef.toFixed(2)), direction: curRef > prevRef + 0.05 ? 'up' : curRef < prevRef - 0.05 ? 'down' : 'flat', unit: '' });

    trends.push({ label: 'Sessions', current: current.length, previous: previous.length, direction: current.length > previous.length ? 'up' : current.length < previous.length ? 'down' : 'flat', unit: '' });

    // Flags
    const flags: OpsFlag[] = [];
    const driftLog = JSON.parse(childLS.getItem('brainbro_drift_log_v1') || '[]');
    const recentDrift = driftLog.slice(0, 5);
    if (recentDrift.some((d: any) => d.gamingDetected)) flags.push({ severity: 'critical', message: 'Gaming behavior detected in recent sessions.' });
    if (recentDrift.some((d: any) => d.regressionDetected)) flags.push({ severity: 'warning', message: 'Cognitive regression detected.' });
    if (recentDrift.some((d: any) => d.driftScore > 70)) flags.push({ severity: 'warning', message: `High drift score (${recentDrift.find((d: any) => d.driftScore > 70)?.driftScore}).` });
    if (oc > 0.3) flags.push({ severity: 'critical', message: `Overconfidence EWMA at ${Math.round(oc * 100)}% — significantly above safe threshold.` });
    if (cal < 50) flags.push({ severity: 'warning', message: `Calibration below 50% (${Math.round(cal)}%).` });

    // Count high-confidence wrong answers in recent sessions
    let ocWrongCount = 0;
    current.forEach(s => s.attempts.forEach(a => { if (a.confidence >= 80 && !a.isCorrect) ocWrongCount++; }));
    if (ocWrongCount >= 3) flags.push({ severity: 'warning', message: `${ocWrongCount} high-confidence wrong answers in last ${days} days.` });

    // Interventions
    const interventions: OpsIntervention[] = [];
    if (oc > 0.25) interventions.push({ priority: 'high', message: 'Increase verification prompts; discuss consequences of overconfidence.' });
    if (ref < 0.5) interventions.push({ priority: 'high', message: 'Require reflection template use; enforce post-mortem after each session.' });
    if (mc < 2.5) interventions.push({ priority: 'medium', message: 'Practice identifying assumptions and biases before answering.' });
    if (vocabDue >= 15) interventions.push({ priority: 'medium', message: 'Do 8 vocab reviews daily for 5 days to clear backlog.' });
    if (dlCount === 0 || (profile?.lastDecisionLabAt && Date.now() - profile.lastDecisionLabAt > 14 * 86400000)) {
        interventions.push({ priority: 'medium', message: 'Complete a Decision Lab; discuss the scenario in real life for 3 minutes.' });
    }
    if (current.length < (days === 7 ? 3 : 10)) interventions.push({ priority: 'low', message: `Only ${current.length} sessions in ${days} days. Increase session frequency.` });

    // Streak/XP
    let streakData: { current: number; best: number } | null = null;
    try {
        const raw = childLS.getItem('brainbro_streak_v1');
        if (raw) streakData = JSON.parse(raw);
    } catch { /* silent */ }
    let xpTotal = 0;
    try {
        const raw = childLS.getItem('brainbro_xp_v1');
        if (raw) xpTotal = JSON.parse(raw)?.total ?? 0;
    } catch { /* silent */ }

    // Plan Integrity (last 7 days)
    const planIntegrity = { avg7d: 100, flaggedDays: 0, flags: [] as string[] };
    try {
        const scores: number[] = [];
        const allFlags: string[] = [];
        for (let d = 0; d < 7; d++) {
            const dk = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
            const raw = childLS.getItem(`brainbro_daily_plan_v1_${dk}`);
            if (!raw) continue;
            const p = JSON.parse(raw);
            if (typeof p.integrityScore === 'number') {
                scores.push(p.integrityScore);
                if (p.integrityScore < 70) planIntegrity.flaggedDays++;
                if (p.suspiciousFlags) p.suspiciousFlags.forEach((f: string) => { if (!allFlags.includes(f)) allFlags.push(f); });
            }
        }
        if (scores.length > 0) planIntegrity.avg7d = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
        planIntegrity.flags = allFlags;
    } catch { /* silent */ }

    if (planIntegrity.avg7d < 70) flags.push({ severity: 'critical', message: `Plan integrity avg ${planIntegrity.avg7d}% — possible gaming of completion.` });
    if (planIntegrity.flaggedDays >= 2) interventions.push({ priority: 'high', message: 'Require Start→Complete workflow; reduce checkbox-only completion.' });

    // Follow-through (Phase 15.7)
    const followThrough = computeFollowThrough(7);
    if (followThrough.rate < 0.5 && (followThrough.completed + followThrough.skipped) >= 2) {
        flags.push({ severity: 'warning', message: `Follow-through rate ${Math.round(followThrough.rate * 100)}% — action steps are not being completed.` });
        interventions.push({ priority: 'high', message: 'Discuss action steps with child; review why commitments are being skipped.' });
    }

    return {
        period: days,
        sessionsCount: current.length,
        metrics: { calibration: cal, overconfidence: oc, reflection: ref, metaCognition: mc, adversarialPass: ap, decisionLabEwma: dlEwma, decisionLabsCompleted: dlCount, vocabDue, vocabMastered, vocabTotal },
        trends,
        flags,
        interventions,
        streakData,
        xpTotal,
        planIntegrity,
        followThrough,
        writing: {
            ewma: profile?.writingEwma ?? 0,
            completed: profile?.writingCompleted ?? 0,
            lastScore: (() => { const w = getWritingAttempts(); return w.length > 0 ? w[0].scores.total : null; })(),
            lastNotes: (() => { const w = getWritingAttempts(); return w.length > 0 ? w[0].notes.slice(0, 120) : null; })(),
        },
        reading: {
            ewma: profile?.readingEwma ?? 0,
            completed: profile?.readingCompleted ?? 0,
            lastScore: (() => { const r = getReadingAttempts(); return r.length > 0 ? r[0].score : null; })(),
            lastNotes: (() => { const r = getReadingAttempts(); return r.length > 0 ? r[0].notes.slice(0, 120) : null; })(),
        },
        sel: {
            ewma: profile?.selEwma ?? 0,
            completed: profile?.selCompleted ?? 0,
            lastScore: (() => { const s = getSELAttempts(); return s.length > 0 ? s[0].score : null; })(),
            lastTheme: (() => { const s = getSELAttempts(); return s.length > 0 ? s[0].theme : null; })(),
            lastNotes: (() => { const s = getSELAttempts(); return s.length > 0 ? s[0].notes.slice(0, 120) : null; })(),
        },
        outcome: (() => {
            const surveys = getOutcomeSurveys();
            const latestAvg = surveys.length > 0 ? Object.values(surveys[0].ratings as Record<string, number>).reduce((s: number, v: number) => s + v, 0) / Object.values(surveys[0].ratings).length : null;
            const trend = surveys.slice(0, 4).map((s: any) => {
                const vals = Object.values(s.ratings as Record<string, number>);
                return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
            });
            return {
                ewma: profile?.outcomeEwma ?? 0,
                latestAvg,
                completed: profile?.outcomesCompleted ?? 0,
                trend,
            };
        })(),
    };
}

export function generateWeeklyReport(): string {
    const s7 = getOpsSummary(7);
    const now = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    let md = `# BrainBro — Parent Weekly Report\n**Generated:** ${now}\n\n`;
    md += `## Metrics (Current EWMA)\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Calibration | ${Math.round(s7.metrics.calibration)}% |\n`;
    md += `| Overconfidence | ${Math.round(s7.metrics.overconfidence * 100)}% |\n`;
    md += `| Reflection | ${Math.round(s7.metrics.reflection * 100)}% |\n`;
    md += `| Meta-Cognition | ${s7.metrics.metaCognition.toFixed(1)}/5 |\n`;
    md += `| Adversarial Pass | ${Math.round(s7.metrics.adversarialPass * 100)}% |\n`;
    md += `| Decision Lab | ${s7.metrics.decisionLabEwma.toFixed(1)}/5 (${s7.metrics.decisionLabsCompleted} total) |\n`;
    md += `| Vocab Due/Mastered/Total | ${s7.metrics.vocabDue}/${s7.metrics.vocabMastered}/${s7.metrics.vocabTotal} |\n`;
    md += `| Sessions (7d) | ${s7.sessionsCount} |\n`;
    md += `| XP Total | ${s7.xpTotal} |\n`;
    if (s7.streakData) md += `| Streak | ${s7.streakData.current} (best: ${s7.streakData.best}) |\n`;
    md += `\n## Trends (last 7 vs previous 7)\n`;
    s7.trends.forEach(t => { md += `- **${t.label}**: ${t.current}${t.unit} ${t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '→'} (prev: ${t.previous}${t.unit})\n`; });
    if (s7.flags.length > 0) { md += `\n## ⚠ Flags\n`; s7.flags.forEach(f => { md += `- **[${f.severity.toUpperCase()}]** ${f.message}\n`; }); }
    if (s7.interventions.length > 0) { md += `\n## Recommended Interventions\n`; s7.interventions.forEach(iv => { md += `- **[${iv.priority.toUpperCase()}]** ${iv.message}\n`; }); }
    md += `\n---\n*Generated by BrainBro Parent Ops v15.0*\n`;
    return md;
}
