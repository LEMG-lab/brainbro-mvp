/**
 * Phase 15.4: Teacher Engine — lesson plan + worksheet generation
 * Deterministic by date. Uses existing sessions data.
 */

import { sessions } from '../data/sessions';
import type { Question, MathStepQuestion, AnyQuestion } from '../types';
import { filterPrompt, getActiveAgeBand } from './safetyPolicy';

// ─── Helpers ───

function isMathStep(q: AnyQuestion): q is MathStepQuestion {
    return 'type' in q && q.type === 'math_steps';
}

function isQuestion(q: AnyQuestion): q is Question {
    return 'q' in q && 'options' in q;
}

function dayHash(dateNow: number, salt: number = 0): number {
    const d = Math.floor(dateNow / 86400000) + salt;
    return ((d * 2654435761) >>> 0) % 65536;
}



export function getAvailableAreas(): { id: string; label: string }[] {
    return [
        { id: 'english', label: 'English' },
        { id: 'math', label: 'Math' },
        { id: 'spanish', label: 'Spanish' },
        { id: 'thinking', label: 'Thinking' },
        { id: 'projects', label: 'Projects' },
        { id: 'life', label: 'Life Skills' },
    ];
}

export function getAvailableTiers(areaId: string): string[] {
    if (areaId === 'math') return ['1', '2', '3', '4'];
    return ['1'];
}

// ─── Question Picker ───

export interface PickedQuestion {
    prompt: string;
    answer?: string;
    choices?: string[];
    type: 'mcq' | 'math' | 'verification' | 'ambiguity';
}

export function pickQuestions(params: {
    areaId: string;
    tier: string;
    count: number;
    dateNow: number;
}): PickedQuestion[] {
    const { areaId, tier, count, dateNow } = params;
    const band = getActiveAgeBand();
    const hash = dayHash(dateNow);

    // Filter sessions by area
    let pool = sessions.filter(s => {
        if (s.areaId && s.areaId !== areaId) return false;
        if (!s.areaId && areaId !== 'english') return false; // default sessions are english
        return true;
    });

    if (pool.length === 0) pool = sessions.slice(0, 8); // fallback

    // Collect all questions
    const allQs: PickedQuestion[] = [];
    pool.forEach(s => {
        s.questions.forEach(q => {
            if (isMathStep(q)) {
                if (tier !== 'all' && String(q.tier) !== tier) return;
                allQs.push({
                    prompt: filterPrompt(q.prompt_en || q.problem, band),
                    answer: q.expectedAnswer,
                    type: 'math',
                });
            } else if (isQuestion(q)) {
                allQs.push({
                    prompt: filterPrompt(q.q, band),
                    answer: q.correct,
                    choices: q.options,
                    type: 'mcq',
                });
            }
        });
    });

    // Deterministic shuffle by day
    const shuffled = allQs.map((q, i) => ({ q, sort: (hash + i * 7919) % 65536 }))
        .sort((a, b) => a.sort - b.sort)
        .map(x => x.q);

    const picked = shuffled.slice(0, Math.min(count, shuffled.length));

    // Add 2 verification prompts
    const verificationPrompts: PickedQuestion[] = [
        { prompt: filterPrompt('Antes de responder la siguiente pregunta, lista 2 formas en que tu respuesta podría estar equivocada.', band), type: 'verification' },
        { prompt: filterPrompt('¿Qué evidencia necesitarías para estar seguro de tu respuesta? Lista al menos 2 fuentes.', band), type: 'verification' },
    ];

    // Add 1 ambiguity prompt (age-safe)
    const ambiguityPrompts = [
        'Tu amigo dice que siempre es mejor ahorrar dinero. ¿Estás de acuerdo? Explica pros y contras.',
        'Un compañero copia tareas y saca mejor nota que tú. ¿Es justo? Argumenta.',
        'Tienes 30 minutos libres: ¿estudias o descansas? Explica tu razonamiento.',
    ];
    const ambiguity: PickedQuestion = {
        prompt: filterPrompt(ambiguityPrompts[hash % ambiguityPrompts.length], band),
        type: 'ambiguity',
    };

    return [...picked, ...verificationPrompts, ambiguity];
}

// ─── Lesson Plan ───

