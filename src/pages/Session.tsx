import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { sessions } from '../data/sessions';
import { saveResult, updateVocab, getRate, saveRate, getHistory, getAdaptiveProfile, updateAdaptiveProfile, getCustomSessions, getPronunciationData, savePronunciationData, getXp, saveXp, appendCognitiveSession, getCognitiveProfile, saveCognitiveProfile, appendPressureLog, getCognitiveSessions, appendDriftLog, appendDecisionLab, upsertVocabWords, getVocabProfile, appendActionStep } from '../lib/storage';
import { extractActionSteps, classifyActionStep } from '../lib/actionStepEngine';
import { getDateKey } from '../lib/programEngine';
import { SessionResult, WrongAnswer, VocabItem, MathStepQuestion, CognitiveAttempt, CognitiveErrorType } from '../types';
import { buildCognitiveSessionSummary, updateCognitiveProfile } from '../lib/cognitiveEngine';
import { hasCausalMarker, hasReflectionMarker, scoreReasoningWithAI, scoreAmbiguityWithAI, scoreWithHeuristics, SCORER_VERSION } from '../lib/qualityScorer';
import { createSnapshot } from '../lib/backup';
import { getAdaptiveModifiers, getSecondOrderPrompt, type PressureModifiers, type PressureLevel } from '../lib/cognitivePressureEngine';
import { analyzeDrift, type DriftAnalysis } from '../lib/cognitiveDriftEngine';
import { getNextRequiredModel, shouldForceModel, checkModelReference, updateModelRotation, MODEL_LABELS, type RotationModelId } from '../lib/mentalModelEngine';
import { scoreMetaCognition } from '../lib/metaCognitionEngine';
import { shouldEnableAdversarial, getAdversarialPrompt, scoreAdversarialResponse, type AdversarialPrompt as AdvPrompt } from '../lib/adversarialEngine';
import { shouldShowDecisionLab, getWeeklyDecisionLab, scoreDecisionLab, markDecisionLabCompleted, THEME_LABELS, type DecisionLabScenario } from '../lib/decisionLabEngine';
import { extractVocabTokens, countDueWords } from '../lib/vocabEngine';
import VocabDrill from '../components/VocabDrill';
import { getNextRecommendation } from '../lib/coachEngine';
import { checkMissionCompletion, getTodayMission } from '../lib/missionEngine';
import { PlayCircle, Square, ArrowRight, Activity, HelpCircle, Brain, Mic, AlertTriangle, Shield, BookOpen } from 'lucide-react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { childLS } from '../lib/childStorage';
import { PronunciationDrill } from '../components/PronunciationDrill';
import AmbiguityCase from '../components/AmbiguityCase';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

// Very basic fallback meaning dictionary just in case
const FALLBACK_DEFS: Record<string, string> = {
    "because": "porque",
    "although": "aunque",
    "therefore": "por lo tanto",
    "however": "sin embargo"
};

const getDeterministicCoach = (qText: string) => {
    const text = (qText || '').toLowerCase();
    if (text.includes("mean") || text.includes("vocab") || text.includes("significa") || text.includes("word") || text.includes("palabra")) {
        return {
            reason_es: "Revisa el contexto de la oración para deducir el significado.",
            rule_es: "El contexto nos da pistas sobre palabras desconocidas.",
            example_en: "Look at the words around it.",
            example_es: "Mira las palabras alrededor."
        };
    } else if (text.includes("imply") || text.includes("infer") || text.includes("infiere") || text.includes("why") || text.includes("por qué")) {
        return {
            reason_es: "La respuesta no está explícita, debes inferirla de las pistas.",
            rule_es: "Lee entre líneas combinando la información.",
            example_en: "Combine facts to find the hidden meaning.",
            example_es: "Combina los hechos para encontrar el significado oculto."
        };
    } else {
        return {
            reason_es: "Vuelve a revisar los detalles específicos del escenario.",
            rule_es: "La información clave suele estar mencionada directamente.",
            example_en: "Pay attention to names, dates, and direct facts.",
            example_es: "Presta atención a nombres, fechas y hechos directos."
        };
    }
};

