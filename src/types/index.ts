export interface Question {
    q: string;
    options: string[];
    correct: string;
    explanation_es: string;
    correction_en?: string;
    steps_es?: string[]; // for math
    type?: "multiple_choice";
}

export interface MathStepQuestion {
    id: string;
    type: "math_steps";
    prompt_en: string;
    prompt_es: string;
    problem: string;
    expectedAnswer: string;
    stepHints_es: string[];
    tags: string[]; // e.g. ["algebra", "fractions", "word_problem"]

    // Core Math Track Context Extensions
    why_it_matters_es: string;
    real_world_application_es: string;
    future_value_es: string;
    mental_skill_built_es: string;
    tier: 1 | 2 | 3 | 4;
    domain: "money" | "school" | "games" | "life" | "coding";
}

export type AnyQuestion = Question | MathStepQuestion;

export interface VocabItem {
    word: string;
    meaning_es: string;
    example_en: string;
    lastSeenDate?: string;
    mistakesCount?: number;
}

export interface SessionData {
    id: string;
    areaId?: "english" | "math" | "spanish" | "thinking" | "projects" | "life";
    source?: "mock" | "generated";
    accent?: "en-GB" | "en-US";
    topic: string;
    difficulty: number;
    text: string;
    questions: AnyQuestion[];
    vocabLearned: VocabItem[];
    coachTip: string;
}

export interface WrongAnswer {
    questionId?: number;
    questionText?: string;
    q: string; // legacy support if needed
    chosen: string;
    correct: string;
    explanation_es: string;
    correction_en?: string;
}

export interface SessionResult {
    id: string;
    areaId?: string; // e.g. "english", "math"
    date: string;
    accent: string;
    topic: string;
    difficulty: number;
    score: number;
    total: number;
    wrongQuestions: WrongAnswer[];
    vocabLearned: VocabItem[];
    // Math specific
    mathStepsTaken?: string[];
    mathStepsAccepted?: boolean[];
    mathFinalAnswerUser?: string;
}

export interface MissionTarget {
    type: "complete_session";
    difficulty: number;
    accent?: "en-GB" | "en-US";
    source?: "mock" | "generated" | "any";
}

export interface Mission {
    id: string;
    areaId: "english" | "math" | "spanish" | "thinking";
    title: string;
    description: string;
    target: MissionTarget;
}

export interface MissionData {
    dateISO: string;
    missions: Mission[];
    completedMissionIds: string[];
}

export interface StreakData {
    current: number;
    best: number;
    lastCompletedDateISO: string | null;
}

export interface XpData {
    total: number;
    byArea: Record<string, number>;
}

export interface OnboardingData {
    completed: boolean;
    step: number;
}

export interface ProfileData {
    name: string;
    age: number;
    interests: string[];
    goal: "exam" | "school" | "skills";
    coachStyle: "strict" | "friendly" | "competitive";
    dailyMinutes: 5 | 10 | 15 | 20;
}

export interface MistakeStat {
    tag: string;
    count: number;
    lastSeenISO: string;
}

export interface MistakeEvent {
    id: string;
    areaId: "english" | "math" | "spanish" | "thinking";
    sessionId: string;
    resultId: string;
    wrongQuestionIds: string[];
    createdAtISO: string;
}

export interface MistakesData {
    byArea: Record<string, MistakeStat[]>;
    recent: MistakeEvent[];
}

export interface CoachFeedback {
    summary_es: string;
    focus_tags: string[];
    rule_es: string;
    examples: { en: string; es: string }[];
    drill: {
        type: "repeat" | "fix" | "fill" | "choose";
        prompt_en: string;
        prompt_es: string;
        answer: string;
        choices?: string[];
    };
}

export interface PronunciationAttempt {
    id: string;
    createdAtISO: string;
    areaId: "english";
    sessionId: string;
    sentence: string;
    transcript: string;
    score: number;
    missing: string[];
    extra: string[];
}

export interface PronunciationData {
    attempts: PronunciationAttempt[];
    bestScoreBySentence: Record<string, number>;
    commonMissing: Record<string, number>;
}

// ─── Phase 14: Cognitive Edge Protocol ───

export type CognitiveErrorType =
    | 'conceptual'
    | 'impulsive'
    | 'misread'
    | 'no_check'
    | 'memory_gap'
    | 'unknown';

export type MentalModelId =
    | 'first_principles'
    | 'inversion'
    | 'second_order'
    | 'probabilistic'
    | 'analogical'
    | 'opportunity_cost'
    | 'margin_of_safety'
    | 'feedback_loops'
    | 'incentives'
    | 'signal_vs_noise'
    | 'base_rates'
    | 'expected_value'
    | 'none';

