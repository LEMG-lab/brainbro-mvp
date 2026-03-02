import { SessionResult, VocabItem, SessionData, PronunciationData, CognitiveSessionSummary, CognitiveProfile, ActionStep } from '../types';
import { childLS } from './childStorage';

const RESULTS_KEY = 'brainbro_results';
const VOCAB_KEY = 'brainbro_vocab';
const ACCENT_KEY = 'brainbro_accent';
const RATE_KEY = 'brainbro_rate';

// Results
export const getHistory = (): SessionResult[] => {
    try {
        const val = childLS.getItem(RESULTS_KEY);
        return val ? JSON.parse(val) : [];
    } catch {
        return [];
    }
};

export const saveResult = (res: SessionResult) => {
    const history = getHistory();
    const updated = [res, ...history];
    childLS.setItem(RESULTS_KEY, JSON.stringify(updated));
};

// Vocab Tracking
// Map of word (lowercase) to VocabItem
export const getVocab = (): Record<string, VocabItem> => {
    try {
        const val = childLS.getItem(VOCAB_KEY);
        return val ? JSON.parse(val) : {};
    } catch {
        return {};
    }
};

export const updateVocab = (learned: VocabItem[], wrongWords: string[] = []) => {
    const vocabMap = getVocab();
    const today = new Date().toLocaleDateString();

    learned.forEach(item => {
        const key = item.word.toLowerCase();
        if (!vocabMap[key]) {
            vocabMap[key] = { ...item, lastSeenDate: today, mistakesCount: 0 };
        } else {
            vocabMap[key].lastSeenDate = today;
        }
    });

    // For future gamification/SRS, track if user missed something
    wrongWords.forEach(word => {
        const key = word.toLowerCase();
        if (vocabMap[key]) {
            vocabMap[key].mistakesCount = (vocabMap[key].mistakesCount || 0) + 1;
        }
    });

    childLS.setItem(VOCAB_KEY, JSON.stringify(vocabMap));
};

// Settings
export const getAccent = () => childLS.getItem(ACCENT_KEY) || 'en-US';
export const saveAccent = (acc: string) => childLS.setItem(ACCENT_KEY, acc);

export const getRate = () => parseFloat(childLS.getItem(RATE_KEY) || '1.0');
export const saveRate = (r: number) => childLS.setItem(RATE_KEY, r.toString());

// Adaptive Coach
export interface AdaptiveProfile {
    currentDifficulty: number;
    preferredAccent: 'en-GB' | 'en-US';
    lastRecommendations: Array<{
        date: string;
        sessionId: string | null;
        difficulty: number;
        accent: 'en-GB' | 'en-US';
        score?: number;
        message?: string;
    }>;
}

export function getAdaptiveProfile(): AdaptiveProfile {
    const data = childLS.getItem('brainbro_adaptive');
    if (data) {
        try {
            return JSON.parse(data);
        } catch { /* ignore */ }
    }
    return {
        currentDifficulty: 2,
        preferredAccent: 'en-GB',
        lastRecommendations: []
    };
}

export function updateAdaptiveProfile(profile: AdaptiveProfile) {
    childLS.setItem('brainbro_adaptive', JSON.stringify(profile));
}

// Custom generated sessions v2
const CUSTOM_SESSIONS_V2_KEY = 'brainbro_custom_sessions_v2';

export const getCustomSessions = (): SessionData[] => {
    try {
        const val = childLS.getItem(CUSTOM_SESSIONS_V2_KEY);
        return val ? JSON.parse(val) : [];
    } catch {
        return [];
    }
};

export const getCustomSessionsByArea = (areaId: string): SessionData[] => {
    const all = getCustomSessions();
    return all.filter(s => s.areaId === areaId);
};

export const saveCustomSession = (sess: SessionData) => {
    const list = getCustomSessions();
    const updated = [sess, ...list];
    childLS.setItem(CUSTOM_SESSIONS_V2_KEY, JSON.stringify(updated));
};

export const clearCustomSessions = () => {
    childLS.removeItem(CUSTOM_SESSIONS_V2_KEY);
};

// Gamification & Missions
import { MissionData, StreakData, XpData, OnboardingData, ProfileData, MistakesData } from '../types';

