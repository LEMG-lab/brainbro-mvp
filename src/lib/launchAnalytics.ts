/**
 * Phase 17.1: Launch Analytics
 * Tracks adoption metrics: sessions, active days, minutes per day.
 * Child-scoped in localStorage.
 */

const LAUNCH_KEY = 'brainbro_launch_metrics_v1';
const REFLECTION_KEY = 'brainbro_daily_reflection_log_v1';
const FOCUS_KEY = 'brainbro_focus_mode_v1';

interface LaunchMetrics {
    firstSessionStartedAt: number | null;
    firstSessionCompletedAt: number | null;
    sessionLog: { date: string; started: number; completed: number; minutes: number }[];
}

function getDateKey(now: number = Date.now()): string {
    const d = new Date(now);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadMetrics(): LaunchMetrics {
    try {
        const raw = localStorage.getItem(LAUNCH_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return { firstSessionStartedAt: null, firstSessionCompletedAt: null, sessionLog: [] };
}

function saveMetrics(m: LaunchMetrics): void {
    localStorage.setItem(LAUNCH_KEY, JSON.stringify(m));
}

// ─── Public API ───

export function trackSessionStart(now: number = Date.now()): void {
    const m = loadMetrics();
    if (!m.firstSessionStartedAt) m.firstSessionStartedAt = now;
    const dk = getDateKey(now);
    const existing = m.sessionLog.find(e => e.date === dk);
    if (existing) {
        existing.started++;
    } else {
        m.sessionLog.push({ date: dk, started: 1, completed: 0, minutes: 0 });
    }
    // Cap to 90 days
    m.sessionLog = m.sessionLog.slice(-90);
    saveMetrics(m);
}

export function trackSessionComplete(minutes: number, now: number = Date.now()): void {
    const m = loadMetrics();
    if (!m.firstSessionCompletedAt) m.firstSessionCompletedAt = now;
    const dk = getDateKey(now);
    const existing = m.sessionLog.find(e => e.date === dk);
    if (existing) {
        existing.completed++;
        existing.minutes += minutes;
    } else {
        m.sessionLog.push({ date: dk, started: 1, completed: 1, minutes });
    }
    m.sessionLog = m.sessionLog.slice(-90);
    saveMetrics(m);
}

export function getLaunchMetrics(): {
    daysActiveLast14: number;
    averageMinutesPerActiveDay: number;
    sessionsPerDay: number;
    totalSessions: number;
    completionRate: number;
} {
    const m = loadMetrics();
    const now = Date.now();
    const cutoff = now - 14 * 86400000;
    const recent = m.sessionLog.filter(e => new Date(e.date).getTime() >= cutoff);

    const daysActiveLast14 = recent.length;
    const totalMinutes = recent.reduce((s, e) => s + e.minutes, 0);
    const averageMinutesPerActiveDay = daysActiveLast14 > 0 ? Math.round(totalMinutes / daysActiveLast14) : 0;
    const totalStarted = recent.reduce((s, e) => s + e.started, 0);
    const totalCompleted = recent.reduce((s, e) => s + e.completed, 0);
    const sessionsPerDay = daysActiveLast14 > 0 ? Math.round((totalStarted / daysActiveLast14) * 10) / 10 : 0;
    const completionRate = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;

    return { daysActiveLast14, averageMinutesPerActiveDay, sessionsPerDay, totalSessions: totalStarted, completionRate };
}

// ─── Daily Reflection ───

export function saveDailyReflection(text: string, now: number = Date.now()): void {
    try {
        const raw = localStorage.getItem(REFLECTION_KEY);
        const log: { date: string; text: string }[] = raw ? JSON.parse(raw) : [];
        log.unshift({ date: getDateKey(now), text: text.slice(0, 200) });
        localStorage.setItem(REFLECTION_KEY, JSON.stringify(log.slice(0, 90)));
    } catch { /* silent */ }
}

// ─── Focus Mode ───

export function getFocusMode(): boolean {
    return localStorage.getItem(FOCUS_KEY) === 'true';
}

export function setFocusMode(on: boolean): void {
    localStorage.setItem(FOCUS_KEY, on ? 'true' : 'false');
}
