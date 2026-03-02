import { z } from "zod";

export const QuestionSchema = z.object({
    q: z.string(),
    options: z.array(z.string()).length(4),
    correct: z.string(),
    explanation_es: z.string(),
    correction_en: z.string().optional(),
    steps_es: z.array(z.string()).optional()
});

export const VocabItemSchema = z.object({
    word: z.string(),
    meaning_es: z.string(),
    example_en: z.string()
});

export const SessionResponseSchema = z.object({
    topic: z.string(),
    text: z.string(), // Maps to passage, problem description, scenario, etc. (Can be 50-2000 chars)
    questions: z.array(QuestionSchema).length(5),
    vocabLearned: z.array(VocabItemSchema).optional(), // Not required for Math/Thinking
    coachTip: z.string()
});

export type GeneratedSessionRaw = z.infer<typeof SessionResponseSchema>;

export const CoachFeedbackSchema = z.object({
    summary_es: z.string(),
    focus_tags: z.array(z.string()),
    rule_es: z.string(),
    examples: z.array(z.object({
        en: z.string(),
        es: z.string()
    })).length(2),
    drill: z.object({
        type: z.enum(["repeat", "fix", "fill", "choose"]),
        prompt_en: z.string(),
        prompt_es: z.string(),
        answer: z.string(),
        choices: z.array(z.string()).optional()
    })
});
