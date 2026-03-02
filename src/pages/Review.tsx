import { useParams, Link, useOutletContext, useLocation } from 'react-router-dom';
import { getHistory, getAdaptiveProfile, getCustomSessionsByArea, getMistakes, saveMistakes, getXp, saveXp, getCognitiveSessions, getCognitiveProfile } from '../lib/storage';
import { sessions } from '../data/sessions';
import { Brain, Award, ShieldAlert, Zap, MessageSquare, CheckCircle, Activity } from 'lucide-react';
import { motion, Variants, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';
import { generateCoachFeedback } from '../lib/gemini';
import { CoachFeedback, CognitiveSessionSummary } from '../types';
import { computePressureLevel, type PressureLevel } from '../lib/cognitivePressureEngine';
import { MODEL_LABELS, checkModelReference, type RotationModelId } from '../lib/mentalModelEngine';
import { ADVERSARIAL_EXPLANATIONS } from '../lib/adversarialEngine';
import { THEME_LABELS as DL_THEME_LABELS, getDecisionLabImprovement } from '../lib/decisionLabEngine';
import { childLS } from '../lib/childStorage';

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

function AnimatedCounter({ from, to, delay = 0 }: { from: number, to: number, delay?: number }) {
    const count = useMotionValue(from);
    const rounded = useTransform(count, Math.round);

    useEffect(() => {
        const animation = animate(count, to, { duration: 1.5, delay, type: "spring", bounce: 0.25 });
        return animation.stop;
    }, [count, to, delay]);

    return <motion.span>{rounded}</motion.span>;
}

export default function Review() {
    const { resultId } = useParams();
    const location = useLocation();
    const { missionCompleted, xpEarned, newBadges } = location.state || {};
    const { area } = useOutletContext<{ area: any }>();
    const isEnglish = area.id === 'english';

    const history = getHistory();
    const result = history.find(h => h.id === resultId);

    if (!result) return <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--danger)' }}>ERROR: LOGS CORRUPTED OR NOT FOUND.</div>;

    const customSessions = getCustomSessionsByArea(area.id);
    const originSess = sessions.find(s => s.topic === result.topic) || customSessions.find(s => s.topic === result.topic);
    const isPerfect = result.score === result.total;

    // Cognitive Edge data for this session
    const cogSessions = getCognitiveSessions();
    const cogSummary: CognitiveSessionSummary | undefined = cogSessions.find(c => c.sessionId === originSess?.id);
    const cogProfile = getCognitiveProfile();

    // Mini Challenge State
    const [miniChallengeSolved, setMiniChallengeSolved] = useState<Record<number, boolean>>({});
    const [miniChallengeAnswer, setMiniChallengeAnswer] = useState<Record<number, string>>({});

    const handleSolveMini = (idx: number) => {
        if (miniChallengeAnswer[idx] && miniChallengeAnswer[idx].trim() !== '' && !miniChallengeSolved[idx]) {
            setMiniChallengeSolved(prev => ({ ...prev, [idx]: true }));
            const curXp = getXp();
            curXp.total += 5;
            curXp.byArea['math'] = (curXp.byArea['math'] || 0) + 5;
            saveXp(curXp);
        }
    };

    // Coach Chat State
    const [coachFeedback, setCoachFeedback] = useState<CoachFeedback | null>(null);
    const [isCoachLoading, setIsCoachLoading] = useState(false);
    const [drillAnswer, setDrillAnswer] = useState('');
    const [isDrillCorrect, setIsDrillCorrect] = useState<boolean | null>(null);
    const [drillAttempts, setDrillAttempts] = useState(0);

    useEffect(() => {
        if (!isPerfect && result.wrongQuestions.length > 0) {
            const processMistakesAndCoach = async () => {
                setIsCoachLoading(true);

                // 1) Compute Tags based on heuristics
                let tagsToAdd: string[] = [];
                result.wrongQuestions.forEach(wq => {
                    const qText = (wq.questionText || wq.q || '').toLowerCase();
                    if (area.id === 'english') {
                        if (qText.includes('mean') || qText.includes('word')) tagsToAdd.push('vocab');
                        else if (qText.includes('why') || qText.includes('infer')) tagsToAdd.push('inference');
                        else if (qText.includes('grammar') || qText.includes('tense')) tagsToAdd.push('grammar');
                        else tagsToAdd.push('listening_detail');
                    } else if (area.id === 'math') {
                        if (qText.includes('x') || qText.includes('solve')) tagsToAdd.push('algebra');
                        else if (qText.includes('area') || qText.includes('angle')) tagsToAdd.push('geometry');
                        else if (qText.includes('if') || qText.includes('word')) tagsToAdd.push('word_problem');
                        else tagsToAdd.push('arithmetic');
                    } else if (area.id === 'spanish') {
                        if (qText.includes('significa')) tagsToAdd.push('vocab_es');
                        else if (qText.includes('infiere')) tagsToAdd.push('inferencias');
                        else tagsToAdd.push('comprension');
                    } else if (area.id === 'thinking') {
                        if (qText.includes('bias')) tagsToAdd.push('bias');
                        else if (qText.includes('assume')) tagsToAdd.push('assumptions');
                        else tagsToAdd.push('logic');
                    } else {
                        tagsToAdd.push('general_error');
                    }
                });

                // Dedup tags
                tagsToAdd = Array.from(new Set(tagsToAdd));

                // 2) Update Local Storage (Mistakes)
                const mistakesData = getMistakes();
                if (!mistakesData.byArea[area.id]) mistakesData.byArea[area.id] = [];

                tagsToAdd.forEach(tag => {
                    const existing = mistakesData.byArea[area.id].find(s => s.tag === tag);
                    if (existing) {
                        existing.count += 1;
                        existing.lastSeenISO = new Date().toISOString();
                    } else {
                        mistakesData.byArea[area.id].push({ tag, count: 1, lastSeenISO: new Date().toISOString() });
                    }
                });

                mistakesData.recent.unshift({
                    id: `mev-${Date.now()}`,
                    areaId: area.id as any,
                    sessionId: originSess?.id || 'unknown',
                    resultId: result.id,
                    wrongQuestionIds: result.wrongQuestions.map(wq => wq.q),
                    createdAtISO: new Date().toISOString()
                });

                if (mistakesData.recent.length > 50) mistakesData.recent.pop();
                saveMistakes(mistakesData);

                // 3) Call Gemini
                try {
                    const feedback = await generateCoachFeedback({
                        areaId: area.id,
                        wrongQuestions: result.wrongQuestions
                    });
                    setCoachFeedback(feedback);
                } catch (err) {
                    console.error("Failed to load coach feedback", err);
                } finally {
                    setIsCoachLoading(false);
                }
            };
            processMistakesAndCoach();
        }
    }, [isPerfect, result.wrongQuestions, area.id, originSess?.id, result.id]);

    const handleDrillSubmit = () => {
        if (!coachFeedback) return;
        const normalizedInput = drillAnswer.trim().toLowerCase().replace(/[.,!?]/g, '');
        const normalizedCorrect = coachFeedback.drill.answer.trim().toLowerCase().replace(/[.,!?]/g, '');

        if (normalizedInput === normalizedCorrect) {
            setIsDrillCorrect(true);
        } else {
            setIsDrillCorrect(false);
            setDrillAttempts(prev => prev + 1);
        }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ maxWidth: 800, margin: '0 auto' }}>
            <motion.div variants={itemVariants} className={`card glass-panel ${isPerfect ? 'neon-border' : ''}`} style={{ textAlign: 'center', border: isPerfect ? 'none' : '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 300, height: 200, background: isPerfect ? 'var(--success)' : 'var(--accent-primary)', filter: 'blur(80px)', opacity: 0.2, pointerEvents: 'none' }} />

                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: isPerfect ? 360 : 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                >
                    <Award size={80} color={isPerfect ? "var(--success)" : "var(--accent-primary)"} style={{ margin: '0 auto 16px', filter: isPerfect ? 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.8))' : 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.8))' }} />
                </motion.div>

                <h1 style={{ fontSize: '3.5rem', margin: 0, color: isPerfect ? 'var(--success)' : 'var(--text-main)', textShadow: isPerfect ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none' }}>
                    <AnimatedCounter from={0} to={result.score} /> <span style={{ color: 'var(--text-muted)', fontSize: '2rem' }}>/ {result.total}</span>
                </h1>
                <p style={{ fontSize: '1.2rem', color: isPerfect ? 'var(--success)' : 'var(--accent-primary)', marginTop: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
                    {isPerfect ? "FLAWLESS EXECUTION." : "TELEMETRY LOGGED. REVIEW MISTAKES."}
                </p>
            </motion.div>

            {missionCompleted && (
                <motion.div variants={itemVariants} style={{ background: 'rgba(245, 158, 11, 0.1)', padding: 32, borderRadius: 16, border: '1px solid var(--warning)', textAlign: 'center', marginBottom: 32, position: 'relative', overflow: 'hidden', boxShadow: '0 0 30px rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', width: 200, height: 100, background: 'var(--warning)', filter: 'blur(60px)', opacity: 0.3, pointerEvents: 'none' }} />

                    {/* Particles */}
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            width: 8, height: 8,
                            background: 'var(--warning)',
                            borderRadius: '50%',
                            boxShadow: '0 0 10px var(--warning)',
                            animation: `burstParticles 1s ease-out forwards ${i * 0.05}s`,
                            transformOrigin: `${(Math.random() - 0.5) * 400}px ${(Math.random() - 0.5) * 400}px`
                        }} />
                    ))}

                    <h2 style={{ color: 'var(--warning)', marginBottom: 8, fontSize: '2rem', textTransform: 'uppercase', letterSpacing: '2px', textShadow: '0 0 10px rgba(245, 158, 11, 0.5)' }}>MISSION ACCOMPLISHED</h2>
                    <p style={{ color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: 24, opacity: 0.9 }}>Neural pathways reinforced successfully.</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring" }}
                            style={{ background: 'rgba(0,0,0,0.5)', padding: '12px 24px', borderRadius: 12, fontWeight: 900, color: 'var(--warning)', fontSize: '1.4rem', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)' }}
                        >
                            <Zap size={20} fill="currentColor" /> +<AnimatedCounter from={0} to={xpEarned} delay={0.4} /> XP
                        </motion.div>
                        {newBadges?.map((b: string, i: number) => (
                            <motion.div
                                key={b}
                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + (i * 0.1), type: "spring" }}
                                style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '12px 24px', borderRadius: 12, fontWeight: 900, color: 'var(--warning)', fontSize: '1.4rem', border: '2px solid var(--warning)', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 20px rgba(245, 158, 11, 0.5)' }}
                            >
                                <Award size={20} fill="currentColor" /> {b}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {!missionCompleted && xpEarned > 0 && (
                <motion.div variants={itemVariants} style={{ background: 'rgba(245, 158, 11, 0.05)', padding: 16, borderRadius: 12, border: '1px solid rgba(245, 158, 11, 0.3)', textAlign: 'center', marginBottom: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                    <Zap size={18} color="var(--warning)" fill="var(--warning)" />
                    <h3 style={{ color: 'var(--warning)', margin: 0, fontSize: '1.1rem' }}>+<AnimatedCounter from={0} to={xpEarned} /> XP LOGGED</h3>
                </motion.div>
            )}

            {originSess?.coachTip && (
                <motion.div variants={itemVariants} className="coach-tip glass-panel" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: 24, borderRadius: 16 }}>
                    <Brain size={48} color="var(--warning)" style={{ flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.5))' }} />
                    <div>
                        <h3 style={{ margin: '0 0 8px 0', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '1px' }}>AI COACH DEBRIEF</h3>
                        <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', lineHeight: 1.6, opacity: 0.9 }}>
                            {originSess.coachTip}
                        </p>
                    </div>
                </motion.div>
            )}

            {/* ─── Cognitive Edge Block ─── */}
            {cogSummary && (
                <motion.div variants={itemVariants} className="card glass-panel" style={{ borderColor: 'rgba(139, 92, 246, 0.4)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-primary), var(--danger), var(--accent-glow))' }} />
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-glow)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Brain size={20} /> COGNITIVE EDGE
                        {(() => {
                            const pLevel: PressureLevel = computePressureLevel(cogProfile);
                            const colors: Record<PressureLevel, string> = { low: 'var(--success)', normal: 'var(--text-muted)', high: 'var(--warning)', elite: 'var(--danger)' };
                            const labels: Record<PressureLevel, string> = { low: 'LOW', normal: 'NORMAL', high: 'HIGH — correcting overconfidence', elite: 'ELITE — second-order thinking' };
                            return <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 10, background: `${colors[pLevel]}22`, color: colors[pLevel], fontWeight: 700, marginLeft: 'auto' }}>{labels[pLevel]}</span>;
                        })()}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>Calibration</div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: cogSummary.calibrationScore >= 70 ? 'var(--success)' : cogSummary.calibrationScore >= 40 ? 'var(--warning)' : 'var(--danger)' }}>{cogSummary.calibrationScore}</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>Overconfidence</div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: cogSummary.overconfidenceRate <= 0.1 ? 'var(--success)' : cogSummary.overconfidenceRate <= 0.3 ? 'var(--warning)' : 'var(--danger)' }}>{Math.round(cogSummary.overconfidenceRate * 100)}%</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>Reflection</div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: cogSummary.reflectionRate >= 0.7 ? 'var(--success)' : cogSummary.reflectionRate >= 0.4 ? 'var(--warning)' : 'var(--danger)' }}>{Math.round(cogSummary.reflectionRate * 100)}%</div>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            High-confidence wrong answers: <strong style={{ color: 'var(--danger)' }}>{cogSummary.highConfWrongCount}</strong>
                            {cogSummary.highConfWrongCount > 0 && <span style={{ color: 'var(--danger)', fontSize: '0.85rem', marginLeft: 8 }}>(- {cogSummary.highConfWrongCount * 3} XP penalty)</span>}
                        </div>
                        <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            Most common error: <strong style={{ color: 'var(--accent-primary)' }}>{cogSummary.mostCommonError}</strong>
                        </div>
                        <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            Avg Reasoning Quality: <strong style={{ color: cogSummary.avgReasoningQuality >= 3 ? 'var(--success)' : cogSummary.avgReasoningQuality >= 2 ? 'var(--warning)' : 'var(--danger)' }}>{cogSummary.avgReasoningQuality.toFixed(1)}/5</strong>
                        </div>
                        <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            Meta-Cognition Score: <strong style={{ color: cogSummary.avgMetaCognitionScore >= 3 ? 'var(--success)' : cogSummary.avgMetaCognitionScore >= 2 ? 'var(--warning)' : 'var(--danger)' }}>{cogSummary.avgMetaCognitionScore.toFixed(1)}/5</strong>
                        </div>
                        {cogSummary.avgMetaCognitionScore < 2 && (
                            <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 6, fontSize: '0.85rem', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)' }}>
                                💡 Identifica suposiciones, menciona alternativas y reconoce sesgos en tus reflexiones.
                            </div>
                        )}
                        {cogSummary.ambiguityToleranceIndex > 0 && (
                            <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                Ambiguity Tolerance: <strong style={{ color: cogSummary.ambiguityToleranceIndex >= 60 ? 'var(--success)' : cogSummary.ambiguityToleranceIndex >= 40 ? 'var(--warning)' : 'var(--danger)' }}>{cogSummary.ambiguityToleranceIndex}/100</strong>
                            </div>
                        )}
                        {cogSummary.attempts.every(a => a.confidence === 50) && (
                            <div style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 6, fontSize: '0.85rem', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                ⚠ Confidence stayed at default (50%). Calibrate your confidence next time.
                            </div>
                        )}
                    </div>
                    {/* Phase 14.5: Mental Model Focus */}
                    {(() => {
                        const modelUsed = cogSummary.attempts.find(a => a.mentalModel)?.mentalModel as RotationModelId | undefined;
                        if (!modelUsed) return null;
                        const applied = cogSummary.attempts.some(a => a.questionIdx >= 0 && checkModelReference(a.preReasoning, modelUsed));
                        const profileMC = cogProfile?.modelCounts || {};
                        return (
                            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10 }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Mental Model Focus</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Model: <strong style={{ color: 'var(--text-main)' }}>{MODEL_LABELS[modelUsed] || modelUsed}</strong></div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Applied: <strong style={{ color: applied ? 'var(--success)' : 'var(--danger)' }}>{applied ? 'Yes ✓' : 'No ✗'}</strong></div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Uses: <strong style={{ color: 'var(--text-main)' }}>{profileMC[modelUsed] || 0}</strong></div>
                                </div>
                            </div>
                        );
                    })()}
                </motion.div>
            )}

            {/* Phase 14.7: Adversarial Disclosure */}
            {cogSummary && (() => {
                const advAttempt = cogSummary.attempts.find(a => a.adversarialId);
                if (!advAttempt) return null;
                const advType = advAttempt.adversarialType!;
                return (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 20, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.04)' }}>
                        <h3 style={{ fontSize: '1rem', color: 'rgb(168,85,247)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>⚔ Adversarial Mode (Training)</h3>
                        <div style={{ display: 'grid', gap: 8 }}>
                            <div style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.9rem', color: 'var(--text-main)' }}>Tipo: <strong style={{ color: 'rgb(168,85,247)' }}>{advType}</strong></div>
                            <div style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.9rem', color: 'var(--text-main)' }}>Resultado: <strong style={{ color: advAttempt.adversarialPass ? 'var(--success)' : 'var(--danger)' }}>{advAttempt.adversarialPass ? 'PASS ✓' : 'FAIL ✗'}</strong></div>
                            <div style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{advAttempt.adversarialNotes}</div>
                            <div style={{ padding: '6px 12px', background: 'rgba(168,85,247,0.08)', borderRadius: 6, fontSize: '0.85rem', color: 'rgb(168,85,247)', border: '1px solid rgba(168,85,247,0.2)' }}>{ADVERSARIAL_EXPLANATIONS[advType]}</div>
                        </div>
                    </motion.div>
                );
            })()}

            {/* Phase 14.8: Decision Lab Disclosure */}
            {(() => {
                const labs = JSON.parse(childLS.getItem('brainbro_decision_labs_v1') || '[]');
                if (!labs.length) return null;
                const latest = labs[0];
                // Only show if completed today/recently (within 2 hours)
                const age = Date.now() - new Date(latest.completedAt).getTime();
                if (age > 7200000) return null;
                return (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 20, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.04)' }}>
                        <h3 style={{ fontSize: '1rem', color: 'rgb(34,197,94)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>📋 Decision Lab</h3>
                        <div style={{ display: 'grid', gap: 8 }}>
                            <div style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.9rem', color: 'var(--text-main)' }}>Tema: <strong style={{ color: 'rgb(34,197,94)' }}>{DL_THEME_LABELS[latest.theme as keyof typeof DL_THEME_LABELS] || latest.theme}</strong></div>
                            <div style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.9rem', color: 'var(--text-main)' }}>Score: <strong style={{ color: latest.score >= 3 ? 'var(--success)' : latest.score >= 2 ? 'var(--warning)' : 'var(--danger)' }}>{latest.score}/5</strong></div>
                            <div style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{latest.notes}</div>
                            <div style={{ padding: '6px 12px', background: 'rgba(34,197,94,0.08)', borderRadius: 6, fontSize: '0.85rem', color: 'rgb(34,197,94)', border: '1px solid rgba(34,197,94,0.2)' }}>{getDecisionLabImprovement(latest.score, latest.theme)}</div>
                        </div>
                    </motion.div>
                );
            })()}

            {originSess?.areaId === 'math' && originSess.questions?.some(q => q.type === 'math_steps') && (
                <motion.div variants={itemVariants} className="card glass-panel" style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: 24, borderRadius: 16 }}>
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-glow)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={20} /> TRANSFERENCIA A LA VIDA REAL
                    </h2>
                    {originSess.questions.filter(q => q.type === 'math_steps').map((qAny, i) => {
                        const mQ = qAny as any;
                        if (!mQ.real_world_application_es) return null;
                        return (
                            <div key={i} style={{ marginBottom: i < originSess.questions.length - 1 ? 24 : 0, paddingBottom: i < originSess.questions.length - 1 ? 24 : 0, borderBottom: i < originSess.questions.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                                <div style={{ color: 'var(--text-main)', fontSize: '1.05rem', marginBottom: 8 }}><strong style={{ color: 'var(--success)' }}>Aplicación:</strong> {mQ.real_world_application_es}</div>
                                <div style={{ color: 'var(--text-main)', fontSize: '1.05rem', marginBottom: 16 }}><strong style={{ color: 'var(--warning)' }}>Valor Futuro:</strong> {mQ.future_value_es}</div>

                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>Mini Reto Determinista <span className="badge" style={{ background: 'var(--warning)', color: '#000', fontSize: '0.7rem' }}>+5 XP</span></h4>
                                    <p style={{ margin: '0 0 12px 0', color: 'var(--text-main)' }}>Si tuvieras que hacer esto para el doble de cantidad, ¿cómo cambiaría el resultado final?</p>

                                    {!miniChallengeSolved[i] ? (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input
                                                type="text"
                                                value={miniChallengeAnswer[i] || ""}
                                                onChange={(e) => setMiniChallengeAnswer(prev => ({ ...prev, [i]: e.target.value }))}
                                                placeholder="Tu respuesta (ej: 120)..."
                                                style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border)', flex: 1 }}
                                            />
                                            <button className="btn" onClick={() => handleSolveMini(i)} style={{ width: 'auto', padding: '8px 16px', background: 'var(--accent-primary)' }}>Verificar</button>
                                        </div>
                                    ) : (
                                        <div style={{ padding: 12, background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', borderRadius: 8, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <CheckCircle size={18} /> ¡Bien hecho! +5 XP añadidos a tu perfil.
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </motion.div>
            )}

            {originSess?.text && !isEnglish && (
                <motion.div variants={itemVariants} className="card glass-panel">
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>SCENARIO DATA</h2>
                    <p style={{ margin: 0, fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--text-main)', background: 'rgba(0,0,0,0.4)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
                        {originSess.text}
                    </p>
                </motion.div>
            )}

            {originSess?.text && isEnglish && (
                <motion.div variants={itemVariants} className="card glass-panel">
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>AUDIO TRANSCRIPT</h2>
                    <p style={{ margin: 0, fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--text-main)', background: 'rgba(0,0,0,0.4)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
                        {originSess.text}
                    </p>
                </motion.div>
            )}

            {result.wrongQuestions.length > 0 && (
                <motion.div variants={itemVariants} className="card glass-panel" style={{ borderColor: 'var(--danger)', boxShadow: 'inset 0 0 20px rgba(244, 63, 94, 0.05)' }}>
                    <h2 style={{ color: 'var(--danger)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <ShieldAlert size={24} /> CRITICAL FAILURES DETECTED
                    </h2>
                    <div style={{ display: 'grid', gap: 24 }}>
                        {result.wrongQuestions.map((wq, i) => {
                            const origQ = originSess?.questions.find((q: any) => (q.q || (q as any).problem) === wq.q);
                            const steps = (origQ as any)?.steps_es;
                            return (
                                <div key={i} className="feedback-card" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: 24, borderRadius: 12 }}>
                                    <p style={{ fontWeight: 600, fontSize: '1.15rem', marginBottom: 16, color: 'var(--text-main)', lineHeight: 1.5 }}>{wq.questionText || wq.q}</p>

                                    <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
                                        <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '12px 16px', borderRadius: 8, borderLeft: '4px solid var(--danger)', color: 'var(--text-main)' }}>
                                            <span style={{ color: 'var(--danger)', fontWeight: 800, marginRight: 8 }}>✗ YOUR INPUT:</span> {wq.chosen}
                                        </div>
                                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px 16px', borderRadius: 8, borderLeft: '4px solid var(--success)', color: 'var(--text-main)' }}>
                                            <span style={{ color: 'var(--success)', fontWeight: 800, marginRight: 8 }}>✓ CORRECT:</span> {wq.correct}
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: 20, borderRadius: 12, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                        <strong style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px' }}>AI ANALYSIS:</strong>
                                        <span style={{ color: 'var(--text-main)', lineHeight: 1.6 }}>{wq.explanation_es}</span>

                                        {wq.correction_en && wq.correction_en !== wq.correct && (
                                            <div style={{ marginTop: 12, fontSize: '0.95rem', color: 'var(--text-main)', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                                                <strong style={{ color: 'var(--text-muted)' }}>Correction format:</strong> {wq.correction_en}
                                            </div>
                                        )}
                                        {steps && steps.length > 0 && (
                                            <div style={{ marginTop: 16, padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                                <strong style={{ display: 'block', marginBottom: 12, color: 'var(--accent-primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>EXECUTION STEPS:</strong>
                                                <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                                                    {steps.map((st: string, idx: number) => <li key={idx} style={{ marginBottom: 6 }}>{st}</li>)}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* COACH CHAT UI */}
            {!isPerfect && isCoachLoading && (
                <motion.div variants={itemVariants} className="card glass-panel neon-border" style={{ textAlign: 'center', padding: 40, borderColor: 'var(--accent-glow)' }}>
                    <Brain className="spin" size={32} color="var(--accent-primary)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ color: 'var(--accent-glow)', textTransform: 'uppercase', letterSpacing: '1px' }}>SENSEI DETECTING ANOMALIES...</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Analyzing your telemetry data.</p>
                </motion.div>
            )}

            {!isPerfect && coachFeedback && (
                <motion.div variants={itemVariants} className="card glass-panel" style={{ borderColor: 'var(--accent-primary)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-glow))' }} />

                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--accent-glow)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 24 }}>
                        <MessageSquare size={24} /> COACH: WHAT TO FIX NEXT
                    </h2>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 12, marginBottom: 24, borderLeft: '4px solid var(--accent-primary)' }}>
                        <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', lineHeight: 1.6 }}>{coachFeedback.summary_es}</p>
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {coachFeedback.focus_tags.map((tag: string) => (
                                <span key={tag} style={{ background: 'var(--accent-primary)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>#{tag}</span>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: 16 }}>GOLDEN RULE</h3>
                        <div style={{ padding: 20, background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 12, color: 'var(--accent-primary)', fontWeight: 600, fontSize: '1.1rem' }}>
                            {coachFeedback.rule_es}
                        </div>
                    </div>

                    <div style={{ marginBottom: 32 }}>
                        <h3 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: 16 }}>EXAMPLES</h3>
                        <div style={{ display: 'grid', gap: 12 }}>
                            {coachFeedback.examples.map((ex: any, i: number) => (
                                <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                                    <div style={{ color: 'var(--text-main)', fontWeight: 500, marginBottom: 4 }}>"{ex.en}"</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{ex.es}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MICRO DRILL */}
                    <div style={{ padding: 24, background: 'rgba(0,0,0,0.5)', borderRadius: 16, border: '1px solid var(--border)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '1px', marginBottom: 16 }}>
                            <Zap size={20} color="var(--warning)" /> SENSEI MICRO-DRILL
                        </h3>

                        <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>{coachFeedback.drill.prompt_es}</p>
                        <p style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600, marginBottom: 24 }}>{coachFeedback.drill.prompt_en}</p>

                        {!isDrillCorrect && (
                            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
                                {coachFeedback.drill.type === 'choose' && coachFeedback.drill.choices ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        {coachFeedback.drill.choices.map((choice: string) => (
                                            <button
                                                key={choice}
                                                onClick={() => {
                                                    setDrillAnswer(choice);
                                                }}
                                                className="btn"
                                                style={{
                                                    background: drillAnswer === choice ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                                                    border: drillAnswer === choice ? '1px solid var(--accent-glow)' : '1px solid var(--border)'
                                                }}
                                            >
                                                {choice}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        className="retro-input"
                                        placeholder="Tu respuesta..."
                                        value={drillAnswer}
                                        onChange={e => setDrillAnswer(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleDrillSubmit()}
                                    />
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                    <div>
                                        {isDrillCorrect === false && <span style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>Incorrecto. Intenta de nuevo.</span>}
                                        {drillAttempts > 1 && !isDrillCorrect && <span style={{ color: 'var(--warning)', fontSize: '0.9rem', marginLeft: 12 }}>Pista: La respuesta es "{coachFeedback.drill.answer}"</span>}
                                    </div>
                                    <button className="btn neon-border" style={{ padding: '12px 24px', width: 'auto' }} onClick={handleDrillSubmit}>
                                        VERIFY
                                    </button>
                                </div>
                            </div>
                        )}

                        {isDrillCorrect && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 20, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 12, color: 'var(--success)', border: '1px solid var(--success)' }}>
                                <CheckCircle size={28} />
                                <div>
                                    <strong style={{ display: 'block', fontSize: '1.1rem' }}>¡Excelente!</strong>
                                    <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Regla dominada. +10 XP</span>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {result.vocabLearned.length > 0 && (
                <motion.div variants={itemVariants} className="card glass-panel" style={{ borderColor: 'var(--accent-primary)', boxShadow: 'inset 0 0 20px rgba(139, 92, 246, 0.05)' }}>
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 24 }}>VOCAB EXFILTRATED</h2>
                    <div className="vocab-grid">
                        {result.vocabLearned.map((v, i) => (
                            <motion.div whileHover={{ scale: 1.05, y: -4 }} key={i} className="vocab-card glass-panel" style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                <div style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--accent-primary)', marginBottom: 8 }}>{v.word}</div>
                                <div style={{ color: 'var(--text-main)', fontSize: '1.05rem', marginBottom: 12, fontWeight: 600 }}>{v.meaning_es}</div>
                                <div style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>"{v.example_en}"</div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {isPerfect && (
                <motion.div variants={itemVariants} style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 24, borderRadius: 12, border: '1px solid var(--success)', textAlign: 'center', marginBottom: 32 }}>
                    <h3 style={{ color: 'var(--success)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>LOGS VERIFIED. NO ERRORS.</h3>
                    <p style={{ color: 'var(--text-main)', margin: 0, opacity: 0.8 }}>Proceed to dashboard or initiate next simulation.</p>
                </motion.div>
            )}

            {(() => {
                const adaptive = getAdaptiveProfile();
                const lastRec = adaptive.lastRecommendations[0];
                if (!lastRec || lastRec.score === undefined) return null;

                return (
                    <motion.div variants={itemVariants} className="card glass-panel neon-border" style={{ position: 'relative', overflow: 'hidden', padding: 32, marginBottom: 32 }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '50%', background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1))', pointerEvents: 'none' }} />

                        <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--accent-primary)', marginBottom: 20, fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <Brain size={28} /> AI COACH DIRECTIVE
                        </h2>
                        <p style={{ fontSize: '1.15rem', marginBottom: 24, lineHeight: 1.6, color: 'var(--text-main)', fontStyle: 'italic', borderLeft: '4px solid var(--accent-primary)', paddingLeft: 16 }}>
                            "{lastRec.message}"
                        </p>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px 20px', borderRadius: 12, flex: 1, minWidth: 150, border: '1px solid var(--border)' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 4, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>TARGET CLASS</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>CLASS {lastRec.difficulty}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px 20px', borderRadius: 12, flex: 1, minWidth: 150, border: '1px solid var(--border)' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 4, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>AUDIO PROFILE</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{lastRec.accent === 'en-GB' ? '🇬🇧 UK' : '🇺🇸 US'}</div>
                            </div>
                        </div>
                        {lastRec.sessionId && (
                            <Link to={`/area/${area.id}/session/${lastRec.sessionId}`} className="btn neon-border" style={{
                                width: '100%',
                                padding: '20px',
                                fontSize: '1.1rem',
                                background: 'var(--accent-primary)',
                                color: '#fff'
                            }}>
                                INITIATE RECOMMENDED SIMULATION
                            </Link>
                        )}
                    </motion.div>
                );
            })()}

            <motion.div variants={itemVariants} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Link to={`/area/${area.id}/practice`} className="btn neon-border" style={{ width: 'auto', flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                    RETURN TO DATABASE
                </Link>
                <Link to={`/area/${area.id}/progress`} className="btn" style={{ width: 'auto', flex: 1 }}>
                    VIEW TELEMETRY
                </Link>
                {import.meta.env.DEV && (
                    <Link to="/debug" className="btn" style={{ width: 'auto', background: 'transparent', border: '1px dashed var(--danger)', color: 'var(--danger)' }}>
                        DEBUG
                    </Link>
                )}
            </motion.div>
        </motion.div>
    );
}
