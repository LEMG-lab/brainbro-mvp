export interface Question {
    q: string;
    options: string[];
    correct: string;
    explanation_es: string;
}

export interface VocabItem {
    word: string;
    meaning_es: string;
    example_en: string;
    lastSeenDate?: string;
    mistakesCount?: number;
}

export interface SessionData {
    id: string;
    topic: string;
    difficulty: number;
    text: string;
    questions: Question[];
    vocabLearned: VocabItem[];
    coachTip: string;
}

export interface WrongAnswer {
    q: string;
    chosen: string;
    correct: string;
    explanation_es: string;
}

export interface SessionResult {
    id: string;
    date: string;
    accent: string;
    topic: string;
    difficulty: number;
    score: number;
    total: number;
    wrongQuestions: WrongAnswer[];
    vocabLearned: VocabItem[];
}
