/**
 * Phase 14.9: Spaced Retrieval Vocab Engine (SM-2 inspired)
 * Manages vocab word scheduling, mastery progression, and due word selection.
 */

import type { VocabWord, VocabProfile } from '../types';

const INTERVALS = [1, 2, 4, 7, 14, 30]; // days by mastery level
const DAY_MS = 86400000;

export function scheduleNext(word: VocabWord, correct: boolean): VocabWord {
    const now = Date.now();
    if (correct) {
        const newMastery = Math.min(5, word.mastery + 1) as 0 | 1 | 2 | 3 | 4 | 5;
        return {
            ...word,
            mastery: newMastery,
            seenCount: word.seenCount + 1,
            lastSeenAt: now,
            nextReviewAt: now + INTERVALS[newMastery] * DAY_MS,
        };
    }
    const newMastery = Math.max(0, word.mastery - 1) as 0 | 1 | 2 | 3 | 4 | 5;
    return {
        ...word,
        mastery: newMastery,
        seenCount: word.seenCount + 1,
        wrongCount: word.wrongCount + 1,
        lastSeenAt: now,
        nextReviewAt: now + DAY_MS, // reset to 1 day
    };
}

export function pickDueWords(profile: VocabProfile | null, now: number, limit: number = 12): VocabWord[] {
    if (!profile) return [];
    const all = Object.values(profile.words);
    const due = all
        .filter(w => w.nextReviewAt <= now)
        .sort((a, b) => a.nextReviewAt - b.nextReviewAt);
    return due.slice(0, limit);
}

export function countDueWords(profile: VocabProfile | null, now: number): number {
    if (!profile) return 0;
    return Object.values(profile.words).filter(w => w.nextReviewAt <= now).length;
}

export function getWeakWords(profile: VocabProfile | null, limit: number = 15): VocabWord[] {
    if (!profile) return [];
    return Object.values(profile.words)
        .sort((a, b) => (b.wrongCount - b.mastery) - (a.wrongCount - a.mastery))
        .slice(0, limit);
}

export function getMasteredCount(profile: VocabProfile | null): number {
    if (!profile) return 0;
    return Object.values(profile.words).filter(w => w.mastery >= 4).length;
}

// Stopwords for extraction filtering
const EN_STOP = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them', 'their', 'this', 'that', 'these', 'those', 'and', 'but', 'or', 'nor', 'not', 'no', 'so', 'if', 'for', 'of', 'to', 'in', 'on', 'at', 'by', 'with', 'from', 'as', 'into', 'about', 'between', 'through', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'then', 'once', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some', 'any', 'such', 'than', 'too', 'very', 'just', 'also', 'here', 'there', 'when', 'where', 'how', 'what', 'which', 'who', 'why', 'its', 'am', 'his', 'her']);
const ES_STOP = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'a', 'al', 'en', 'con', 'por', 'para', 'es', 'son', 'fue', 'ser', 'estar', 'hay', 'no', 'si', 'que', 'como', 'se', 'su', 'sus', 'lo', 'le', 'les', 'me', 'te', 'nos', 'mi', 'tu', 'yo', 'él', 'ella', 'eso', 'esto', 'más', 'muy', 'pero', 'y', 'o', 'ni', 'sin', 'sobre', 'entre', 'hasta', 'desde', 'donde', 'cuando', 'qué', 'cuál', 'quién', 'porque', 'cómo', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'ha', 'han', 'he', 'era', 'cada', 'todo', 'toda', 'todos', 'todas', 'otro', 'otra', 'otros', 'otras', 'ya', 'bien', 'mal', 'aquí', 'ahí', 'allí', 'así']);

export function extractVocabTokens(text: string, lang: 'en' | 'es'): string[] {
    if (!text || text.length < 3) return [];
    const stops = lang === 'en' ? EN_STOP : ES_STOP;
    return text
        .toLowerCase()
        .replace(/[^a-záéíóúüñ\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 3 && !stops.has(t) && !/^\d+$/.test(t))
        .filter((t, i, arr) => arr.indexOf(t) === i); // unique
}
