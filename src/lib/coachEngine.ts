import { sessions } from '../data/sessions';

export interface RecommendationParams {
    score?: number;
    total?: number;
    weakVocabCount?: number;
    currentDifficulty: number;
    currentAccent: 'en-GB' | 'en-US';
    historyCount: number;
    lastSessions: { id: string; accent: 'en-GB' | 'en-US'; score: number; total: number }[];
}

export interface Recommendation {
    recommendedDifficulty: number;
    recommendedAccent: 'en-GB' | 'en-US';
    recommendedSessionId: string | null;
    focus: Array<"listening_detail" | "vocab" | "grammar_usage" | "speed">;
    message_es: string;
}

export function getNextRecommendation(params: RecommendationParams): Recommendation {
    // 1. Determine baseline from history
    if (params.historyCount === 0 || params.score === undefined || params.total === undefined) {
        return {
            recommendedDifficulty: 2,
            recommendedAccent: 'en-GB',
            recommendedSessionId: findSession(2, null),
            focus: ["listening_detail", "vocab"],
            message_es: "¡Bienvenido! Empecemos con algo de nivel 2 y acento británico para calentar el oído.",
        };
    }

    const ratio = params.score / params.total;
    let nextDiff = params.currentDifficulty;
    let nextAccent = params.currentAccent;
    const focus: Recommendation["focus"] = [];
    let message_es = "";

    // Check vocab weakness first
    if (params.weakVocabCount !== undefined && params.weakVocabCount >= 5) {
        message_es = "Hay varias palabras que se te escapan. Vamos a un nivel más accesible para repasar vocabulario clave.";
        focus.push("vocab");
        nextDiff = Math.max(1, nextDiff - 1);
    } else if (ratio <= 0.4) { // <= 2/5
        nextDiff = Math.max(1, nextDiff - 1);
        focus.push("listening_detail", "vocab");
        message_es = "Ese audio estuvo rudo. No pasa nada, le bajamos un poco la dificultad para afinar mejor el detalle.";
    } else if (ratio > 0.4 && ratio < 0.8) { // == 3/5
        focus.push("vocab");
        message_es = "Buen intento, casi lo tienes. Mantenemos el nivel para consolidar lo aprendido.";
    } else { // >= 4/5
        nextDiff = Math.min(5, nextDiff + 1);
        focus.push("speed");
        message_es = "¡Excelente! Dominaste esa sesión. Subimos el nivel para mantener el reto vivo.";

        // Check for accent mastery (if they did well twice in a row on same accent)
        if (params.lastSessions.length >= 2) {
            const [last, prev] = params.lastSessions;
            if (
                last.accent === nextAccent && prev.accent === nextAccent &&
                (last.score / last.total) >= 0.8 && (prev.score / prev.total) >= 0.8
            ) {
                nextAccent = nextAccent === 'en-GB' ? 'en-US' : 'en-GB';
                message_es += ` Escuchas muy bien el acento ${last.accent === 'en-GB' ? 'británico' : 'americano'}. ¡Cambiemos al ${nextAccent === 'en-GB' ? 'británico' : 'americano'} para entrenar otras frecuencias!`;
            }
        }
    }

    const lastId = params.lastSessions.length > 0 ? params.lastSessions[0].id : null;
    const recommendedSessionId = findSession(nextDiff, lastId);

    return {
        recommendedDifficulty: nextDiff,
        recommendedAccent: nextAccent,
        recommendedSessionId,
        focus,
        message_es
    };
}

function findSession(targetDiff: number, excludeId: string | null): string | null {
    // Prefer exact difficulty, exclude last one if possible
    let options = sessions.filter(s => s.difficulty === targetDiff && s.id !== excludeId);
    if (options.length === 0) {
        // If no options, allow the excluded one if it matches difficulty
        options = sessions.filter(s => s.difficulty === targetDiff);
    }
    if (options.length === 0) {
        // If STILL no options, find closest
        options = [...sessions].sort((a, b) => Math.abs(a.difficulty - targetDiff) - Math.abs(b.difficulty - targetDiff));
    }
    return options.length > 0 ? options[0].id : null;
}