export function buildLessonPlan(params: {
    areaId: string;
    tier: string;
    duration: 30 | 45;
    dateNow: number;
}): string {
    const { areaId, tier, duration, dateNow } = params;
    const areaLabel = getAvailableAreas().find(a => a.id === areaId)?.label || areaId;
    const band = getActiveAgeBand();
    const date = new Date(dateNow).toISOString().split('T')[0];

    const coreMin = duration === 30 ? 18 : 28;
    const warmup = 5;
    const cogEdge = 5;
    const decisionLab = duration === 45 ? 5 : 3;
    const wrapup = duration === 30 ? 2 : 2;

    const decisionScenario = filterPrompt(
        'Los estudiantes deben decidir cómo repartir su tiempo entre una tarea urgente y una actividad que les gusta. Deben argumentar su decisión.',
        band
    );

    return `# Lesson Plan — ${areaLabel}
**Date:** ${date}
**Duration:** ${duration} min | **Tier:** ${tier} | **Age Band:** ${band}

---

## 🎯 Objective
Students will practice ${areaLabel.toLowerCase()} skills through structured exercises, verify their reasoning, and practice critical thinking through cognitive challenges.

---

## 🔥 Warm-Up (${warmup} min)
- Quick review: ask 2-3 oral questions from previous session
- Activate prior knowledge: "What do you remember about...?"
- Set expectations: "Today we focus on reasoning quality, not just correct answers"

---

## 📚 Core Activity (${coreMin} min)
- Distribute the accompanying **Worksheet** (8-12 questions)
- Students work individually or in pairs
- Monitor for:
  - Rushed answers without reasoning
  - Copy-paste behavior
  - Students skipping the "verification check" prompts
- Encourage written justifications for each answer

---

## 🧠 Cognitive Edge Insert (${cogEdge} min)
- **Confidence Check:** Before revealing answers, ask each student: "How sure are you? (1-5)" — track calibration
- **Reasoning Spotlight:** Pick 1 student answer and analyze reasoning quality as a class
- **Mental Model of the Day:** Discuss one mental model (e.g., "opportunity cost" or "second-order thinking")

---

## 🌍 Decision Lab Mini (${decisionLab} min)
**Scenario:** ${decisionScenario}

Ask students to:
1. Identify the tradeoff
2. Name one second-order consequence
3. Explain their final decision

---

## 🔄 Wrap-Up Reflection (${wrapup} min)
Ask students to write brief answers to:
1. "¿Qué aprendí hoy que no sabía antes?"
2. "¿En qué me equivoqué y por qué?"
3. "¿Qué haría diferente la próxima vez?"

---
*Generated by BrainBro Teacher Mode — ${date}*
`;
}

// ─── Worksheet ───

export function buildWorksheetMd(params: {
    areaId: string;
    tier: string;
    dateNow: number;
    includeAnswerKey: boolean;
}): string {
    const { areaId, tier, dateNow, includeAnswerKey } = params;
    const areaLabel = getAvailableAreas().find(a => a.id === areaId)?.label || areaId;
    const date = new Date(dateNow).toISOString().split('T')[0];
    const band = getActiveAgeBand();

    const questions = pickQuestions({ areaId, tier, count: 10, dateNow });

    let md = `# BrainBro Worksheet — ${areaLabel}
**Date:** ${date} | **Tier:** ${tier} | **Age Band:** ${band}
**Name:** ________________________  **Score:** ___ / ${questions.length}

---

`;

    let qNum = 1;
    const answerKey: string[] = [];

    questions.forEach(q => {
        if (q.type === 'verification') {
            md += `### ✅ Verification Check ${qNum}\n`;
            md += `${q.prompt}\n\n`;
            md += `**Your response:** _________________________________\n\n---\n\n`;
            answerKey.push(`${qNum}. (Open-ended verification — evaluate reasoning quality)`);
        } else if (q.type === 'ambiguity') {
            md += `### 🌀 Critical Thinking ${qNum}\n`;
            md += `${q.prompt}\n\n`;
            md += `**Your response:** _________________________________\n\n---\n\n`;
            answerKey.push(`${qNum}. (Open-ended ambiguity — evaluate depth of reasoning)`);
        } else if (q.type === 'math') {
            md += `### ${qNum}. 🔢 ${q.prompt}\n\n`;
            md += `**Answer:** _________________________________\n\n---\n\n`;
            answerKey.push(`${qNum}. ${q.answer || 'See solution steps'}`);
        } else {
            md += `### ${qNum}. ${q.prompt}\n`;
            if (q.choices && q.choices.length > 0) {
                q.choices.forEach((c, i) => {
                    md += `   ${String.fromCharCode(65 + i)}) ${c}\n`;
                });
            }
            md += `\n**Answer:** ___\n\n---\n\n`;
            answerKey.push(`${qNum}. ${q.answer || '—'}`);
        }
        qNum++;
    });

    if (includeAnswerKey) {
        md += `\n---\n\n## 🔑 Answer Key\n\n`;
        answerKey.forEach(a => {
            md += `${a}\n\n`;
        });
        md += `\n*Verification and Critical Thinking questions: evaluate reasoning quality (depth, evidence, assumptions checked)*\n`;
    }

    md += `\n---\n*Generated by BrainBro Teacher Mode — ${date}*\n`;
    return md;
}
