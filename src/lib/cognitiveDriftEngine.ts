import type { CognitiveSessionSummary, CognitiveProfile } from '../types';

export type DriftRecommendation = 'escalate' | 'stabilize' | 'intensify_models' | 'increase_uncertainty';

export interface DriftAnalysis {
    plateauDetected: boolean;
    regressionDetected: boolean;
    gamingDetected: boolean;
    driftScore: number; // 0-100
    recommendation: DriftRecommendation;
}

function simpleHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return h;
}

export function analyzeDrift(
    lastSessions: CognitiveSessionSummary[],
    profile: CognitiveProfile | null
): DriftAnalysis {
    const empty: DriftAnalysis = {
        plateauDetected: false,
        regressionDetected: false,
        gamingDetected: false,
        driftScore: 0,
        recommendation: 'stabilize',
    };

    if (!profile || profile.sessionsCount < 3 || lastSessions.length < 3) return empty;

    // — Plateau Detection (last 5 sessions) —
    const recent5 = lastSessions.slice(0, 5);
    let plateauDetected = false;
    if (recent5.length >= 3) {
        const calScores = recent5.map(s => s.calibrationScore);
        const rqScores = recent5.map(s => s.avgReasoningQuality);
        const calRange = Math.max(...calScores) - Math.min(...calScores);
        const rqRange = Math.max(...rqScores) - Math.min(...rqScores);
        plateauDetected = calRange < 2 && rqRange < 0.3;
    }

    // — Regression Detection (last 3 sessions) —
    const recent3 = lastSessions.slice(0, 3);
    let regressionDetected = false;
    if (recent3.length >= 3) {
        const ocRates = recent3.map(s => s.overconfidenceRate);
        const ocIncrease = ocRates[0] - ocRates[ocRates.length - 1];
        const refRates = recent3.map(s => s.reflectionRate);
        const refDrop = refRates[refRates.length - 1] - refRates[0];
        regressionDetected = ocIncrease > 0.08 || refDrop > 0.15;
    }

    // — Gaming Detection —
    let gamingDetected = false;
    const allAttempts = lastSessions.slice(0, 10).flatMap(s => s.attempts);
    if (allAttempts.length > 0) {
        const defaultConfCount = allAttempts.filter(a => a.confidence === 50).length;
        const defaultRate = defaultConfCount / allAttempts.length;

        const textHashes: Record<number, number> = {};
        for (const a of allAttempts) {
            if (a.preReasoning && a.preReasoning.trim().length > 0) {
                const h = simpleHash(a.preReasoning.trim().toLowerCase());
                textHashes[h] = (textHashes[h] || 0) + 1;
            }
        }
        const repeatedHashes = Object.values(textHashes).filter(c => c > 3).length;

        gamingDetected = defaultRate > 0.4 || repeatedHashes > 0;
    }

    // — Drift Score (0-100) —
    let driftScore = 0;
    if (plateauDetected) driftScore += 30;
    if (regressionDetected) driftScore += 40;
    if (gamingDetected) driftScore += 30;

    // Phase 15.7: Low follow-through pressure
    if (profile.followThroughEwma !== undefined && profile.followThroughEwma < 0.5) {
        driftScore += 10;
    }

    driftScore = Math.min(100, driftScore);

    // — Recommendation —
    let recommendation: DriftRecommendation = 'stabilize';
    if (regressionDetected) recommendation = 'escalate';
    else if (gamingDetected) recommendation = 'intensify_models';
    else if (plateauDetected) recommendation = 'increase_uncertainty';

    return {
        plateauDetected,
        regressionDetected,
        gamingDetected,
        driftScore,
        recommendation,
    };
}