export const getMistakes = (): MistakesData => {
    try {
        const val = childLS.getItem('brainbro_mistakes_v1');
        if (val) {
            const parsed = JSON.parse(val);
            if (!parsed.byArea) parsed.byArea = {};
            if (!Array.isArray(parsed.recent)) parsed.recent = [];
            return parsed;
        }
    } catch { /* ignore */ }
    return { byArea: {}, recent: [] };
};

export const saveMistakes = (data: MistakesData) => {
    childLS.setItem('brainbro_mistakes_v1', JSON.stringify(data));
};

export const getOnboarding = (): OnboardingData => {
    try {
        const val = childLS.getItem('brainbro_onboarding_v1');
        return val ? JSON.parse(val) : { completed: false, step: 0 };
    } catch { return { completed: false, step: 0 }; }
};

export const saveOnboarding = (data: OnboardingData) => {
    childLS.setItem('brainbro_onboarding_v1', JSON.stringify(data));
};

export const getMissions = (): MissionData | null => {
    try {
        const val = childLS.getItem('brainbro_missions_v1');
        if (!val) return null;
        const parsed = JSON.parse(val);
        if (!Array.isArray(parsed.missions)) parsed.missions = [];
        if (!Array.isArray(parsed.completedMissionIds)) parsed.completedMissionIds = [];
        return parsed;
    } catch { return null; }
};

export const saveMissions = (data: MissionData) => {
    childLS.setItem('brainbro_missions_v1', JSON.stringify(data));
};

export const getStreak = (): StreakData => {
    try {
        const val = childLS.getItem('brainbro_streak_v1');
        return val ? JSON.parse(val) : { current: 0, best: 0, lastCompletedDateISO: null };
    } catch { return { current: 0, best: 0, lastCompletedDateISO: null }; }
};

export const saveStreak = (data: StreakData) => {
    childLS.setItem('brainbro_streak_v1', JSON.stringify(data));
};

export const getXp = (): XpData => {
    try {
        const val = childLS.getItem('brainbro_xp_v1');
        return val ? JSON.parse(val) : { total: 0, byArea: {} };
    } catch { return { total: 0, byArea: {} }; }
};

export const saveXp = (data: XpData) => {
    childLS.setItem('brainbro_xp_v1', JSON.stringify(data));
};

export const getBadges = (): string[] => {
    try {
        const val = childLS.getItem('brainbro_badges_v1');
        return val ? JSON.parse(val) : [];
    } catch { return []; }
};

export const saveBadges = (badges: string[]) => {
    childLS.setItem('brainbro_badges_v1', JSON.stringify(badges));
};

export const getProfile = (): ProfileData | null => {
    try {
        const val = childLS.getItem('brainbro_profile_v1');
        return val ? JSON.parse(val) : null;
    } catch { return null; }
};

export const saveProfile = (data: ProfileData) => {
    childLS.setItem('brainbro_profile_v1', JSON.stringify(data));
};

export const getPronunciationData = (): PronunciationData => {
    try {
        const val = childLS.getItem('brainbro_pronunciation_v1');
        if (val) {
            const parsed = JSON.parse(val);
            if (!Array.isArray(parsed.attempts)) parsed.attempts = [];
            if (!parsed.bestScoreBySentence) parsed.bestScoreBySentence = {};
            if (!parsed.commonMissing) parsed.commonMissing = {};
            return parsed;
        }
    } catch { /* ignore */ }
    return { attempts: [], bestScoreBySentence: {}, commonMissing: {} };
};

export const savePronunciationData = (data: PronunciationData) => {
    // Keep only last 100 attempts
    if (data.attempts.length > 100) {
        data.attempts = data.attempts.slice(0, 100);
    }
    childLS.setItem('brainbro_pronunciation_v1', JSON.stringify(data));
};

// ─── Phase 14: Cognitive Edge Protocol ───

const COG_SESSIONS_KEY = 'brainbro_cognitive_sessions_v1';
const COG_PROFILE_KEY = 'brainbro_cognitive_profile_v1';

export const getCognitiveSessions = (): CognitiveSessionSummary[] => {
    try {
        const val = childLS.getItem(COG_SESSIONS_KEY);
        return val ? JSON.parse(val) : [];
    } catch { return []; }
};

export const appendCognitiveSession = (summary: CognitiveSessionSummary) => {
    const list = getCognitiveSessions();
    list.unshift(summary);
    // keep last 50
    if (list.length > 50) list.length = 50;
    childLS.setItem(COG_SESSIONS_KEY, JSON.stringify(list));
};

