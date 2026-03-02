import type { CognitiveAttempt, CognitiveSessionSummary, CognitiveProfile, CognitiveErrorType } from '../types';

/**
 * Brier-based calibration scoring.
 */
function computeCalibration(attempts: CognitiveAttempt[]): number {
    if (attempts.length === 0) return 50;
    const totalBrier = attempts.reduce((sum, a) => {
        const c = Math.max(0, Math.min(1, a.confidence / 100));
        const y = a.isCorrect ? 1 : 0;
        return sum + (c - y) ** 2;
    }, 0);
    return Math.round(100 * (1 - totalBrier / attempts.length));
}

function computeOverconfidenceRate(attempts: CognitiveAttempt[]): number {
    if (attempts.length === 0) return 0;
    const highConfWrong = attempts.filter(a => a.confidence >= 80 && !a.isCorrect).length;
    return highConfWrong / attempts.length;
}

function computeReflectionRate(attempts: CognitiveAttempt[]): number {
    if (attempts.length === 0) return 0;
    const reflected = attempts.filter(a => (a.postReflection || '').length >= 10).length;
    return reflected / attempts.length;
}

function computeHighConfWrongCount(attempts: CognitiveAttempt[]): number {
    return attempts.filter(a => a.confidence >= 80 && !a.isCorrect).length;
}

function computeMostCommonError(attempts: CognitiveAttempt[]): CognitiveErrorType {
    const wrong = attempts.filter(a => !a.isCorrect);
    if (wrong.length === 0) return 'unknown';
    const counts: Record<string, number> = {};
    wrong.forEach(a => { counts[a.errorType] = (counts[a.errorType] || 0) + 1; });
    let maxType: CognitiveErrorType = 'unknown';
    let maxCount = 0;
    for (const [type, count] of Object.entries(counts)) {
        if (count > maxCount) { maxCount = count; maxType = type as CognitiveErrorType; }
    }
    return maxType;
}

function computeAvgReasoningQuality(attempts: CognitiveAttempt[]): number {
    const scored = attempts.filter(a => a.reasoningQuality !== undefined);
    if (scored.length === 0) return 0;
    const sum = scored.reduce((s, a) => s + (a.reasoningQuality ?? 0), 0);
    return parseFloat((sum / scored.length).toFixed(2));
}

function computeAmbiguityToleranceIndex(attempts: CognitiveAttempt[]): number {
    const ambig = attempts.filter(a => a.ambiguityCase && a.ambiguityScore !== undefined);
    if (ambig.length === 0) return 0;
    const avg = ambig.reduce((s, a) => s + (a.ambiguityScore ?? 0), 0) / ambig.length;
    return Math.round(20 * avg); // 0-100
}

function computeAvgMetaCognitionScore(attempts: CognitiveAttempt[]): number {
    const scored = attempts.filter(a => a.metaCognitionScore !== undefined);
    if (scored.length === 0) return 0;
    const sum = scored.reduce((s, a) => s + (a.metaCognitionScore ?? 0), 0);
    return parseFloat((sum / scored.length).toFixed(2));
}

function computeAdversarialPassRate(attempts: CognitiveAttempt[]): number {
    const adv = attempts.filter(a => a.adversarialId !== undefined);
    if (adv.length === 0) return 0;
    const passed = adv.filter(a => a.adversarialPass).length;
    return parseFloat((passed / adv.length).toFixed(3));
}

export function buildCognitiveSessionSummary(
    sessionId: string,
    areaId: string,
    createdAt: string,
    attempts: CognitiveAttempt[]
): CognitiveSessionSummary {
    return {
        id: `cog-${Date.now()}`,
        sessionId,
        areaId,
        createdAtISO: createdAt,
        attempts,
        calibrationScore: computeCalibration(attempts),
        overconfidenceRate: computeOverconfidenceRate(attempts),
        reflectionRate: computeReflectionRate(attempts),
        highConfWrongCount: computeHighConfWrongCount(attempts),
        mostCommonError: computeMostCommonError(attempts),
        avgReasoningQuality: computeAvgReasoningQuality(attempts),
        ambiguityToleranceIndex: computeAmbiguityToleranceIndex(attempts),
        avgMetaCognitionScore: computeAvgMetaCognitionScore(attempts),
        adversarialPassRate: computeAdversarialPassRate(attempts),
    };
}

/**
 * EWMA update with alpha=0.25.
 */
export function updateCognitiveProfile(
    prev: CognitiveProfile | null,
    summary: CognitiveSessionSummary
): CognitiveProfile {
    const alpha = 0.25;
    if (!prev || prev.sessionsCount === 0) {
        return {
            calibration: summary.calibrationScore,
            overconfidence: summary.overconfidenceRate,
            reflection: summary.reflectionRate,
            sessionsCount: 1,
            lastUpdatedISO: new Date().toISOString(),
            reasoningQualityEwma: summary.avgReasoningQuality,
            ambiguityEwma: summary.ambiguityToleranceIndex,
            metaCognitionEwma: summary.avgMetaCognitionScore,
            adversarialPassEwma: summary.adversarialPassRate,
        };
    }
    return {
        calibration: Math.round(alpha * summary.calibrationScore + (1 - alpha) * prev.calibration),
        overconfidence: parseFloat((alpha * summary.overconfidenceRate + (1 - alpha) * prev.overconfidence).toFixed(3)),
        reflection: parseFloat((alpha * summary.reflectionRate + (1 - alpha) * prev.reflection).toFixed(3)),
        sessionsCount: prev.sessionsCount + 1,
        lastUpdatedISO: new Date().toISOString(),
        reasoningQualityEwma: parseFloat((alpha * summary.avgReasoningQuality + (1 - alpha) * (prev.reasoningQualityEwma ?? 0)).toFixed(2)),
        ambiguityEwma: Math.round(alpha * summary.ambiguityToleranceIndex + (1 - alpha) * (prev.ambiguityEwma ?? 0)),
        metaCognitionEwma: parseFloat((alpha * summary.avgMetaCognitionScore + (1 - alpha) * (prev.metaCognitionEwma ?? 0)).toFixed(2)),
        adversarialPassEwma: parseFloat((alpha * summary.adversarialPassRate + (1 - alpha) * (prev.adversarialPassEwma ?? 0)).toFixed(3)),
    };
}
