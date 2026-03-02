import { SessionData, CoachFeedback, WrongAnswer } from '../types';
import { GeneratedSessionRaw, SessionResponseSchema, CoachFeedbackSchema } from './schemas';
import { getProfile } from './storage';

export async function generateSession(params: {
    areaId: string;
    topic: string;
    difficulty: number;
    accent?: "en-GB" | "en-US";
    vocabList?: string[]; // weak vocab
}): Promise<SessionData> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing VITE_GEMINI_API_KEY environment variable.");
    }

    const { areaId, topic, difficulty, accent, vocabList } = params;
    const profile = getProfile();

    let baseInstructions = "";

    if (areaId === "english") {
        const regionalSpellingRules = accent === 'en-GB'
            ? "MUST use British English spelling (e.g., colour, organise, theatre, travelling)."
            : "MUST use American English spelling (e.g., color, organize, theater, traveling).";

        baseInstructions = `You generate English practice sessions for a 14-year-old language learner.
1. The text passage MUST be exactly 120-180 words.
2. Accent constraints: ${regionalSpellingRules}
3. Include 8 to 12 vocabulary words extracted from the text in "vocabLearned" with "meaning_es" and "example_en". If this list is provided: [${(vocabList || []).join(', ')}], try to reuse these.
4. For wrong answers in questions, provide a short explanation in Spanish ("explanation_es") and an optional English grammar correction ("correction_en").`;
    } else if (areaId === "math") {
        baseInstructions = `You generate Math problem sets for a 14-year-old student.
1. The "text" field should introduce a real-world scenario (in Spanish) relating to the Math topic.
2. For the 5 questions, the "q" is the math problem. The 4 "options" are possible numerical or algebraic answers.
3. Provide "steps_es", an array of strings outlining the step-by-step mathematical solution in Spanish.
4. "vocabLearned" field is NOT required. Omit it or send an empty array.
5. Provide "explanation_es" explaining the core concept briefly.`;
    } else if (areaId === "spanish") {
        baseInstructions = `You generate advanced Spanish reading comprehension for a bilingual 14-year-old student.
1. The text passage MUST be 120-180 words ENTIRELY in Spanish.
2. For the 5 questions, test reading comprehension, inferences, and vocabulary.
3. "vocabLearned" field is optional.
4. Provide "explanation_es" explaining why the answer is correct or incorrect.`;
    } else if (areaId === "thinking") {
        baseInstructions = `You generate Critical Thinking scenarios for a 14-year-old.
1. The "text" field should present a complex scenario, ethical dilemma, or logical puzzle (in Spanish).
2. The 5 questions should ask what biases might be present, what the logical outcome is, or how to resolve the scenario.
3. "vocabLearned" field is NOT required. Omit it or send an empty array.
4. Provide "explanation_es" detailing the logical reasoning.`;
    } else {
        baseInstructions = `You generate a practice session. The text is the context, the 5 questions test the context.`;
    }

    let profileContext = "";
    if (profile) {
        const goalBias = profile.goal === 'exam' ? 'Use formal, standardized-test style language.' :
            profile.goal === 'school' ? 'Align closely with standard middle/high school curriculum pacing.' :
                'Focus on practical, real-world utility and critical reasoning.';
        const toneBias = profile.coachStyle === 'strict' ? 'military-like strictness, precise and no-nonsense' :
            profile.coachStyle === 'competitive' ? 'highly competitive, comparing them to rivals, gamer-oriented' :
                'friendly, encouraging, and highly supportive';
        const intList = profile.interests.length > 0 ? profile.interests.join(", ") : "general fun topics";

        profileContext = `
USER PROFILE CONTEXT:
- Age: ${profile.age}
- Interests to frame the topic: ${intList}
- Learning Goal: ${goalBias}
- Coach Tone: Ensure "coachTip" is written with a ${toneBias} tone.
        `;
    } else {
        profileContext = "USER PROFILE CONTEXT: Default 14-year-old language learner.";
    }

    const prompt = `You are a strict JSON-only API. Ensure the tone is friendly but direct, like a "bro" coach, but appropriate for teens (no sensitive content).
    
${profileContext}

REQUIREMENTS:
1. Topic: ${topic ? topic : "A random interesting topic matching the user's interests."}
2. Difficulty Level: ${difficulty} out of 5. (1 is beginner, 5 is advanced).
${baseInstructions}
3. You must include 5 multiple-choice questions with exactly 4 options each. The "correct" option MUST exactly match one of the string elements in "options".
4. Provide a short coach tip ("coachTip") in Spanish (max 2 sentences) giving advice on this specific topic.

CRITICAL: Return ONLY valid JSON matching this exact schema structure. No markdown blocks, no other text.
{
  "topic": "string",
  "text": "string",
  "questions": [
    {
      "q": "string",
      "options": ["string", "string", "string", "string"],
      "correct": "string",
      "explanation_es": "string",
      "correction_en": "string",
      "steps_es": ["string", "string"]
    }
  ],
  "vocabLearned": [
    {
      "word": "string",
      "meaning_es": "string",
      "example_en": "string"
    }
  ],
  "coachTip": "string"
}
`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.5,
                    response_mime_type: "application/json"
                }
            })
        });

        if (!res.ok) {
            throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textOutput) {
            throw new Error("No text returned from Gemini API.");
        }

        let parsedJson = null;
        try {
            // In case it comes wrapped in markdown anyway (despite response_mime_type, defensive parsing)
            let cleanText = textOutput.trim();
            if (cleanText.startsWith('\`\`\`json')) {
                cleanText = cleanText.substring(7, cleanText.length - 3);
            } else if (cleanText.startsWith('\`\`\`')) {
                cleanText = cleanText.substring(3, cleanText.length - 3);
            }
            parsedJson = JSON.parse(cleanText);
        } catch (err) {
            console.error("Failed to parse JSON:", textOutput);
            throw new Error("The model did not return valid JSON.");
        }

        // Validate with Zod
        const validation = SessionResponseSchema.safeParse(parsedJson);
        if (!validation.success) {
            console.error("Schema validation failed:", validation.error);
            throw new Error("The generated session did not match the expected format.");
        }

        const validData: GeneratedSessionRaw = validation.data;

        // Construct final SessionData object
        const finalSession: SessionData = {
            id: `gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            areaId: areaId as any,
            source: "generated",
            accent: accent,
            difficulty: difficulty,
            topic: validData.topic,
            text: validData.text,
            questions: validData.questions,
            vocabLearned: validData.vocabLearned || [],
            coachTip: validData.coachTip
        };

        return finalSession;
    } catch (error) {
        console.error("Gemini generation error:", error);
        throw error; // Re-throw to be handled by UI
    }
}

export async function generateCoachFeedback(params: {
    areaId: string;
    wrongQuestions: WrongAnswer[];
}): Promise<CoachFeedback> {
    const { areaId, wrongQuestions } = params;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const profile = getProfile();

    // Deterministic Fallback if no API key
    if (!apiKey) {
        return {
            summary_es: `Fallaste ${wrongQuestions.length} preguntas. Tus puntos a atacar son vocabulario y comprensión.`,
            focus_tags: ["vocab", "comprension"],
            rule_es: "Revisa siempre el contexto antes de responder.",
            examples: [
                { en: "Read the full sentence.", es: "Lee la oración completa." },
                { en: "Look for keywords.", es: "Busca palabras clave." }
            ],
            drill: {
                type: "repeat",
                prompt_en: "I will read carefully.",
                prompt_es: "Repite esta oración:",
                answer: "I will read carefully."
            }
        };
    }

    const toneBias = profile?.coachStyle === 'strict' ? 'strict, direct, and no-nonsense' :
        profile?.coachStyle === 'competitive' ? 'highly competitive and challenging' :
            'friendly and highly supportive';

    const prompt = `You are a strict JSON-only API. You are a Coach (Sensei) for a 14-year-old student.
Tone: ${toneBias}
Language: Mostly Spanish, but examples and drills must involve English (if area is English).

Here is the data from the student's recent session mistakes in area: ${areaId}.
Wrong Questions:
${JSON.stringify(wrongQuestions, null, 2)}

Provide actionable feedback following this exact JSON schema:
- summary_es: 1-2 sentences summarizing what they got wrong.
- focus_tags: 1-2 short string tags representing the core issue (e.g., "past_tense", "vocab").
- rule_es: 1 short rule to fix the main issue.
- examples: Exactly 2 examples demonstrating the rule (en/es).
- drill: A micro-drill. Type depends on the area. For English, "repeat", "fix", "fill", or "choose". Provide the prompt, the expected correct answer, and formatting.

CRITICAL: Return ONLY valid JSON matching this schema. No markdown blocks.
{
  "summary_es": "string",
  "focus_tags": ["string"],
  "rule_es": "string",
  "examples": [ { "en": "string", "es": "string" }, { "en": "string", "es": "string" } ],
  "drill": {
    "type": "repeat" | "fix" | "fill" | "choose",
    "prompt_en": "string",
    "prompt_es": "string",
    "answer": "string",
    "choices": ["string", "string"] // optional, use if type is choose
  }
}`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.4,
                    response_mime_type: "application/json"
                }
            })
        });

        if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

        const data = await res.json();
        const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textOutput) throw new Error("No text returned from Gemini API.");

        let parsedJson = null;
        try {
            let cleanText = textOutput.trim();
            if (cleanText.startsWith('\`\`\`json')) cleanText = cleanText.substring(7, cleanText.length - 3);
            else if (cleanText.startsWith('\`\`\`')) cleanText = cleanText.substring(3, cleanText.length - 3);
            parsedJson = JSON.parse(cleanText);
        } catch (err) {
            throw new Error("The model did not return valid JSON.");
        }

        const validation = CoachFeedbackSchema.safeParse(parsedJson);
        if (!validation.success) {
            throw new Error("Coach feedback schema validation failed.");
        }

        return validation.data;
    } catch (error) {
        console.error("Coach generation error:", error);
        // Fallback on error
        return {
            summary_es: `Encontramos algunos errores en ${areaId}.`,
            focus_tags: ["repaso_general"],
            rule_es: "La práctica hace al maestro. Revisa tus errores e intenta de nuevo.",
            examples: [
                { en: "Practice makes perfect.", es: "La práctica hace al maestro." },
                { en: "Keep trying.", es: "Sigue intentando." }
            ],
            drill: {
                type: "fill",
                prompt_en: "Practice makes ______.",
                prompt_es: "Completa el espacio:",
                answer: "perfect"
            }
        };
    }
}