export const getCognitiveProfile = (): CognitiveProfile | null => {
    try {
        const val = childLS.getItem(COG_PROFILE_KEY);
        return val ? JSON.parse(val) : null;
    } catch { return null; }
};

export const saveCognitiveProfile = (data: CognitiveProfile) => {
    childLS.setItem(COG_PROFILE_KEY, JSON.stringify(data));
};

// ─── Phase 14.3: Pressure Log ───

const PRESSURE_LOG_KEY = 'brainbro_pressure_log_v1';

export const appendPressureLog = (level: string) => {
    try {
        const raw = childLS.getItem(PRESSURE_LOG_KEY);
        let log: { level: string; ts: string }[] = [];
        if (raw) { try { log = JSON.parse(raw); } catch { log = []; } }
        if (!Array.isArray(log)) log = [];
        log.unshift({ level, ts: new Date().toISOString() });
        if (log.length > 50) log = log.slice(0, 50);
        childLS.setItem(PRESSURE_LOG_KEY, JSON.stringify(log));
    } catch { /* silent */ }
};

export const getPressureLog = (): { level: string; ts: string }[] => {
    try {
        const raw = childLS.getItem(PRESSURE_LOG_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
};

// ─── Phase 14.4: Drift Log ───

const DRIFT_LOG_KEY = 'brainbro_drift_log_v1';

export const appendDriftLog = (status: { plateauDetected: boolean; regressionDetected: boolean; gamingDetected: boolean; driftScore: number; recommendation: string }) => {
    try {
        const raw = childLS.getItem(DRIFT_LOG_KEY);
        let log: (typeof status & { ts: string })[] = [];
        if (raw) { try { log = JSON.parse(raw); } catch { log = []; } }
        if (!Array.isArray(log)) log = [];
        log.unshift({ ...status, ts: new Date().toISOString() });
        if (log.length > 20) log = log.slice(0, 20);
        childLS.setItem(DRIFT_LOG_KEY, JSON.stringify(log));
    } catch { /* silent */ }
};

export const getDriftLog = (): { plateauDetected: boolean; regressionDetected: boolean; gamingDetected: boolean; driftScore: number; recommendation: string; ts: string }[] => {
    try {
        const raw = childLS.getItem(DRIFT_LOG_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
};

// ─── Phase 14.8: Decision Lab Storage ───
const DECISION_LAB_KEY = 'brainbro_decision_labs_v1';

export const getDecisionLabs = (): any[] => {
    try {
        const raw = childLS.getItem(DECISION_LAB_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
};

export const appendDecisionLab = (attempt: any) => {
    try {
        const labs = getDecisionLabs();
        labs.unshift(attempt);
        if (labs.length > 30) labs.length = 30;
        childLS.setItem(DECISION_LAB_KEY, JSON.stringify(labs));
    } catch { /* silent */ }
};

// ─── Phase 14.9: Vocab Profile Storage ───
const VOCAB_PROFILE_KEY = 'brainbro_vocab_v1';

export const getVocabProfile = (): any | null => {
    try {
        const raw = childLS.getItem(VOCAB_PROFILE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch { return null; }
};

export const saveVocabProfile = (profile: any) => {
    try {
        childLS.setItem(VOCAB_PROFILE_KEY, JSON.stringify(profile));
    } catch { /* silent */ }
};

export const upsertVocabWords = (words: Array<{ word: string; lang: 'en' | 'es'; wasWrong: boolean; example?: string }>) => {
    try {
        let profile = getVocabProfile();
        if (!profile) profile = { updatedAt: Date.now(), words: {} };
        const now = Date.now();
        for (const w of words) {
            const id = w.word.toLowerCase();
            if (profile.words[id]) {
                profile.words[id].seenCount++;
                profile.words[id].lastSeenAt = now;
                if (w.wasWrong) profile.words[id].wrongCount++;
                if (w.example && !(profile.words[id].examples || []).includes(w.example)) {
                    profile.words[id].examples = [...(profile.words[id].examples || []), w.example].slice(-3);
                }
            } else {
                profile.words[id] = {
                    id,
                    word: w.word,
                    lang: w.lang,
                    firstSeenAt: now,
                    lastSeenAt: now,
                    seenCount: 1,
                    wrongCount: w.wasWrong ? 1 : 0,
                    mastery: 0,
                    nextReviewAt: now + 86400000,
                    examples: w.example ? [w.example] : [],
                };
            }
        }
        profile.updatedAt = now;
        saveVocabProfile(profile);
    } catch { /* silent */ }
};

// ─── Phase 15.5: Autopilot Weekly Program ───

import type { WeeklyProgramConfig, DailyPlan } from '../types';

const WEEKLY_PROGRAM_KEY = 'brainbro_weekly_program_v1';
const DAILY_PLAN_KEY = 'brainbro_daily_plan_v1';

export function getWeeklyProgramConfig(): WeeklyProgramConfig | null {
    try {
        const raw = childLS.getItem(WEEKLY_PROGRAM_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return null;
}

export function saveWeeklyProgramConfig(cfg: WeeklyProgramConfig): void {
    childLS.setItem(WEEKLY_PROGRAM_KEY, JSON.stringify(cfg));
}

export function patchWeeklyProgramConfig(patch: Partial<WeeklyProgramConfig>): void {
    const current = getWeeklyProgramConfig();
    if (!current) return;
    const merged = { ...current, ...patch };
    if (patch.areaWeights) {
        merged.areaWeights = { ...current.areaWeights, ...patch.areaWeights };
    }
    saveWeeklyProgramConfig(merged);
}

export function getDailyPlan(): DailyPlan | null {
    try {
        const raw = childLS.getItem(DAILY_PLAN_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return null;
}

export function saveDailyPlan(plan: DailyPlan): void {
    childLS.setItem(DAILY_PLAN_KEY, JSON.stringify(plan));
}

export function toggleDailyPlanItemComplete(itemId: string, completed: boolean): void {
    const plan = getDailyPlan();
    if (!plan) return;
    const item = plan.items.find(i => i.id === itemId);
    if (item) {
        item.completed = completed;
        if (completed && !item.completedAt) item.completedAt = Date.now();
        saveDailyPlan(plan);
    }
}

export function startDailyPlanItem(itemId: string): void {
    const plan = getDailyPlan();
    if (!plan) return;
    const item = plan.items.find(i => i.id === itemId);
    if (item && !item.startedAt) {
        item.startedAt = Date.now();
        saveDailyPlan(plan);
    }
}

export function completeDailyPlanItem(itemId: string, evidence: import('../types').ItemEvidence): void {
    const plan = getDailyPlan();
    if (!plan) return;
    const item = plan.items.find(i => i.id === itemId);
    if (item) {
        item.completed = true;
        item.completedAt = Date.now();
        item.evidence = evidence;
        // Recompute integrity inline to avoid circular import
        let score = 100;
        const flags: string[] = [];
        for (const it of plan.items) {
            if (!it.completed) continue;
            if (!it.evidence) { score -= 25; if (!flags.includes('NO_EVIDENCE')) flags.push('NO_EVIDENCE'); }
            if (!it.startedAt) { score -= 10; if (!flags.includes('NO_START')) flags.push('NO_START'); }
            if (it.startedAt && it.completedAt) {
                const elapsed = (it.completedAt - it.startedAt) / 60000;
                if (elapsed < it.minutes * 0.25) { score -= 15; if (!flags.includes('FAST_COMPLETE')) flags.push('FAST_COMPLETE'); }
            }
        }
        plan.integrityScore = Math.max(0, Math.min(100, score));
        plan.suspiciousFlags = flags;
        saveDailyPlan(plan);
    }
}

// ─── Phase 15.7: Action Steps ───

const ACTION_STEPS_KEY = 'brainbro_action_steps_v1';

export function getActionSteps(): ActionStep[] {
    try {
        const raw = childLS.getItem(ACTION_STEPS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return [];
}

export function appendActionStep(step: ActionStep): void {
    const steps = getActionSteps();
    steps.push(step);
    childLS.setItem(ACTION_STEPS_KEY, JSON.stringify(steps));
}

export function updateActionStep(id: string, patch: Partial<ActionStep>): void {
    const steps = getActionSteps();
    const idx = steps.findIndex(s => s.id === id);
    if (idx >= 0) {
        steps[idx] = { ...steps[idx], ...patch };
        childLS.setItem(ACTION_STEPS_KEY, JSON.stringify(steps));
    }
}

export function getOpenStepsForDate(dateKey: string): ActionStep[] {
    return getActionSteps().filter(s => s.dueDateKey === dateKey && s.status === 'open');
}

export function computeFollowThrough(days: number = 7): { rate: number; completed: number; skipped: number } {
    const steps = getActionSteps();
    const cutoff = Date.now() - days * 86400000;
    const recent = steps.filter(s => s.createdAt >= cutoff && s.status !== 'open');
    const completed = recent.filter(s => s.status === 'done').length;
    const skipped = recent.filter(s => s.status === 'skipped').length;
    const total = completed + skipped;
    return { rate: total > 0 ? completed / total : 1, completed, skipped };
}

// ─── Phase 15.8: Writing Attempts ───

const WRITING_ATTEMPTS_KEY = 'brainbro_writing_attempts_v1';
const WRITING_WEEK_KEY = 'brainbro_writing_week_v1';

export function getWritingAttempts(): import('../types').WritingAttempt[] {
    try {
        const raw = childLS.getItem(WRITING_ATTEMPTS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return [];
}

export function appendWritingAttempt(attempt: import('../types').WritingAttempt): void {
    const list = getWritingAttempts();
    list.unshift(attempt);
    childLS.setItem(WRITING_ATTEMPTS_KEY, JSON.stringify(list.slice(0, 50)));
}

export function getLastWritingWeekKey(): string | null {
    return childLS.getItem(WRITING_WEEK_KEY);
}

export function setLastWritingWeekKey(weekKey: string): void {
    childLS.setItem(WRITING_WEEK_KEY, weekKey);
}

// ─── Phase 15.9: Reading Attempts ───

const READING_ATTEMPTS_KEY = 'brainbro_reading_attempts_v1';
const READING_WEEK_KEY = 'brainbro_reading_week_v1';

export function getReadingAttempts(): import('../types').ReadingAttempt[] {
    try {
        const raw = childLS.getItem(READING_ATTEMPTS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return [];
}

export function appendReadingAttempt(attempt: import('../types').ReadingAttempt): void {
    const list = getReadingAttempts();
    list.unshift(attempt);
    childLS.setItem(READING_ATTEMPTS_KEY, JSON.stringify(list.slice(0, 50)));
}

export function getLastReadingWeekKey(): string | null {
    return childLS.getItem(READING_WEEK_KEY);
}

export function setLastReadingWeekKey(weekKey: string): void {
    childLS.setItem(READING_WEEK_KEY, weekKey);
}

// ─── Phase 16.0: SEL Attempts ───

const SEL_ATTEMPTS_KEY = 'brainbro_sel_attempts_v1';
const SEL_WEEK_KEY = 'brainbro_sel_week_v1';

export function getSELAttempts(): import('../types').SELAttempt[] {
    try {
        const raw = childLS.getItem(SEL_ATTEMPTS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return [];
}

export function appendSELAttempt(attempt: import('../types').SELAttempt): void {
    const list = getSELAttempts();
    list.unshift(attempt);
    childLS.setItem(SEL_ATTEMPTS_KEY, JSON.stringify(list.slice(0, 50)));
}

export function getLastSELWeekKey(): string | null {
    return childLS.getItem(SEL_WEEK_KEY);
}

export function setLastSELWeekKey(weekKey: string): void {
    childLS.setItem(SEL_WEEK_KEY, weekKey);
}

// ─── Phase 16.1: Debriefs ───

const DEBRIEFS_KEY = 'brainbro_debriefs_v1';

interface StoredDebrief {
    weekKey: string;
    childId: string;
    md: string;
    createdAt: number;
}

export function getDebriefs(): StoredDebrief[] {
    try {
        const raw = childLS.getItem(DEBRIEFS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return [];
}

export function saveDebrief(weekKey: string, childId: string, md: string): void {
    const list = getDebriefs().filter(d => !(d.weekKey === weekKey && d.childId === childId));
    list.unshift({ weekKey, childId, md, createdAt: Date.now() });
    // Keep last 12 per child
    const byChild: Record<string, StoredDebrief[]> = {};
    list.forEach(d => { (byChild[d.childId] = byChild[d.childId] || []).push(d); });
    const trimmed: StoredDebrief[] = [];
    Object.values(byChild).forEach(arr => trimmed.push(...arr.slice(0, 12)));
    childLS.setItem(DEBRIEFS_KEY, JSON.stringify(trimmed));
}

export function getDebrief(weekKey: string, childId: string): StoredDebrief | null {
    return getDebriefs().find(d => d.weekKey === weekKey && d.childId === childId) || null;
}

// ─── Phase 16.3: Outcome Surveys ───

const OUTCOMES_KEY = 'brainbro_outcome_surveys_v1';

export function getOutcomeSurveys(): any[] {
    try {
        const raw = childLS.getItem(OUTCOMES_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return [];
}

export function appendOutcomeSurvey(resp: any): void {
    const list = getOutcomeSurveys().filter((s: any) => !(s.weekKey === resp.weekKey && s.childId === resp.childId));
    list.unshift(resp);
    // Keep last 52 weeks
    childLS.setItem(OUTCOMES_KEY, JSON.stringify(list.slice(0, 52)));
}

export function getOutcomeSurvey(weekKey: string, childId: string): any | null {
    return getOutcomeSurveys().find((s: any) => s.weekKey === weekKey && s.childId === childId) || null;
}

export function getLatestOutcome(childId: string): any | null {
    return getOutcomeSurveys().find((s: any) => s.childId === childId) || null;
}

// ─── Phase 16.4: Experiment Results ───

const EXPERIMENTS_KEY = 'brainbro_experiments_v1';

export function getExperimentResults(): any[] {
    try {
        const raw = childLS.getItem(EXPERIMENTS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return [];
}

export function appendExperimentResult(result: any): void {
    const list = getExperimentResults();
    list.unshift(result);
    childLS.setItem(EXPERIMENTS_KEY, JSON.stringify(list.slice(0, 20)));
}

// ─── Phase 16.5: Daily Ledger ───

const LEDGER_KEY = 'brainbro_daily_ledger_v1';

export function getDailyLedger(): Record<string, any> {
    try {
        const raw = childLS.getItem(LEDGER_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return {};
}

export function upsertLedgerEntry(entry: any): void {
    const ledger = getDailyLedger();
    ledger[entry.id] = entry;
    // Cap to 180 entries
    const keys = Object.keys(ledger).sort().reverse();
    if (keys.length > 180) {
        keys.slice(180).forEach(k => delete ledger[k]);
    }
    childLS.setItem(LEDGER_KEY, JSON.stringify(ledger));
}

export function getLedgerRange(days: number): any[] {
    const ledger = getDailyLedger();
    const entries = Object.values(ledger) as any[];
    entries.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    return entries.slice(0, days);
}

// ─── Phase 16.9: Goal Contracts ───

const CONTRACTS_KEY = 'brainbro_goal_contracts_v1';

export function getGoalContracts(): any[] {
    try {
        const raw = childLS.getItem(CONTRACTS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return [];
}

export function getGoalContract(weekKey: string, childId: string): any | null {
    return getGoalContracts().find((c: any) => c.weekKey === weekKey && c.childId === childId) || null;
}

export function saveGoalContract(contract: any): void {
    const list = getGoalContracts().filter((c: any) => c.id !== contract.id);
    list.unshift(contract);
    childLS.setItem(CONTRACTS_KEY, JSON.stringify(list.slice(0, 52)));
}

export function getLatestGoalContract(childId: string): any | null {
    return getGoalContracts().find((c: any) => c.childId === childId) || null;
}

// ─── Phase 17.0: System Health (global, not child-scoped) ───

const SMOKE_KEY = 'brainbro_system_health_v1';
const BUILD_CHECK_KEY = 'brainbro_build_check_v1';

export function saveSmokeTestResult(result: { passed: number; total: number; timings: Record<string, number>; at: number }): void {
    localStorage.setItem(SMOKE_KEY, JSON.stringify(result));
}

export function getSmokeTestResult(): { passed: number; total: number; timings: Record<string, number>; at: number } | null {
    try {
        const raw = localStorage.getItem(SMOKE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return null;
}

export function saveLastBuildCheck(result: { codefenceOk: boolean; buildOk: boolean; at: number }): void {
    localStorage.setItem(BUILD_CHECK_KEY, JSON.stringify(result));
}

export function getLastBuildCheck(): { codefenceOk: boolean; buildOk: boolean; at: number } | null {
    try {
        const raw = localStorage.getItem(BUILD_CHECK_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return null;
}

