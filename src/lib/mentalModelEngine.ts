import type { CognitiveProfile } from '../types';

export type RotationModelId =
    | 'opportunity_cost'
    | 'second_order'
    | 'margin_of_safety'
    | 'feedback_loops'
    | 'incentives'
    | 'signal_vs_noise'
    | 'base_rates'
    | 'expected_value';

export const ALL_MODELS: RotationModelId[] = [
    'opportunity_cost',
    'second_order',
    'margin_of_safety',
    'feedback_loops',
    'incentives',
    'signal_vs_noise',
    'base_rates',
    'expected_value',
];

export const MODEL_LABELS: Record<RotationModelId, string> = {
    opportunity_cost: 'Costo de Oportunidad',
    second_order: 'Pensamiento de Segundo Orden',
    margin_of_safety: 'Margen de Seguridad',
    feedback_loops: 'Bucles de Retroalimentación',
    incentives: 'Incentivos',
    signal_vs_noise: 'Señal vs Ruido',
    base_rates: 'Tasas Base',
    expected_value: 'Valor Esperado',
};

const MODEL_KEYWORDS: Record<RotationModelId, string[]> = {
    opportunity_cost: ['oportunidad', 'alternativa', 'costo', 'sacrific', 'renunci'],
    second_order: ['segundo orden', 'consecuencia', 'largo plazo', 'efecto secundario', 'cadena'],
    margin_of_safety: ['margen', 'seguridad', 'peor caso', 'buffer', 'reserva', 'riesgo'],
    feedback_loops: ['retroalimentación', 'ciclo', 'loop', 'se refuerza', 'amplifica'],
    incentives: ['incentivo', 'motivación', 'recompensa', 'castigo', 'beneficio'],
    signal_vs_noise: ['señal', 'ruido', 'relevante', 'irrelevante', 'distracción', 'importante'],
    base_rates: ['tasa base', 'probabilidad', 'frecuencia', 'estadística', 'porcentaje'],
    expected_value: ['valor esperado', 'probabilidad', 'expectativa', 'promedio', 'esperanza'],
};

export function getNextRequiredModel(profile: CognitiveProfile | null): RotationModelId {
    const counts = profile?.modelCounts || {};
    const history = profile?.recentModelHistory || [];

    // Find least-used model
    let minCount = Infinity;
    let candidate: RotationModelId = ALL_MODELS[0];
    for (const m of ALL_MODELS) {
        const c = counts[m] || 0;
        if (c < minCount) {
            minCount = c;
            candidate = m;
        }
    }

    // If same model used 3 sessions in a row, force different
    if (history.length >= 3) {
        const last3 = history.slice(0, 3);
        if (last3.every(h => h === candidate)) {
            // Pick next least-used that's different
            const sorted = ALL_MODELS
                .filter(m => m !== candidate)
                .sort((a, b) => (counts[a] || 0) - (counts[b] || 0));
            if (sorted.length > 0) candidate = sorted[0];
        }
    }

    return candidate;
}

export function shouldForceModel(profile: CognitiveProfile | null): boolean {
    if (!profile || profile.sessionsCount < 2) return false;
    const rq = profile.reasoningQualityEwma ?? 0;
    const amb = profile.ambiguityEwma ?? 0;
    return rq > 3.5 && amb > 60;
}

export function checkModelReference(text: string, model: RotationModelId): boolean {
    const lower = text.toLowerCase();
    const keywords = MODEL_KEYWORDS[model] || [];
    return keywords.some(kw => lower.includes(kw));
}

export function updateModelRotation(
    profile: CognitiveProfile,
    modelUsed: RotationModelId
): CognitiveProfile {
    const counts = { ...(profile.modelCounts || {}) };
    counts[modelUsed] = (counts[modelUsed] || 0) + 1;

    const history = [modelUsed, ...(profile.recentModelHistory || [])].slice(0, 10);

    return {
        ...profile,
        modelCounts: counts,
        recentModelHistory: history,
        lastUsedModel: modelUsed,
    };
}