export interface CognitiveAttempt {
    questionIdx: number;
    confidence: number; // 0-100
    preReasoning: string;
    isCorrect: boolean;
    postReflection: string; // filled only when wrong
    errorType: CognitiveErrorType;
    nextTimeStrategy: string;
    reasoningQuality?: 0 | 1 | 2 | 3 | 4 | 5;
    ambiguityScore?: 0 | 1 | 2 | 3 | 4 | 5;
    ambiguityCase?: boolean;
    scoringMode?: 'ai' | 'heuristic';
    scoringNotes?: string;
    scorerVersion?: string;
    mentalModel?: MentalModelId;
    metaCognitionScore?: 0 | 1 | 2 | 3 | 4 | 5;
    adversarialId?: string;
    adversarialType?: 'verification' | 'misdirection' | 'assumption_trap';
    adversarialPass?: boolean;
    adversarialNotes?: string;
}

export interface CognitiveSessionSummary {
    id: string;
    sessionId: string;
    areaId: string;
    createdAtISO: string;
    attempts: CognitiveAttempt[];
    calibrationScore: number; // 0-100
    overconfidenceRate: number; // 0-1
    reflectionRate: number; // 0-1
    highConfWrongCount: number;
    mostCommonError: CognitiveErrorType;
    avgReasoningQuality: number; // 0-5
    ambiguityToleranceIndex: number; // 0-100
    avgMetaCognitionScore: number; // 0-5
    adversarialPassRate: number; // 0-1
}

export interface CognitiveProfile {
    calibration: number; // EWMA 0-100
    overconfidence: number; // EWMA 0-1
    reflection: number; // EWMA 0-1
    sessionsCount: number;
    lastUpdatedISO: string;
    reasoningQualityEwma: number; // 0-5
    ambiguityEwma: number; // 0-100
    modelCounts?: Record<string, number>;
    recentModelHistory?: string[];
    lastUsedModel?: string;
    metaCognitionEwma?: number; // 0-5
    adversarialPassEwma?: number; // 0-1
    decisionLabsCompleted?: number;
    decisionLabEwma?: number; // 0-5
    lastDecisionLabAt?: number;
    followThroughEwma?: number; // 0-1
    actionStepsCompleted?: number;
    actionStepsSkipped?: number;
    writingEwma?: number; // 0-5
    writingCompleted?: number;
    readingEwma?: number; // 0-5
    readingCompleted?: number;
    selEwma?: number; // 0-5
    selCompleted?: number;
    outcomeEwma?: number; // 1-5
    outcomesCompleted?: number;
    currentExperiment?: ExperimentConfig;
    contractsSigned?: number;
}

// Phase 16.9: Goal Contracts

export interface GoalContract {
    id: string;
    weekKey: string;
    childId: string;
    createdAt: number;
    academicGoal: string;
    behaviorGoal: string;
    integrityGoal: number;
    parentName: string;
    childName: string;
    parentSigned: boolean;
    childSigned: boolean;
    signedAt?: number;
}

// Phase 16.3: Behavioral Outcomes

export type OutcomeSurveyItemId = 'focus_homework' | 'handles_frustration' | 'honesty_effort' | 'initiative' | 'kindness' | 'sleep_routine' | 'screen_self_control';

export interface OutcomeSurveyResponse {
    id: string;
    weekKey: string;
    childId: string;
    createdAt: number;
    ratings: Record<OutcomeSurveyItemId, 1 | 2 | 3 | 4 | 5>;
    notes?: string;
}

export type SELTheme = 'impulse' | 'empathy' | 'conflict' | 'ethics_ai';

// Phase 16.4: Experiment Mode

export type ExperimentVariantId = 'baseline' | 'oc_penalty_strict' | 'ambiguity_boost' | 'reflection_boost' | 'writing_boost' | 'short_sessions';

export interface ExperimentConfig {
    enabled: boolean;
    variant: ExperimentVariantId;
    startDateKey: string;
    endDateKey: string;
    notes?: string;
}

export interface ExperimentMetrics {
    outcomeAvg: number;
    calibration: number;
    overconfidence: number;
    followThrough: number;
    meta: number;
}

export interface ExperimentResult {
    id: string;
    childId: string;
    variant: ExperimentVariantId;
    startDateKey: string;
    endDateKey: string;
    before: ExperimentMetrics;
    during: ExperimentMetrics;
    delta: ExperimentMetrics;
    createdAt: number;
}

// Phase 16.5: Unified Metrics Ledger