export default function Session() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { area } = useOutletContext<{ area: any }>();
    const isEnglish = area.id === 'english';
    const accent = getAdaptiveProfile().preferredAccent;

    const sess = sessions.find(s => s.id === id) || getCustomSessions().find((s: any) => s.id === id);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [attemptsByQ, setAttemptsByQ] = useState<Record<number, number>>({});
    const [coachOpenForQ, setCoachOpenForQ] = useState<Record<number, boolean>>({});
    const [coachPayloadForQ, setCoachPayloadForQ] = useState<Record<number, any>>({});

    // Pronunciation Drill
    const [showDrillForQ, setShowDrillForQ] = useState<Record<number, boolean>>({});

    // Math Step Solvers
    const [mathStepsForQ, setMathStepsForQ] = useState<Record<number, string[]>>({});
    const [mathStepsAcceptedForQ, setMathStepsAcceptedForQ] = useState<Record<number, boolean[]>>({});
    const [mathFinalAnswerForQ, setMathFinalAnswerForQ] = useState<Record<number, string>>({});
    const [currentMathStepInput, setCurrentMathStepInput] = useState<Record<number, string>>({});
    const [showHintForQ, setShowHintForQ] = useState<Record<number, boolean>>({});
    const [showContextForQ, setShowContextForQ] = useState<Record<number, boolean>>(() => {
        const seen = childLS.getItem('brainbro_math_context_seen');
        const isToday = seen === new Date().toISOString().split('T')[0];
        if (!isToday) {
            childLS.setItem('brainbro_math_context_seen', new Date().toISOString().split('T')[0]);
        }
        return { 0: !isToday };
    });

    // ─── Phase 14: Cognitive Edge ───
    const [cogConfidence, setCogConfidence] = useState<Record<number, number>>({});
    const [cogPreReasoning, setCogPreReasoning] = useState<Record<number, string>>({});
    const [cogPostReflection, setCogPostReflection] = useState<Record<number, string>>({});
    const [cogErrorType, setCogErrorType] = useState<Record<number, CognitiveErrorType>>({});
    const [cogNextTime, setCogNextTime] = useState<Record<number, string>>({});
    const [cogPreLocked, setCogPreLocked] = useState<Record<number, boolean>>({});
    const [cogPostLocked, setCogPostLocked] = useState<Record<number, boolean>>({});

    // Phase 14.1: Ambiguity + Quality
    const [ambiguitySubmitted, setAmbiguitySubmitted] = useState(false);
    const [ambiguityAnswer, setAmbiguityAnswer] = useState('');
    const [ambiguityPromptId, setAmbiguityPromptId] = useState('');
    const [ambiguityScore, setAmbiguityScore] = useState<number | undefined>(undefined);

    // Phase 14.3: Adaptive Pressure (+ Phase 14.4 drift auto-bump)
    const [pressure] = useState<PressureModifiers>(() => {
        const profile = getCognitiveProfile();
        const base = getAdaptiveModifiers(profile);
        const sessions14 = getCognitiveSessions().slice(0, 10);
        const drift = analyzeDrift(sessions14, profile);
        appendDriftLog(drift);
        // Auto-bump pressure if regression detected
        if (drift.regressionDetected && base.level !== 'elite') {
            const bumpMap: Record<PressureLevel, PressureLevel> = { low: 'normal', normal: 'high', high: 'elite', elite: 'elite' };
            const bumped = bumpMap[base.level];
            return { ...getAdaptiveModifiers({ ...profile!, calibration: 0, overconfidence: 1, reflection: 0, sessionsCount: 1, lastUpdatedISO: '', reasoningQualityEwma: 0, ambiguityEwma: 0 }), level: bumped, increaseAmbiguityFrequency: base.increaseAmbiguityFrequency || drift.plateauDetected };
        }
        if (drift.plateauDetected) {
            return { ...base, increaseAmbiguityFrequency: true };
        }
        return base;
    });
    const [driftAnalysis] = useState<DriftAnalysis>(() => {
        const profile = getCognitiveProfile();
        return analyzeDrift(getCognitiveSessions().slice(0, 10), profile);
    });
    const [secondOrderAnswers, setSecondOrderAnswers] = useState<Record<number, string>>({});

    // Phase 14.5: Mental Model Rotation
    const [requiredModel] = useState<RotationModelId>(() => getNextRequiredModel(getCognitiveProfile()));
    const [modelForced] = useState(() => shouldForceModel(getCognitiveProfile()));

    // Phase 14.7: Adversarial Mode
    const [adversarialEnabled] = useState(() => {
        const p = getCognitiveProfile();
        const d = driftAnalysis;
        return shouldEnableAdversarial(p, d);
    });
    const [adversarialPrompt] = useState<AdvPrompt | null>(() => {
        const p = getCognitiveProfile();
        const d = driftAnalysis;
        if (!shouldEnableAdversarial(p, d)) return null;
        return getAdversarialPrompt(area?.id || 'general');
    });
    const [adversarialAnswer, setAdversarialAnswer] = useState('');
    const [adversarialSubmitted, setAdversarialSubmitted] = useState(false);

    // Phase 14.8: Decision Lab
    const [dlShow] = useState(() => shouldShowDecisionLab(Date.now()));
    const [dlScenario] = useState<DecisionLabScenario | null>(() => dlShow ? getWeeklyDecisionLab(Date.now()) : null);
    const [dlAnswers, setDlAnswers] = useState<Record<string, string>>({});
    const [dlSubmitted, setDlSubmitted] = useState(false);
    const [dlSkipped, setDlSkipped] = useState(false);
    const [dlResult, setDlResult] = useState<{ score: number; notes: string } | null>(null);

    // Phase 14.9: Vocab Drill
    const [vocabDrillDue] = useState(() => countDueWords(getVocabProfile(), Date.now()) >= 8);
    const [vocabDrillDone, setVocabDrillDone] = useState(false);
    const [vocabDrillSkipped, setVocabDrillSkipped] = useState(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [rate, setRate] = useState<number>(getRate());
    const [submitError, setSubmitError] = useState('');
    const [errorStack, setErrorStack] = useState('');
    const [showHelp, setShowHelp] = useState(true);

    const todayMission = getTodayMission();

    useEffect(() => {
        return () => { window.speechSynthesis.cancel(); };
    }, []);

    if (!sess) return <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--danger)' }}>ERROR: SIMULATION BUNDLE NOT FOUND.</div>;

    const handleOptionClick = (idx: number, opt: string, correct: string, qText: string) => {
        if (attemptsByQ[idx] >= 2) return;
        if (answers[idx] === correct) return; // already correct

        // If they already have an answer selected and coach is open, force them to use Try Again
        if (answers[idx] && coachOpenForQ[idx] && answers[idx] !== correct) return;

        setAnswers(prev => ({ ...prev, [idx]: opt }));

        if (opt === correct) {
            setCoachOpenForQ(prev => ({ ...prev, [idx]: false }));
        } else {
            const newAtt = (attemptsByQ[idx] || 0) + 1;
            setAttemptsByQ(prev => ({ ...prev, [idx]: newAtt }));
            const payload = getDeterministicCoach(qText);

            if (newAtt >= 2) {
                setCoachPayloadForQ(prev => ({ ...prev, [idx]: { ...payload, correctText: correct } }));
                setCoachOpenForQ(prev => ({ ...prev, [idx]: true }));
            } else {
                setCoachPayloadForQ(prev => ({ ...prev, [idx]: payload }));
                setCoachOpenForQ(prev => ({ ...prev, [idx]: true }));
            }
        }
    };

    const handleTryAgain = (idx: number) => {
        setAnswers(prev => { const next = { ...prev }; delete next[idx]; return next; });
        setCoachPayloadForQ(prev => ({
            ...prev,
            [idx]: { ...prev[idx], reason_es: "Intenta otra vez. Busca la pista en el texto." }
        }));
    };

    const handleCheckMathStep = (idx: number, q: MathStepQuestion) => {
        const step = currentMathStepInput[idx] || "";
        if (!step.trim()) return;

        let accepted = false;
        const lower = step.toLowerCase();

        if (q.tags.includes("algebra") && step.includes("=")) {
            if (step.includes("+") || step.includes("-") || step.includes("/") || lower.includes("x =")) {
                accepted = true;
            }
        } else if (q.tags.includes("fractions")) {
            accepted = true;
        } else if (q.tags.includes("word_problem")) {
            accepted = true;
        } else {
            accepted = true;
        }

        setMathStepsForQ(prev => ({ ...prev, [idx]: [...(prev[idx] || []), step] }));
        setMathStepsAcceptedForQ(prev => ({ ...prev, [idx]: [...(prev[idx] || []), accepted] }));
        setCurrentMathStepInput(prev => ({ ...prev, [idx]: "" }));
    };

    const handleDrillComplete = (_idx: number, score: number, transcript: string, sentence: string) => {
        // This line was removed as `setDrillCompletedForQ` was not declared and likely a typo.
        // If a state for drill completion is needed, it should be explicitly declared.

        // Save Pronunciation Data
        const pronData = getPronunciationData();
        pronData.attempts.push({
            id: Date.now().toString(),
            createdAtISO: new Date().toISOString(),
            areaId: "english",
            sessionId: id || 'unknown',
            sentence: sentence,
            transcript: transcript,
            score: score,
            missing: [], // Simplified for now since drill handles internals
            extra: []
        });

        const best = pronData.bestScoreBySentence[sentence] || 0;
        if (score > best) {
            pronData.bestScoreBySentence[sentence] = score;
        }
        savePronunciationData(pronData);

        // Award XP logic
        if (score >= 85) {
            const xpData = getXp();
            const reward = (best === 0) ? 10 : ((score > best) ? 5 : 0);
            if (reward > 0) {
                xpData.total += reward;
                xpData.byArea['english'] = (xpData.byArea['english'] || 0) + reward;
                saveXp(xpData);
            }
        }
    };

    const allAnswered = Object.keys(answers).length === sess.questions.length;
    const hasActiveUnresolvedCoach = sess.questions.some((qAny, idx) => {
        if (qAny.type === 'math_steps') return false;
        return coachOpenForQ[idx] && attemptsByQ[idx] < 2 && answers[idx] !== (qAny as any).correct;
    });

    // Check cognitive pre-reasoning locked for all Qs
    const allCogPreLocked = sess.questions.every((_q, idx) => cogPreLocked[idx]);
    // Check post-reflection done for wrong+locked Qs
    const allCogPostDone = sess.questions.every((_q, idx) => {
        if (!answers[idx]) return true;
        const isMathQ = _q.type === 'math_steps';
        const isCorrect = isMathQ ? answers[idx] === 'CORRECT' : answers[idx] === (_q as any).correct;
        if (isCorrect && !pressure.forceReflectionOnCorrect) return true;
        return cogPostLocked[idx];
    });
    const canSubmit = allAnswered && !hasActiveUnresolvedCoach && allCogPreLocked && allCogPostDone && ambiguitySubmitted;

    const handleRateChange = (r: number) => {
        setRate(r);
        saveRate(r);
    };

    const handlePlayToggle = () => {
        const synth = window.speechSynthesis;
        if (isPlaying) {
            synth.cancel();
            setIsPlaying(false);
            return;
        }

        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(sess.text);
        const voices = synth.getVoices();
        const voice = voices.find(v => v.lang === accent) || voices.find(v => v.lang.includes('en'));
        if (voice) utterance.voice = voice;
        utterance.rate = rate;

        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);

        synth.speak(utterance);
    };

    const extractVocab = (): VocabItem[] => {
        if (sess.vocabLearned && sess.vocabLearned.length > 0) {
            return sess.vocabLearned;
        }

        // Fallback exactly as spec'd: unique longer words from text
        const words = sess.text.replace(/[^\w\s]/g, '').split(/\s+/);
        const uniqueLong = Array.from(new Set(words.filter(w => w.length > 6))).slice(0, 10);

        return uniqueLong.map(word => ({
            word,
            meaning_es: FALLBACK_DEFS[word.toLowerCase()] || '(pendiente)',
            example_en: `Context: ...${word}...`
        }));
    };

    const handleSubmit = () => {
        try {
            setSubmitError('');
            window.speechSynthesis.cancel();

            if (!allAnswered) {
                setSubmitError('Please answer all operational queries before submitting.');
                return;
            }

            let score = 0;
            const wrongQs: WrongAnswer[] = [];

            const mathStepsTakenFinal: string[] = [];
            const mathStepsAcceptedFinal: boolean[] = [];
            let mathFinalAnswerUserRecord = "";

            sess.questions.forEach((qAny, idx) => {
                const chosen = answers[idx];

                if (qAny.type === 'math_steps') {
                    const qMath = qAny as MathStepQuestion;
                    const finalAns = mathFinalAnswerForQ[idx] || "";
                    const isCorrect = finalAns.replace(/\s/g, '').toLowerCase() === qMath.expectedAnswer.replace(/\s/g, '').toLowerCase();

                    const acceptedSteps = (mathStepsAcceptedForQ[idx] || []).filter(a => a).length;
                    const stepScore = Math.min(acceptedSteps, 5); // max 5 steps

                    let mathQScore = (isCorrect ? 60 : 0) + (stepScore * 8);
                    if (mathQScore > 100) mathQScore = 100;

                    score += (mathQScore / 100);

                    if (mathStepsForQ[idx]) mathStepsTakenFinal.push(...mathStepsForQ[idx]);
                    if (mathStepsAcceptedForQ[idx]) mathStepsAcceptedFinal.push(...mathStepsAcceptedForQ[idx]);
                    mathFinalAnswerUserRecord = finalAns;

                    if (mathQScore < 100) {
                        wrongQs.push({
                            questionId: idx,
                            questionText: qMath.problem,
                            q: qMath.problem,
                            chosen: finalAns || 'No answer',
                            correct: qMath.expectedAnswer,
                            explanation_es: "Revisa los pasos para llegar a la respuesta. " + (qMath.stepHints_es?.join(" ") || "")
                        });
                    }
                } else {
                    const q = qAny as any;
                    if (chosen === q.correct) {
                        score++;
                    } else {
                        wrongQs.push({
                            questionId: idx,
                            questionText: q.q,
                            q: q.q,
                            chosen: chosen || 'No answer',
                            correct: q.correct,
                            explanation_es: q.explanation_es,
                            correction_en: q.correction_en || q.correct
                        });
                    }
                }
            });

            const vocabToLearn = extractVocab();

            const result: SessionResult = {
                id: `res-${Date.now()}`,
                date: new Date().toLocaleDateString(),
                accent,
                areaId: sess.areaId as any,
                difficulty: sess.difficulty,
                topic: sess.topic,
                score,
                total: sess.questions.length,
                wrongQuestions: wrongQs,
                vocabLearned: vocabToLearn,
                mathStepsTaken: mathStepsTakenFinal,
                mathStepsAccepted: mathStepsAcceptedFinal,
                mathFinalAnswerUser: mathFinalAnswerUserRecord
            };

            if (area.id === 'math') {
                const mathMasteryRaw = childLS.getItem('brainbro_math_mastery_v1');
                const mathMastery = mathMasteryRaw ? JSON.parse(mathMasteryRaw) : { byTag: {} as Record<string, { attempts: number; wins: number; lastISO: string }> };

                sess.questions.forEach((qAny, idx) => {
                    const ans = answers[idx];
                    const isCorrect = ans === "CORRECT";
                    const qMath = qAny as MathStepQuestion;
                    if (qMath.tags) {
                        qMath.tags.forEach(t => {
                            if (!mathMastery.byTag[t]) mathMastery.byTag[t] = { attempts: 0, wins: 0, lastISO: "" };
                            mathMastery.byTag[t].attempts += 1;
                            if (isCorrect) mathMastery.byTag[t].wins += 1;
                            mathMastery.byTag[t].lastISO = new Date().toISOString();
                        });
                    }
                });
                childLS.setItem('brainbro_math_mastery_v1', JSON.stringify(mathMastery));
            }

            // ─── Phase 14.1: Cognitive Edge + Quality + Consequences ───
            try {
                // Score reasoning quality for each attempt (sync heuristic; AI fires async)
                const cogAttempts: CognitiveAttempt[] = sess.questions.map((qAny, idx) => {
                    const isMathQ = qAny.type === 'math_steps';
                    const isCorrect = isMathQ ? answers[idx] === 'CORRECT' : answers[idx] === (qAny as any).correct;
                    const preText = cogPreReasoning[idx] || '';
                    const rqSync = scoreWithHeuristics(preText);
                    return {
                        questionIdx: idx,
                        confidence: cogConfidence[idx] ?? 50,
                        preReasoning: preText,
                        isCorrect,
                        postReflection: cogPostReflection[idx] || '',
                        errorType: cogErrorType[idx] || 'unknown',
                        nextTimeStrategy: cogNextTime[idx] || '',
                        reasoningQuality: rqSync.score,
                        scoringMode: rqSync.mode,
                        scoringNotes: rqSync.notes,
                        scorerVersion: SCORER_VERSION,
                        mentalModel: requiredModel,
                        metaCognitionScore: scoreMetaCognition((preText + ' ' + (cogPostReflection[idx] || '')).trim()),
                    };
                });

                // Phase 14.5: Penalize if model was forced but not referenced
                if (modelForced) {
                    cogAttempts.forEach(a => {
                        if (a.questionIdx >= 0 && a.reasoningQuality !== undefined) {
                            if (!checkModelReference(a.preReasoning, requiredModel)) {
                                a.reasoningQuality = Math.max(0, a.reasoningQuality - 1) as 0 | 1 | 2 | 3 | 4 | 5;
                            }
                        }
                    });
                }

                // Phase 14.7: Add adversarial attempt
                if (adversarialEnabled && adversarialPrompt && adversarialSubmitted && adversarialAnswer.trim().length > 0) {
                    const advResult = scoreAdversarialResponse(adversarialAnswer, adversarialPrompt.type);
                    cogAttempts.push({
                        questionIdx: -2,
                        confidence: 50,
                        preReasoning: adversarialAnswer,
                        isCorrect: advResult.pass,
                        postReflection: '',
                        errorType: 'unknown',
                        nextTimeStrategy: '',
                        adversarialId: adversarialPrompt.id,
                        adversarialType: adversarialPrompt.type,
                        adversarialPass: advResult.pass,
                        adversarialNotes: advResult.notes,
                    });
                }

                // Add ambiguity case as special attempt
                if (ambiguitySubmitted && ambiguityAnswer) {
                    const ambigSync = scoreWithHeuristics(ambiguityAnswer);
                    cogAttempts.push({
                        questionIdx: -1,
                        confidence: 50,
                        preReasoning: ambiguityAnswer,
                        isCorrect: true,
                        postReflection: ambiguityAnswer,
                        errorType: 'unknown',
                        nextTimeStrategy: '',
                        reasoningQuality: ambiguityScore !== undefined ? ambiguityScore as any : ambigSync.score,
                        ambiguityScore: ambiguityScore !== undefined ? ambiguityScore as any : ambigSync.score,
                        ambiguityCase: true,
                    });
                }

                // XP consequences: overconfidence penalty, low-conf bonus
                let xpModifier = 0;
                const allDefault = sess.questions.every((_q, idx) => (cogConfidence[idx] ?? 50) === 50);
                sess.questions.forEach((qAny, idx) => {
                    const isMathQ = qAny.type === 'math_steps';
                    const isCorrect = isMathQ ? answers[idx] === 'CORRECT' : answers[idx] === (qAny as any).correct;
                    const conf = cogConfidence[idx] ?? 50;
                    if (conf >= 80 && !isCorrect) xpModifier -= 3;
                    if (conf <= 40 && isCorrect) xpModifier += 1;
                });

                // Phase 14.7: adversarial XP modifier
                if (adversarialEnabled && adversarialPrompt && adversarialSubmitted && adversarialAnswer.trim().length > 0) {
                    const advRes = scoreAdversarialResponse(adversarialAnswer, adversarialPrompt.type);
                    if (!advRes.pass && (getCognitiveProfile()?.overconfidence ?? 0) > 0.2) xpModifier -= 2;
                    if (advRes.pass) xpModifier += 1;
                }

                const cogSummary = buildCognitiveSessionSummary(
                    sess.id,
                    area.id,
                    new Date().toISOString(),
                    cogAttempts
                );
                appendCognitiveSession(cogSummary);
                const prevProfile = getCognitiveProfile();
                const profileAfterCog = updateCognitiveProfile(prevProfile, cogSummary);
                const newProfile = updateModelRotation(profileAfterCog, requiredModel);
                saveCognitiveProfile(newProfile);

                // XP: reflection bonus + consequence modifier + pressure multiplier
                const xpD = getXp();
                let xpGain = 0;
                if (cogSummary.reflectionRate >= 0.7 && !allDefault) xpGain += 5;
                xpGain += xpModifier;
                xpGain = Math.round(xpGain * pressure.xpMultiplier);
                if (xpGain !== 0) {
                    xpD.total = Math.max(0, xpD.total + xpGain);
                    xpD.byArea[area.id] = Math.max(0, (xpD.byArea[area.id] || 0) + xpGain);
                    saveXp(xpD);
                }

                // Log pressure level
                appendPressureLog(pressure.level);

                // Phase 14.8: Decision Lab XP
                if (dlSubmitted && dlResult && dlResult.score >= 3) {
                    const xpDLab = getXp();
                    xpDLab.total += 3;
                    xpDLab.byArea[area.id] = (xpDLab.byArea[area.id] || 0) + 3;
                    saveXp(xpDLab);
                }

                // Phase 14.9: Extract vocab from session
                try {
                    const lang: 'en' | 'es' = area.id === 'english' ? 'en' : area.id === 'spanish' ? 'es' : 'en';
                    const vocabWords: Array<{ word: string; lang: 'en' | 'es'; wasWrong: boolean; example?: string }> = [];
                    sess.questions.forEach((qAny, idx) => {
                        const qBase = qAny as any;
                        const questionText = qBase.q || qBase.prompt_es || '';
                        const correctAns = qBase.correct || '';
                        const userAns = answers[idx] || '';
                        const isCorrect = qAny.type === 'math_steps' ? userAns === 'CORRECT' : userAns === correctAns;
                        const tokens = extractVocabTokens(questionText + ' ' + correctAns, lang);
                        tokens.forEach(t => vocabWords.push({ word: t, lang, wasWrong: false, example: questionText.slice(0, 80) }));
                        if (!isCorrect && userAns) {
                            const wrongTokens = extractVocabTokens(userAns, lang);
                            wrongTokens.forEach(t => vocabWords.push({ word: t, lang, wasWrong: true }));
                        }
                    });
                    if (vocabWords.length > 0) upsertVocabWords(vocabWords);
                } catch { /* silent */ }

                // Fire async AI scoring (best-effort, updates localStorage silently)
                (async () => {
                    try {
                        for (let i = 0; i < sess.questions.length; i++) {
                            const preText = cogPreReasoning[i] || '';
                            if (preText.length >= 15) {
                                const aiResult = await scoreReasoningWithAI(preText, { areaId: area.id, question: (sess.questions[i] as any).q || '' });
                                cogAttempts[i].reasoningQuality = aiResult.score;
                                cogAttempts[i].scoringMode = aiResult.mode;
                                cogAttempts[i].scoringNotes = aiResult.notes;
                            }
                        }
                        if (ambiguitySubmitted && ambiguityAnswer) {
                            const aiAmbig = await scoreAmbiguityWithAI(ambiguityAnswer, ambiguityPromptId);
                            const ambigIdx = cogAttempts.findIndex(a => a.ambiguityCase);
                            if (ambigIdx >= 0) {
                                cogAttempts[ambigIdx].ambiguityScore = aiAmbig.score;
                                cogAttempts[ambigIdx].reasoningQuality = aiAmbig.score;
                                cogAttempts[ambigIdx].scoringMode = aiAmbig.mode;
                                cogAttempts[ambigIdx].scoringNotes = aiAmbig.notes;
                            }
                        }
                        // Re-save with AI scores
                        const updatedSummary = buildCognitiveSessionSummary(sess.id, area.id, new Date().toISOString(), cogAttempts);
                        appendCognitiveSession(updatedSummary);
                        const p2 = getCognitiveProfile();
                        saveCognitiveProfile(updateCognitiveProfile(p2, updatedSummary));
                    } catch { /* silent */ }
                })();

                // Phase 15.7: Extract Action Steps from nextTimeStrategy
                try {
                    const tomorrowKey = getDateKey(Date.now() + 86400000);
                    cogAttempts.forEach(a => {
                        if (a.nextTimeStrategy && a.nextTimeStrategy.trim().length > 5) {
                            const extracted = extractActionSteps(a.nextTimeStrategy);
                            extracted.forEach(text => {
                                appendActionStep({
                                    id: `as-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                    createdAt: Date.now(),
                                    source: 'post_reflection',
                                    text,
                                    tag: classifyActionStep(text),
                                    status: 'open',
                                    dueDateKey: tomorrowKey,
                                });
                            });
                        }
                    });
                } catch { /* silent */ }

                // Auto-snapshot on submit
                try { createSnapshot(); } catch { /* silent */ }
            } catch (cogErr) {
                console.warn('COGNITIVE SAVE FAILED', cogErr);
            }

            let missionLogic = { missionCompleted: false, xpEarned: 0, newBadges: [] as string[] };
            try {
                missionLogic = checkMissionCompletion(result);
            } catch (e: any) {
                console.warn("MISSION AWARD FAILED", e);
            }

            saveResult(result);
            if (isEnglish) {
                try {
                    updateVocab(vocabToLearn);
                } catch (e: any) {
                    console.warn("VOCAB EXTRACT FAILED", e);
                }
            }

            // --- Adaptive Coach Logic ---
            const history = getHistory();
            const adaptive = getAdaptiveProfile();
            // Recalculate weak vocab dynamically
            const currentVocab = childLS.getItem('brainbro_vocab');
            let weakVocabCount = 0;
            if (currentVocab) {
                try {
                    const parsed = JSON.parse(currentVocab);
                    weakVocabCount = Object.values(parsed).filter((v: any) => (v.mistakesCount || 0) >= 2).length;
                } catch { }
            }

            const recommendation = getNextRecommendation({
                score,
                total: sess.questions.length,
                weakVocabCount,
                currentDifficulty: adaptive.currentDifficulty,
                currentAccent: adaptive.preferredAccent,
                historyCount: history.length,
                lastSessions: history.slice(0, 2).map(h => ({
                    id: h.id.split('-')[0], // we appended -timestamp to id, so split it, or just use it as is if it matches
                    accent: h.accent as 'en-GB' | 'en-US',
                    score: h.score,
                    total: h.total
                }))
            });

            const updatedProfile = {
                ...adaptive,
                currentDifficulty: recommendation.recommendedDifficulty,
                preferredAccent: recommendation.recommendedAccent,
                lastRecommendations: [
                    {
                        date: new Date().toISOString(),
                        sessionId: recommendation.recommendedSessionId,
                        difficulty: recommendation.recommendedDifficulty,
                        accent: recommendation.recommendedAccent,
                        score,
                        message: recommendation.message_es
                    },
                    ...(adaptive.lastRecommendations || [])
                ].slice(0, 5) // Keep last 5
            };
            updateAdaptiveProfile(updatedProfile);

            if (import.meta.env.DEV) {
                console.log("SUBMIT OK", { resultId: result.id, score, xpAwarded: missionLogic.xpEarned, missionCompleted: missionLogic.missionCompleted });
            }

            navigate(`/area/${area.id}/review/${result.id}`, {
                state: {
                    missionCompleted: missionLogic.missionCompleted,
                    xpEarned: missionLogic.xpEarned,
                    newBadges: missionLogic.newBadges
                }
            });
        } catch (err: any) {
            console.error("SUBMIT FAILED", err);
            setSubmitError(
                typeof err === "object" && err && "message" in err
                    ? `Submit failed: ${err.message}`
                    : "Submit failed: unknown error"
            );
            if (import.meta.env.DEV && err.stack) {
                setErrorStack(err.stack);
            }
        }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ maxWidth: 800, margin: '0 auto' }}>
            <motion.div variants={itemVariants}>
                <motion.button
                    onClick={() => { window.speechSynthesis.cancel(); navigate(`/area/${area.id}/practice`); }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                    className="btn neon-border"
                    style={{ width: 'auto', marginBottom: 24, padding: '8px 16px', fontSize: '0.95rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}
                >
                    ABORT SIMULATION
                </motion.button>
            </motion.div>

            <motion.div variants={itemVariants} className="card glass-panel" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 300, height: 200, background: 'var(--accent-primary)', filter: 'blur(80px)', opacity: 0.2, pointerEvents: 'none' }} />

                <div className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', border: '1px solid var(--border)', marginBottom: 16 }}>
                    CLASS {sess.difficulty}
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-main)' }}>{sess.topic}</h2>

                {/* Inline Help Card */}
                <div style={{ marginBottom: 24, borderRadius: 12, border: '1px solid var(--accent-primary)', overflow: 'hidden' }}>
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        style={{ width: '100%', background: 'rgba(139, 92, 246, 0.1)', border: 'none', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--accent-primary)', fontWeight: 800, cursor: 'pointer' }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><HelpCircle size={20} /> WHAT TO DO (30 SECONDS)</span>
                        <span>{showHelp ? '▲' : '▼'}</span>
                    </button>
                    <AnimatePresence>
                        {showHelp && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ background: 'rgba(0,0,0,0.3)' }}>
                                <div style={{ padding: 24 }}>
                                    <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-main)', lineHeight: 1.8, fontSize: '1.05rem' }}>
                                        {isEnglish ? (
                                            <li>Press <strong>INITIATE TRANSMISSION</strong> to hear the audio log.</li>
                                        ) : (
                                            <li>Read the <strong>SCENARIO DATA</strong> carefully.</li>
                                        )}
                                        <li>Answer the <strong style={{ color: 'var(--warning)' }}>5</strong> queries below.</li>
                                        <li>Click <strong>Submit Answers</strong> at the bottom.</li>
                                    </ol>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {!isEnglish && (
                    <div style={{ background: 'rgba(0,0,0,0.5)', padding: 24, borderRadius: 12, marginBottom: 24, textAlign: 'left', border: '1px solid var(--border)', fontSize: '1.15rem', lineHeight: 1.8, color: 'var(--text-main)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
                        {sess.text}
                    </div>
                )}

                {isEnglish && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '12px 24px', borderRadius: 24, border: '1px solid var(--border)' }}>
                            <Activity size={18} color="var(--accent-primary)" />
                            <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '1px' }}>FEED RATE</span>
                            {[0.9, 1.0, 1.1].map(r => (
                                <motion.button
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                    key={r}
                                    onClick={() => handleRateChange(r)}
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: 16,
                                        background: rate === r ? 'var(--accent-primary)' : 'transparent',
                                        color: rate === r ? '#fff' : 'var(--text-main)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 800,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {r}x
                                </motion.button>
                            ))}
                        </div>

                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className={`btn neon-border`} onClick={handlePlayToggle} style={{
                            width: 'auto',
                            padding: '16px 48px',
                            fontSize: '1.2rem',
                            background: isPlaying ? 'rgba(244, 63, 94, 0.2)' : 'var(--accent-primary)',
                            color: isPlaying ? 'var(--danger)' : '#fff',
                            borderColor: isPlaying ? 'var(--danger)' : 'transparent',
                            boxShadow: isPlaying ? '0 0 20px rgba(244, 63, 94, 0.4)' : '0 0 20px var(--accent-glow)'
                        }}>
                            {isPlaying ? <><Square size={20} /> ABORT FEED</> : <><PlayCircle size={20} /> INITIATE TRANSMISSION</>}
                        </motion.button>
                    </div>
                )}
            </motion.div>

            {/* Phase 14.4: Drift Warning */}
            {driftAnalysis.gamingDetected && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '12px 20px', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.4)', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertTriangle size={18} color="var(--danger)" />
                    <span style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 700 }}>Sistema detectó razonamiento de bajo esfuerzo. Se requiere calidad.</span>
                </motion.div>
            )}
            {driftAnalysis.regressionDetected && !driftAnalysis.gamingDetected && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '12px 20px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertTriangle size={18} color="var(--warning)" />
                    <span style={{ color: 'var(--warning)', fontSize: '0.9rem', fontWeight: 700 }}>Regresión detectada — presión incrementada automáticamente.</span>
                </motion.div>
            )}

            {/* Phase 14.9: Vocab Drill */}
            {vocabDrillDue && !vocabDrillDone && !vocabDrillSkipped && (
                <div>
                    <VocabDrill areaId={area?.id || 'english'} onComplete={() => setVocabDrillDone(true)} />
                    <div style={{ textAlign: 'right', marginBottom: 12 }}>
                        <button onClick={() => setVocabDrillSkipped(true)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}>Saltar Vocab Drill</button>
                    </div>
                </div>
            )}

            {/* Phase 14.8: Decision Lab Card */}
            {dlShow && dlScenario && !dlSubmitted && !dlSkipped && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <BookOpen size={18} color="rgb(34,197,94)" />
                        <span style={{ color: 'rgb(34,197,94)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Decision Lab — {THEME_LABELS[dlScenario.theme]}</span>
                    </div>
                    <p style={{ color: 'var(--text-main)', fontSize: '1rem', marginBottom: 14, lineHeight: 1.5 }}>{dlScenario.scenario}</p>
                    {dlScenario.questions.map((q, qi) => (
                        <div key={qi} style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>{qi + 1}. {q}</label>
                            <textarea
                                value={dlAnswers[`q${qi}`] || ''}
                                onChange={e => setDlAnswers(prev => ({ ...prev, [`q${qi}`]: e.target.value }))}
                                placeholder="Mín. 25 caracteres..."
                                rows={2}
                                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)', padding: 10, resize: 'vertical', fontSize: '0.9rem' }}
                            />
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <button onClick={() => setDlSkipped(true)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}>Saltar una vez</button>
                        <button
                            onClick={() => {
                                const allFilled = dlScenario.questions.every((_, qi) => (dlAnswers[`q${qi}`] || '').trim().length >= 25);
                                if (!allFilled) return;
                                const result = scoreDecisionLab(dlAnswers);
                                setDlResult(result);
                                setDlSubmitted(true);
                                markDecisionLabCompleted(Date.now());
                                const attempt = { id: dlScenario.id + '-' + Date.now(), theme: dlScenario.theme, completedAt: new Date().toISOString(), score: result.score, notes: result.notes, answers: dlAnswers };
                                appendDecisionLab(attempt);
                                // Update cognitive profile
                                const cp = getCognitiveProfile();
                                if (cp) {
                                    cp.decisionLabsCompleted = (cp.decisionLabsCompleted ?? 0) + 1;
                                    cp.decisionLabEwma = parseFloat((0.25 * result.score + 0.75 * (cp.decisionLabEwma ?? 0)).toFixed(2));
                                    cp.lastDecisionLabAt = Date.now();
                                    saveCognitiveProfile(cp);
                                }
                            }}
                            disabled={!dlScenario.questions.every((_, qi) => (dlAnswers[`q${qi}`] || '').trim().length >= 25)}
                            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: dlScenario.questions.every((_, qi) => (dlAnswers[`q${qi}`] || '').trim().length >= 25) ? 'rgb(34,197,94)' : 'rgba(34,197,94,0.3)', color: '#fff', fontWeight: 700, cursor: dlScenario.questions.every((_, qi) => (dlAnswers[`q${qi}`] || '').trim().length >= 25) ? 'pointer' : 'not-allowed', fontSize: '0.9rem' }}
                        >Enviar Lab</button>
                    </div>
                </motion.div>
            )}
            {dlSubmitted && dlResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '10px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BookOpen size={16} color="rgb(34,197,94)" />
                    <span style={{ color: 'rgb(34,197,94)', fontSize: '0.85rem', fontWeight: 700 }}>Decision Lab completado — Score: {dlResult.score}/5 {dlResult.score >= 3 ? '(+3 XP)' : ''}</span>
                </motion.div>
            )}

            {/* Phase 14.7: Adversarial Card */}
            {adversarialEnabled && adversarialPrompt && !adversarialSubmitted && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <Shield size={18} color="rgb(168,85,247)" />
                        <span style={{ color: 'rgb(168,85,247)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Desafío Cognitivo</span>
                    </div>
                    <p style={{ color: 'var(--text-main)', fontSize: '1rem', marginBottom: 14, lineHeight: 1.5 }}>{adversarialPrompt.prompt}</p>
                    <textarea
                        value={adversarialAnswer}
                        onChange={e => setAdversarialAnswer(e.target.value)}
                        placeholder="Escribe tu respuesta (mín. 25 caracteres)..."
                        rows={3}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)', padding: 12, resize: 'vertical', fontSize: '0.95rem' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <span style={{ fontSize: '0.8rem', color: adversarialAnswer.trim().length >= 25 ? 'var(--success)' : 'var(--text-muted)' }}>{adversarialAnswer.trim().length}/25 min</span>
                        <button
                            onClick={() => { if (adversarialAnswer.trim().length >= 25) setAdversarialSubmitted(true); }}
                            disabled={adversarialAnswer.trim().length < 25}
                            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: adversarialAnswer.trim().length >= 25 ? 'rgb(168,85,247)' : 'rgba(168,85,247,0.3)', color: '#fff', fontWeight: 700, cursor: adversarialAnswer.trim().length >= 25 ? 'pointer' : 'not-allowed', fontSize: '0.9rem' }}
                        >Enviar</button>
                    </div>
                </motion.div>
            )}
            {adversarialEnabled && adversarialSubmitted && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '10px 16px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shield size={16} color="rgb(168,85,247)" />
                    <span style={{ color: 'rgb(168,85,247)', fontSize: '0.85rem', fontWeight: 700 }}>Desafío cognitivo registrado. Resultado visible en Review.</span>
                </motion.div>
            )}

            <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 32 }}>
                {sess.questions.map((qAny, idx) => {
                    const isMath = qAny.type === "math_steps";
                    const qBase = qAny as any;
                    const mBase = qAny as MathStepQuestion;

                    return (
                        <motion.div key={idx} variants={itemVariants} style={{ marginBottom: 40, paddingBottom: 32, borderBottom: idx < sess.questions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                            <h3 style={{ marginBottom: 24, fontSize: '1.25rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                                <span style={{ color: 'var(--accent-primary)', marginRight: 8 }}>{idx + 1}.</span> {isMath ? mBase.prompt_es : qBase.q}
                            </h3>

                            {/* Phase 14.5: Mental Model Prompt */}
                            {modelForced && (
                                <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Brain size={16} color="var(--success)" />
                                    <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700 }}>Modelo requerido: <strong>{MODEL_LABELS[requiredModel]}</strong>. Explica cómo cambia tu razonamiento.</span>
                                </div>
                            )}

                            {/* ─── Cognitive Pre-Answer Panel (Quality Gate) ─── */}
                            {(() => {
                                const preText = cogPreReasoning[idx] || '';
                                const minPre = pressure.minPreReasoningChars;
                                const meetsLength = preText.trim().length >= minPre;
                                const meetsCausal = hasCausalMarker(preText);
                                const preValid = meetsLength && meetsCausal;
                                return !cogPreLocked[idx] ? (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 20, padding: 16, background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 10 }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--accent-glow)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Brain size={16} /> COGNITIVE LOCK-IN
                                        </div>
                                        <div style={{ marginBottom: 12 }}>
                                            <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'block', marginBottom: 6 }}>Confianza: <strong style={{ color: 'var(--text-main)' }}>{cogConfidence[idx] ?? 50}%</strong></label>
                                            <input type="range" min={0} max={100} value={cogConfidence[idx] ?? 50} onChange={e => setCogConfidence(p => ({ ...p, [idx]: Number(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
                                        </div>
                                        <div style={{ marginBottom: 12 }}>
                                            <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'block', marginBottom: 6 }}>¿Por qué? (mín {minPre} chars + causa/regla){pressure.level !== 'normal' && <span style={{ marginLeft: 6, fontSize: '0.75rem', padding: '2px 8px', borderRadius: 8, background: pressure.level === 'elite' ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)', color: pressure.level === 'elite' ? 'var(--danger)' : 'var(--warning)' }}>{pressure.level.toUpperCase()}</span>}</label>
                                            <textarea
                                                value={preText}
                                                onChange={e => setCogPreReasoning(p => ({ ...p, [idx]: e.target.value }))}
                                                placeholder="Usa 'porque', 'entonces', 'si…', 'asumo', 'debido a'..."
                                                style={{ width: '100%', minHeight: 50, padding: 10, borderRadius: 6, background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', border: `1px solid ${preText.length > 0 && !preValid ? 'var(--danger)' : 'var(--border)'}`, fontSize: '0.95rem', resize: 'vertical' }}
                                            />
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                                {['Creo que ___ porque ___', 'Si ___ entonces ___', 'Regla: ___; por eso ___'].map(tpl => (
                                                    <button key={tpl} type="button" onClick={() => setCogPreReasoning(p => ({ ...p, [idx]: (p[idx] || '') + tpl }))} style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: 'var(--accent-glow)', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}>{tpl}</button>
                                                ))}
                                            </div>
                                        </div>
                                        {preText.length > 0 && !preValid && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: 8 }}>
                                                {!meetsLength ? `Necesitas al menos ${minPre} caracteres (${preText.trim().length}/${minPre}). ` : ''}
                                                {meetsLength && !meetsCausal ? "Explica causa o regla (usa 'porque', 'entonces', 'si…')." : ''}
                                            </div>
                                        )}
                                        <button
                                            className="btn"
                                            disabled={!preValid}
                                            style={{ width: 'auto', padding: '8px 20px', fontSize: '0.9rem', background: preValid ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', color: preValid ? '#fff' : 'var(--text-muted)' }}
                                            onClick={() => setCogPreLocked(p => ({ ...p, [idx]: true }))}
                                        >
                                            Lock In
                                        </button>
                                    </motion.div>
                                ) : !answers[idx] ? (
                                    <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(139, 92, 246, 0.08)', borderRadius: 6, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Confianza: <strong style={{ color: 'var(--accent-primary)' }}>{cogConfidence[idx] ?? 50}%</strong> — Razonamiento registrado ✓
                                    </div>
                                ) : null;
                            })()}

                            {isMath ? (
                                <div>
                                    {mBase.why_it_matters_es && (
                                        <div style={{ marginBottom: 24, background: 'rgba(0,0,0,0.3)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                            <button
                                                onClick={() => setShowContextForQ(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                style={{ width: '100%', padding: '16px 20px', background: 'rgba(56, 189, 248, 0.1)', border: 'none', textAlign: 'left', color: 'var(--text-main)', fontSize: '1rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                            >
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={18} color="var(--accent-glow)" /> Contexto de Aprendizaje (Track 1.0)</span>
                                                <span>{showContextForQ[idx] ? '▼' : '▶'}</span>
                                            </button>
                                            <AnimatePresence>
                                                {showContextForQ[idx] && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                                        <div style={{ padding: 20, display: 'grid', gap: 16 }}>
                                                            <div><strong style={{ color: 'var(--accent-glow)' }}>Por qué importa:</strong> <span style={{ color: 'var(--text-main)', display: 'block', marginTop: 4 }}>{mBase.why_it_matters_es}</span></div>
                                                            <div><strong style={{ color: 'var(--success)' }}>Aplicación Real:</strong> <span style={{ color: 'var(--text-main)', display: 'block', marginTop: 4 }}>{mBase.real_world_application_es}</span></div>
                                                            <div><strong style={{ color: 'var(--warning)' }}>Valor Futuro:</strong> <span style={{ color: 'var(--text-main)', display: 'block', marginTop: 4 }}>{mBase.future_value_es}</span></div>
                                                            <div><strong style={{ color: 'var(--accent-primary)' }}>Habilidad Mental:</strong> <span style={{ color: 'var(--text-main)', display: 'block', marginTop: 4 }}>{mBase.mental_skill_built_es}</span></div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                    <div style={{ fontSize: '1.5rem', marginBottom: 16, color: 'var(--text-main)', textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                                        {mBase.problem}
                                    </div>
                                    <div style={{ marginBottom: 16 }}>
                                        {(mathStepsForQ[idx] || []).map((step, sIdx) => (
                                            <div key={sIdx} style={{ padding: 8, borderLeft: mathStepsAcceptedForQ[idx]?.[sIdx] ? '3px solid var(--success)' : '3px solid var(--warning)', marginBottom: 8, background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)' }}>
                                                Paso {sIdx + 1}: {step} {mathStepsAcceptedForQ[idx]?.[sIdx] ? '✅' : '⚠️'}
                                            </div>
                                        ))}
                                    </div>

                                    {!answers[idx] && (
                                        <>
                                            <textarea
                                                placeholder="Ingresa tu paso actual aquí..."
                                                value={currentMathStepInput[idx] || ""}
                                                onChange={(e) => setCurrentMathStepInput(prev => ({ ...prev, [idx]: e.target.value }))}
                                                style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', border: '1px solid var(--border)', marginBottom: 12 }}
                                            />
                                            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                                                <button className="btn" style={{ width: 'auto', background: 'rgba(255,255,255,0.1)' }} onClick={() => handleCheckMathStep(idx, mBase)}>Revisar Paso</button>
                                                {mBase.stepHints_es && mBase.stepHints_es.length > 0 && (
                                                    <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowHintForQ(prev => ({ ...prev, [idx]: true }))}>Necesito Pista</button>
                                                )}
                                            </div>
                                            {showHintForQ[idx] && mBase.stepHints_es && (
                                                <div style={{ marginBottom: 24, padding: 12, borderLeft: '3px solid var(--accent-primary)', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--text-main)' }}>
                                                    💡 {mBase.stepHints_es[0]}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
                                                <input
                                                    type="text"
                                                    placeholder="Respuesta Final"
                                                    value={mathFinalAnswerForQ[idx] || ""}
                                                    onChange={(e) => setMathFinalAnswerForQ(prev => ({ ...prev, [idx]: e.target.value }))}
                                                    style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.4)', color: 'var(--text-main)', flex: 1 }}
                                                />
                                                <button
                                                    className="btn"
                                                    style={{ width: 'auto', background: 'var(--success)', color: '#000' }}
                                                    onClick={() => {
                                                        if (mathFinalAnswerForQ[idx]) {
                                                            const isCorrect = mathFinalAnswerForQ[idx].replace(/\s/g, '').toLowerCase() === mBase.expectedAnswer.replace(/\s/g, '').toLowerCase();
                                                            setAnswers(prev => ({ ...prev, [idx]: isCorrect ? "CORRECT" : "WRONG" }));
                                                        }
                                                    }}
                                                >Finalizar Problema</button>
                                            </div>
                                        </>
                                    )}
                                    {answers[idx] && (
                                        <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: answers[idx] === 'CORRECT' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)', color: 'var(--text-main)', fontWeight: 'bold' }}>
                                            Tu respuesta final: {mathFinalAnswerForQ[idx]} {answers[idx] === 'CORRECT' ? '🎉' : '❌'}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        {qBase.options.map((opt: string) => (
                                            <motion.button
                                                whileHover={{ scale: 1.01, x: 4 }}
                                                whileTap={{ scale: 0.98 }}
                                                key={opt}
                                                className={`option-btn ${answers[idx] === opt ? 'selected' : ''}`}
                                                style={{
                                                    textAlign: 'left',
                                                    background: answers[idx] === opt ? 'rgba(139, 92, 246, 0.2)' : 'rgba(0,0,0,0.3)',
                                                    borderColor: answers[idx] === opt ? 'var(--accent-primary)' : 'var(--border)',
                                                    color: answers[idx] === opt ? '#fff' : 'var(--text-main)',
                                                    padding: '16px 24px',
                                                    fontSize: '1.1rem',
                                                    boxShadow: answers[idx] === opt ? '0 0 15px rgba(139, 92, 246, 0.3)' : 'none',
                                                    transition: 'all 0.2s',
                                                    opacity: (attemptsByQ[idx] >= 2 && answers[idx] !== opt && qBase.correct !== opt) ? 0.3 : 1
                                                }}
                                                onClick={() => handleOptionClick(idx, opt, qBase.correct, qBase.q)}
                                            >
                                                {opt}
                                            </motion.button>
                                        ))}
                                    </div>

                                    {/* INLINE COACH PANEL */}
                                    {coachOpenForQ[idx] && coachPayloadForQ[idx] && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 24, padding: 20, background: 'rgba(139, 92, 246, 0.05)', border: '1px solid var(--accent-primary)', borderRadius: 12 }}>
                                            <h4 style={{ color: 'var(--accent-glow)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                <Brain size={20} /> Coach (Quick Fix)
                                            </h4>
                                            <p style={{ color: 'var(--text-main)', marginBottom: 16, fontSize: '1.05rem', lineHeight: 1.5 }}>{coachPayloadForQ[idx].reason_es}</p>

                                            {!coachPayloadForQ[idx].correctText && (
                                                <div style={{ marginBottom: 20 }}>
                                                    <p style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.95rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>Regla: {coachPayloadForQ[idx].rule_es}</p>
                                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, borderLeft: '3px solid var(--accent-primary)' }}>
                                                        <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: 4 }}>"{coachPayloadForQ[idx].example_en}"</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{coachPayloadForQ[idx].example_es}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {coachPayloadForQ[idx].correctText && (
                                                <div style={{ marginTop: 16, marginBottom: 20, padding: 16, background: 'rgba(16, 185, 129, 0.1)', borderLeft: '4px solid var(--success)', borderRadius: 8 }}>
                                                    <span style={{ color: 'var(--success)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 4 }}>Respuesta Correcta:</span>
                                                    <span style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>{coachPayloadForQ[idx].correctText}</span>
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: 12 }}>
                                                {attemptsByQ[idx] < 2 && (
                                                    <button className="btn neon-border" style={{ padding: '10px 20px', width: 'auto', background: 'rgba(139, 92, 246, 0.2)' }} onClick={() => handleTryAgain(idx)}>
                                                        Try Again
                                                    </button>
                                                )}
                                                <button
                                                    className="btn"
                                                    style={{ padding: '10px 20px', width: 'auto', background: (attemptsByQ[idx] >= 2) ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', color: (attemptsByQ[idx] >= 2) ? '#fff' : 'var(--text-muted)' }}
                                                    disabled={attemptsByQ[idx] < 2}
                                                    onClick={() => setCoachOpenForQ(prev => ({ ...prev, [idx]: false }))}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* TRIGGERS FOR PRONUNCIATION DRILL */}
                                    {isEnglish && (attemptsByQ[idx] >= 2 || answers[idx] === qBase.correct) && !showDrillForQ[idx] && (
                                        <motion.button
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            onClick={() => setShowDrillForQ(prev => ({ ...prev, [idx]: true }))}
                                            style={{ marginTop: 16, background: 'transparent', border: '1px solid rgba(56, 189, 248, 0.4)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: 8, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s' }}
                                            whileHover={{ background: 'rgba(56, 189, 248, 0.1)', color: '#fff' }}
                                        >
                                            <Mic size={16} color="var(--accent-primary)" /> Pronunciation Drill (30s)
                                        </motion.button>
                                    )}

                                    {/* PRONUNCIATION DRILL RENDER */}
                                    {showDrillForQ[idx] && (
                                        <PronunciationDrill
                                            sentence={qBase.q}
                                            accent={sess?.accent || 'default'}
                                            onComplete={(score) => handleDrillComplete(idx, score, '', qBase.q)}
                                        />
                                    )}

                                    {/* ─── Phase 14.3: Second-Order Prompt (elite, every 2 Qs) ─── */}
                                    {pressure.requireSecondOrder && idx > 0 && idx % 2 === 0 && cogPreLocked[idx] && answers[idx] && (
                                        <div style={{ marginTop: 16, padding: 14, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10 }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--accent-glow)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>🧠 SECOND-ORDER THINKING</div>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 8 }}>{getSecondOrderPrompt(idx)}</p>
                                            <textarea value={secondOrderAnswers[idx] || ''} onChange={e => setSecondOrderAnswers(p => ({ ...p, [idx]: e.target.value }))} placeholder="Piensa en las consecuencias de largo plazo..." style={{ width: '100%', minHeight: 40, padding: 8, borderRadius: 6, background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', border: '1px solid var(--border)', fontSize: '0.9rem' }} />
                                        </div>
                                    )}

                                    {/* ─── Cognitive Post-Answer Panel (wrong + locked, OR forced on correct at high/elite) ─── */}
                                    {cogPreLocked[idx] && answers[idx] && (
                                        (answers[idx] !== qBase.correct && attemptsByQ[idx] >= 2) || (pressure.forceReflectionOnCorrect && answers[idx] === qBase.correct)
                                    ) && !cogPostLocked[idx] && (() => {
                                        const postText = cogPostReflection[idx] || '';
                                        const minPost = pressure.minPostReflectionChars;
                                        const postValid = postText.trim().length >= minPost && hasReflectionMarker(postText);
                                        return (
                                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, padding: 16, background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: 10 }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>REFLECTION REQUIRED</div>
                                                <div style={{ marginBottom: 10 }}>
                                                    <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'block', marginBottom: 4 }}>¿Qué pasó? (mín 15 chars, usa 'mi error'/'la próxima'/'porque')</label>
                                                    <textarea value={postText} onChange={e => setCogPostReflection(p => ({ ...p, [idx]: e.target.value }))} placeholder="Reflexiona: 'mi error fue…' o 'la próxima vez…' o 'porque…'" style={{ width: '100%', minHeight: 40, padding: 8, borderRadius: 6, background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', border: `1px solid ${postText.length > 0 && !postValid ? 'var(--danger)' : 'var(--border)'}`, fontSize: '0.9rem' }} />
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                                        {['Mi error fue ___ porque ___', 'La próxima vez haré ___'].map(tpl => (
                                                            <button key={tpl} type="button" onClick={() => setCogPostReflection(p => ({ ...p, [idx]: (p[idx] || '') + tpl }))} style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}>{tpl}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                {postText.length > 0 && !postValid && (
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: 8 }}>
                                                        {postText.trim().length < 15 ? `Mín 15 caracteres (${postText.trim().length}/15). ` : ''}Incluye 'mi error', 'la próxima' o 'porque'.
                                                    </div>
                                                )}
                                                <div style={{ marginBottom: 10 }}>
                                                    <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'block', marginBottom: 4 }}>Tipo de error:</label>
                                                    <select value={cogErrorType[idx] || 'unknown'} onChange={e => setCogErrorType(p => ({ ...p, [idx]: e.target.value as CognitiveErrorType }))} style={{ padding: 8, borderRadius: 6, background: 'rgba(0,0,0,0.4)', color: 'var(--text-main)', border: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                                        <option value="conceptual">Conceptual</option>
                                                        <option value="impulsive">Impulsivo</option>
                                                        <option value="misread">Leí mal</option>
                                                        <option value="no_check">No verifiqué</option>
                                                        <option value="memory_gap">No recordaba</option>
                                                        <option value="unknown">No sé</option>
                                                    </select>
                                                </div>
                                                <div style={{ marginBottom: 10 }}>
                                                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>¿Qué harás la próxima vez? (opcional)</label>
                                                    <input type="text" value={cogNextTime[idx] || ''} onChange={e => setCogNextTime(p => ({ ...p, [idx]: e.target.value }))} placeholder="Mi estrategia..." style={{ width: '100%', padding: 8, borderRadius: 6, background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', border: '1px solid var(--border)', fontSize: '0.9rem' }} />
                                                </div>
                                                <button className="btn" disabled={!postValid} style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem', background: postValid ? 'var(--danger)' : 'rgba(255,255,255,0.05)', color: postValid ? '#fff' : 'var(--text-muted)' }} onClick={() => setCogPostLocked(p => ({ ...p, [idx]: true }))}>
                                                    Submit Reflection
                                                </button>
                                            </motion.div>
                                        );
                                    })()}
                                    {cogPostLocked[idx] && (
                                        <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(244, 63, 94, 0.08)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reflexión registrada ✓</div>
                                    )}
                                </div>
                            )}

                            {/* ─── Cognitive Post for Math (wrong) ─── */}
                            {isMath && cogPreLocked[idx] && answers[idx] && answers[idx] !== 'CORRECT' && !cogPostLocked[idx] && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, padding: 16, background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: 10 }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>REFLECTION REQUIRED</div>
                                    <textarea value={cogPostReflection[idx] || ''} onChange={e => setCogPostReflection(p => ({ ...p, [idx]: e.target.value }))} placeholder="Reflexiona sobre tu error (mín 10 chars)..." style={{ width: '100%', minHeight: 40, padding: 8, borderRadius: 6, background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', border: '1px solid var(--border)', fontSize: '0.9rem', marginBottom: 8 }} />
                                    <select value={cogErrorType[idx] || 'unknown'} onChange={e => setCogErrorType(p => ({ ...p, [idx]: e.target.value as CognitiveErrorType }))} style={{ padding: 8, borderRadius: 6, background: 'rgba(0,0,0,0.4)', color: 'var(--text-main)', border: '1px solid var(--border)', fontSize: '0.9rem', marginBottom: 8 }}>
                                        <option value="conceptual">Conceptual</option>
                                        <option value="impulsive">Impulsivo</option>
                                        <option value="misread">Leí mal</option>
                                        <option value="no_check">No verifiqué</option>
                                        <option value="memory_gap">No recordaba</option>
                                        <option value="unknown">No sé</option>
                                    </select>
                                    <button className="btn" disabled={(cogPostReflection[idx] || '').length < 10} style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem', background: (cogPostReflection[idx] || '').length >= 10 ? 'var(--danger)' : 'rgba(255,255,255,0.05)', color: (cogPostReflection[idx] || '').length >= 10 ? '#fff' : 'var(--text-muted)', marginLeft: 8 }} onClick={() => setCogPostLocked(p => ({ ...p, [idx]: true }))}>
                                        Submit Reflection
                                    </button>
                                </motion.div>
                            )}
                            {isMath && cogPostLocked[idx] && (
                                <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(244, 63, 94, 0.08)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reflexión registrada ✓</div>
                            )}
                        </motion.div>
                    );
                })}

                {/* ─── Ambiguity Case ─── */}
                <AmbiguityCase
                    onSubmit={async (answer, promptId) => {
                        setAmbiguityAnswer(answer);
                        setAmbiguityPromptId(promptId);
                        setAmbiguitySubmitted(true);
                        try {
                            const result = await scoreAmbiguityWithAI(answer, promptId);
                            setAmbiguityScore(result.score);
                        } catch {
                            const fallback = scoreWithHeuristics(answer);
                            setAmbiguityScore(fallback.score);
                        }
                    }}
                    submitted={ambiguitySubmitted}
                    score={ambiguityScore}
                />

                {submitError && (
                    <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', padding: 12, borderRadius: 8, marginTop: 16, border: '1px solid var(--danger)', textAlign: 'center' }}>
                        {submitError}
                        {import.meta.env.DEV && errorStack && (
                            <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.85, fontSize: '0.8rem', marginTop: 8, textAlign: 'left', background: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 4 }}>
                                {errorStack}
                            </pre>
                        )}
                    </div>
                )}

                <motion.button
                    whileHover={canSubmit ? { scale: 1.02, boxShadow: '0 0 40px rgba(16, 185, 129, 0.8)' } : {}}
                    whileTap={canSubmit ? { scale: 0.95 } : {}}
                    className="btn"
                    disabled={!canSubmit}
                    style={{
                        marginTop: 16,
                        padding: '20px',
                        fontSize: '1.2rem',
                        background: canSubmit ? 'var(--success)' : 'rgba(255,255,255,0.05)',
                        color: canSubmit ? '#000' : 'var(--text-muted)',
                        border: canSubmit ? 'none' : '1px solid var(--border)',
                        boxShadow: canSubmit ? '0 0 30px rgba(16, 185, 129, 0.5)' : 'none',
                        transition: 'all 0.3s'
                    }}
                    onClick={handleSubmit}
                >
                    {canSubmit
                        ? ((todayMission.areaId === area.id && todayMission.target.difficulty === sess.difficulty) ? 'Finish Mission' : 'Submit Answers')
                        : 'Awaiting answers'} <ArrowRight size={20} />
                </motion.button>
            </motion.div>
        </motion.div >
    );
}
