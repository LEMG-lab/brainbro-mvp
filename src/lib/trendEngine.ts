/**
 * Phase 16.6: Trend Engine
 * Lightweight trend detection from ledger data arrays.
 */

// ─── Normalize ───

export function normalize(values: number[], min?: number, max?: number): number[] {
    const lo = min ?? Math.min(...values);
    const hi = max ?? Math.max(...values);
    const range = hi - lo || 1;
    return values.map(v => (v - lo) / range);
}

// ─── 3-Day Downtrend ───

export function detect3DayDowntrend(values: number[]): boolean {
    if (values.length < 3) return false;
    const last3 = values.slice(-3);
    // Strictly decreasing
    if (last3[0] > last3[1] && last3[1] > last3[2]) return true;
    // Average comparison: last3 avg < prev3 avg by >= 10%
    if (values.length >= 6) {
        const prev3 = values.slice(-6, -3);
        const avgLast = last3.reduce((a, b) => a + b, 0) / 3;
        const avgPrev = prev3.reduce((a, b) => a + b, 0) / 3;
        if (avgPrev > 0 && (avgPrev - avgLast) / avgPrev >= 0.1) return true;
    }
    return false;
}

// ─── 3-Day Uptrend ───

export function detect3DayUptrend(values: number[]): boolean {
    if (values.length < 3) return false;
    const last3 = values.slice(-3);
    if (last3[0] < last3[1] && last3[1] < last3[2]) return true;
    if (values.length >= 6) {
        const prev3 = values.slice(-6, -3);
        const avgLast = last3.reduce((a, b) => a + b, 0) / 3;
        const avgPrev = prev3.reduce((a, b) => a + b, 0) / 3;
        if (avgPrev > 0 && (avgLast - avgPrev) / avgPrev >= 0.1) return true;
    }
    return false;
}

// ─── Trend Label ───

export function computeTrendLabel(values: number[]): 'up' | 'down' | 'flat' {
    if (detect3DayUptrend(values)) return 'up';
    if (detect3DayDowntrend(values)) return 'down';
    return 'flat';
}

// ─── Early Warning Checks ───

export interface EarlyWarning {
    metric: string;
    label: string;
    suggestion: string;
}

export function detectEarlyWarnings(ledgerEntries: any[]): EarlyWarning[] {
    if (ledgerEntries.length < 3) return [];

    const warnings: EarlyWarning[] = [];
    // Entries are sorted newest-first from getLedgerRange, reverse for chronological
    const chrono = [...ledgerEntries].reverse();

    const checks: { key: string; label: string; suggestion: string; invert?: boolean }[] = [
        { key: 'planIntegrity', label: 'Plan Integrity', suggestion: 'Reduce daily plan load or add shorter activities' },
        { key: 'minutesCompleted', label: 'Minutes Completed', suggestion: 'Check if sessions are too long or child is fatigued' },
        { key: 'calibration', label: 'Calibration', suggestion: 'Focus on confidence alignment exercises' },
        { key: 'followThrough', label: 'Follow-Through', suggestion: 'Review action step difficulty and add micro-tasks' },
        { key: 'overconfidence', label: 'Overconfidence', suggestion: 'Add more adversarial challenges', invert: true },
    ];

    for (const check of checks) {
        const vals = chrono.map((e: any) => e.metrics[check.key]).filter((v: any) => v != null);
        if (vals.length < 3) continue;

        if (check.invert) {
            // For overconfidence, uptrend is bad
            if (detect3DayUptrend(vals)) {
                warnings.push({ metric: check.key, label: check.label, suggestion: check.suggestion });
            }
        } else {
            if (detect3DayDowntrend(vals)) {
                warnings.push({ metric: check.key, label: check.label, suggestion: check.suggestion });
            }
        }
    }

    return warnings;
}