export interface DailyLedgerEntry {
    id: string;
    dateKey: string;
    childId: string;
    createdAt: number;
    metrics: {
        minutesPlanned: number;
        minutesCompleted: number;
        planIntegrity: number;
        sessionsCompleted: number;
        vocabReviewed: number;
        decisionLabDone: 0 | 1;
        writingDone: 0 | 1;
        readingDone: 0 | 1;
        selDone: 0 | 1;
        calibration: number;
        overconfidence: number;
        reflection: number;
        meta: number;
        adversarialPass: number;
        followThrough: number;
        outcomeAvg?: number;
    };
    flags: string[];
}

export interface SELScenario {
    id: string;
    ageBand: AgeBand;
    theme: SELTheme;
    scenario: string;
    prompts: string[];
}

export interface SELAttempt {
    id: string;
    scenarioId: string;
    createdAt: number;
    childId: string;
    answers: { a1: string; a2: string; a3?: string };
    score: 0 | 1 | 2 | 3 | 4 | 5;
    notes: string;
    mode: 'ai' | 'heuristic';
    theme: SELTheme;
}

export type ActionStepTag = 'verify' | 'slow_down' | 'assumptions' | 'confidence' | 'models' | 'time' | 'other';

export interface ActionStep {
    id: string;
    createdAt: number;
    source: 'post_reflection' | 'decision_lab' | 'adversarial';
    text: string;
    tag: ActionStepTag;
    status: 'open' | 'done' | 'skipped';
    dueDateKey: string;
    completedAt?: number;
}

export interface WritingPrompt {
    id: string;
    ageBand: AgeBand;
    topic: string;
    prompt: string;
}

export interface WritingScores {
    thesis: 0 | 1 | 2 | 3 | 4 | 5;
    evidence: 0 | 1 | 2 | 3 | 4 | 5;
    counter: 0 | 1 | 2 | 3 | 4 | 5;
    structure: 0 | 1 | 2 | 3 | 4 | 5;
    logic: 0 | 1 | 2 | 3 | 4 | 5;
    total: number;
}

export interface WritingAttempt {
    id: string;
    promptId: string;
    childId: string;
    createdAt: number;
    text: string;
    scores: WritingScores;
    notes: string;
    mode: 'ai' | 'heuristic';
}

export interface ReadingPassage {
    id: string;
    ageBand: AgeBand;
    title: string;
    text: string;
}

export interface ReadingAttempt {
    id: string;
    passageId: string;
    createdAt: number;
    childId: string;
    answers: {
        claims: string;
        factOpinion: string;
        verification: string;
        manipulation: string;
    };
    score: 0 | 1 | 2 | 3 | 4 | 5;
    notes: string;
    mode: 'ai' | 'heuristic';
}

export interface DecisionLabAttempt {
    id: string;
    theme: 'money' | 'social' | 'time' | 'safety' | 'ethics_ai';
    completedAt: string;
    score: 0 | 1 | 2 | 3 | 4 | 5;
    notes: string;
    answers: Record<string, string>;
    linkedModel?: MentalModelId;
}

export interface VocabWord {
    id: string;
    word: string;
    lang: 'en' | 'es';
    firstSeenAt: number;
    lastSeenAt: number;
    seenCount: number;
    wrongCount: number;
    mastery: 0 | 1 | 2 | 3 | 4 | 5;
    nextReviewAt: number;
    examples?: string[];
}

export interface VocabProfile {
    updatedAt: number;
    words: Record<string, VocabWord>;
}

export type AgeBand = '6-8' | '9-11' | '12-14' | '15-18';

export interface ChildProfile {
    id: string;
    name: string;
    createdAt: number;
    ageBand?: AgeBand;
}

export interface ChildRegistry {
    activeChildId: string;
    children: ChildProfile[];
}

// Phase 15.5: Autopilot Weekly Program
export interface WeeklyProgramConfig {
    enabled: boolean;
    weeklyMinutes: number;
    areaWeights: Record<string, number>;
}

export interface ItemEvidence {
    kind: 'timer' | 'attempts' | 'drill_score' | 'lab_score';
    value: number;
    note?: string;
}

export interface DailyPlanItem {
    id: string;
    type: 'session' | 'vocab' | 'decision_lab' | 'review';
    areaId?: string;
    sessionId?: string;
    minutes: number;
    reason: string;
    completed?: boolean;
    startedAt?: number;
    completedAt?: number;
    evidence?: ItemEvidence;
}

export interface DailyPlan {
    dateKey: string;
    items: DailyPlanItem[];
    totalMinutes: number;
    generatedAt: number;
    integrityScore?: number;
    suspiciousFlags?: string[];
}
