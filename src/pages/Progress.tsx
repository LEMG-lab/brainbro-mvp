import { Link, useOutletContext } from 'react-router-dom';
import { getHistory, getVocab, getAdaptiveProfile, getXp, getStreak, getBadges, getCognitiveProfile, getPressureLog, getCognitiveSessions, getWritingAttempts, getReadingAttempts, getSELAttempts } from '../lib/storage';
import { Target, TrendingUp, AlertTriangle, ArrowRight, BrainCircuit, Zap, Flame, Trophy, Award, Activity, Brain, BookOpen } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { computePressureLevel, type PressureLevel } from '../lib/cognitivePressureEngine';
import { analyzeDrift, type DriftAnalysis } from '../lib/cognitiveDriftEngine';
import { ALL_MODELS, MODEL_LABELS } from '../lib/mentalModelEngine';
import { THEME_LABELS as DL_THEME_LABELS } from '../lib/decisionLabEngine';
import { getWeakWords, countDueWords, getMasteredCount } from '../lib/vocabEngine';
import { getVocabProfile } from '../lib/storage';
import { childLS } from '../lib/childStorage';
import SparklineBars from '../components/SparklineBars';
import { getLedgerRange } from '../lib/storage';

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

export default function Progress() {
    const { area } = useOutletContext<{ area: any }>();
    const isEnglish = area.id === 'english';
    const history = getHistory().filter((h: any) => h.areaId === area.id || (isEnglish && !h.areaId));
    const vocabMap = getVocab();
    const xpData = getXp();
    const streak = getStreak();
    const badges = getBadges();
    const areaXp = xpData.byArea[area.id] || 0;

    const currentLevel = Math.floor(xpData.total / 200) + 1;

    let mathMasteryData: any = null;
    if (area.id === 'math') {
        try {
            const raw = childLS.getItem('brainbro_math_mastery_v1');
            if (raw) mathMasteryData = JSON.parse(raw);
        } catch (e) { }
    }

    const cogProfile = getCognitiveProfile();

    const totalSessions = history.length;
    const avgScore = totalSessions > 0
        ? Math.round((history.reduce((acc, h) => acc + (h.score / h.total), 0) / totalSessions) * 100)
        : 0;

    const allVocab = Object.values(vocabMap);
    const weakWords = allVocab.filter(v => (v.mistakesCount || 0) > 0).sort((a, b) => (b.mistakesCount || 0) - (a.mistakesCount || 0));
    const displayVocab = weakWords.length > 0 ? weakWords : allVocab.sort((a, b) => {
        return new Date(b.lastSeenDate || '').getTime() - new Date(a.lastSeenDate || '').getTime();
    });

    if (totalSessions === 0) {
        return (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="card glass-panel" style={{ textAlign: 'center', padding: 60, borderStyle: 'dashed', borderColor: 'var(--border)' }}>
                <motion.div variants={itemVariants}>
                    <Target size={64} color="var(--text-muted)" style={{ margin: '0 auto 24px', opacity: 0.5 }} />
                    <h1 style={{ fontSize: '2.5rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1px' }}>NO TELEMETRY</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: 16, marginBottom: 32 }}>Complete a simulation to establish baseline metrics.</p>
                    <Link to={`/area/${area.id}/practice`} className="btn neon-border" style={{ width: 'auto', padding: '16px 32px', fontSize: '1.1rem', background: 'var(--accent-primary)', color: '#fff' }}>
                        INITIATE PRACTICE
                    </Link>
                </motion.div>
            </motion.div>
        );
    }

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show">
            <motion.h1 variants={itemVariants} style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 32 }}>
                OPERATIONAL <span style={{ color: 'var(--accent-primary)', textShadow: '0 0 20px rgba(139, 92, 246, 0.4)' }}>METRICS</span>
            </motion.h1>

            {/* Phase 16.6: Mini Sparklines */}
            {(() => {
                const ledger14 = getLedgerRange(14).reverse();
                if (ledger14.length < 2) return null;
                return (
                    <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                        {[
                            { key: 'calibration', label: 'Calibration', invert: false },
                            { key: 'overconfidence', label: 'Overconf.', invert: true },
                            { key: 'meta', label: 'Meta', invert: false },
                            { key: 'followThrough', label: 'Follow-T', invert: false },
                        ].map(({ key, label, invert }) => {
                            const vals = ledger14.map((e: any) => e.metrics[key] ?? 0);
                            return (
                                <div key={key} style={{ background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6 }}>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                                    <SparklineBars values={vals} height={16} invertColor={invert} />
                                </div>
                            );
                        })}
                    </motion.div>
                );
            })()}

            <motion.div variants={itemVariants} className="card glass-panel neon-border" style={{ marginBottom: 32, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1))', pointerEvents: 'none' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <BrainCircuit color="var(--accent-primary)" size={32} style={{ filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.5))' }} />
                    <h3 style={{ color: 'var(--accent-primary)', margin: 0, fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>COACH PROTOCOL</h3>
                </div>

                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px 24px', borderRadius: 16, flex: 1, minWidth: 200, border: '1px solid var(--border)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>TARGET DIFFICULTY</div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            CLASS {getAdaptiveProfile().currentDifficulty} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ 5</span>
                        </div>
                    </div>
                    {isEnglish && (
                        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px 24px', borderRadius: 16, flex: 1, minWidth: 200, border: '1px solid var(--border)' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>AUDIO PROFILE</div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>{getAdaptiveProfile().preferredAccent === 'en-GB' ? '🇬🇧 UK' : '🇺🇸 US'}</div>
                        </div>
                    )}
                </div>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 40 }}>
                <motion.div variants={itemVariants} className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 0, borderColor: 'var(--warning)', boxShadow: 'inset 0 0 20px rgba(245, 158, 11, 0.05)' }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: 20, borderRadius: 12, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        <Zap size={36} color="var(--warning)" style={{ filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.5))' }} />
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>TOTAL {area.name.toUpperCase()} XP</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--warning)', textShadow: '0 0 15px rgba(245, 158, 11, 0.3)' }}>{areaXp}</div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 0 }}>
                    <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: 20, borderRadius: 12, border: '1px solid rgba(79, 70, 229, 0.3)' }}>
                        <TrendingUp size={36} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 10px rgba(79, 70, 229, 0.5))' }} />
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>AVG ACCURACY</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{avgScore}%</div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 0 }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 20, borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <Target size={36} color="var(--success)" style={{ filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.5))' }} />
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>WORDS EXTRACTED</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{allVocab.length}</div>
                    </div>
                </motion.div>
            </div>

            <motion.div variants={itemVariants} className="card glass-panel" style={{ borderColor: weakWords.length > 0 ? 'var(--danger)' : 'var(--border)', boxShadow: weakWords.length > 0 ? 'inset 0 0 20px rgba(244, 63, 94, 0.05)' : 'none' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, color: weakWords.length > 0 ? 'var(--danger)' : 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <AlertTriangle color={weakWords.length > 0 ? "var(--danger)" : "var(--primary)"} size={24} />
                    {weakWords.length > 0 ? "CRITICAL WEAKNESSES" : "RECENT TARGETS"}
                </h2>

                {displayVocab.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', background: 'rgba(0,0,0,0.3)', padding: 24, borderRadius: 12 }}>No targets logged yet.</p>
                ) : (
                    <div className="vocab-grid">
                        {displayVocab.slice(0, 12).map((v, i) => (
                            <motion.div whileHover={{ scale: 1.05 }} key={i} className="vocab-card glass-panel" style={{
                                background: (v.mistakesCount || 0) > 0 ? 'rgba(244, 63, 94, 0.05)' : 'rgba(0,0,0,0.3)',
                                border: (v.mistakesCount || 0) > 0 ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid var(--border)',
                                borderLeft: (v.mistakesCount || 0) > 0 ? '4px solid var(--danger)' : '4px solid var(--primary)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div style={{ fontWeight: 900, fontSize: '1.2rem', color: (v.mistakesCount || 0) > 0 ? 'var(--danger)' : 'var(--primary)' }}>{v.word}</div>
                                    {(v.mistakesCount || 0) > 0 && (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 800, background: 'rgba(244, 63, 94, 0.1)', padding: '4px 8px', borderRadius: 6 }}>
                                            MISSES: {v.mistakesCount}
                                        </span>
                                    )}
                                </div>
                                <div style={{ color: 'var(--text-main)', fontSize: '1.05rem', marginBottom: 12, fontWeight: 600 }}>{v.meaning_es}</div>
                                <div style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-muted)' }}>"{v.example_en}"</div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* ─── Cognitive Edge Metrics ─── */}
            <motion.div variants={itemVariants} className="card glass-panel" style={{ marginTop: 40, borderColor: 'rgba(139, 92, 246, 0.3)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-primary), var(--danger), var(--accent-glow))' }} />
                <h2 style={{ marginBottom: 24, fontSize: '1.8rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-main)' }}>
                    <Brain color="var(--accent-glow)" /> COGNITIVE EDGE
                    {cogProfile && cogProfile.sessionsCount > 0 && (() => {
                        const pLevel: PressureLevel = computePressureLevel(cogProfile);
                        const colors: Record<PressureLevel, string> = { low: 'var(--success)', normal: 'var(--text-muted)', high: 'var(--warning)', elite: 'var(--danger)' };
                        return <span style={{ fontSize: '0.7rem', padding: '4px 12px', borderRadius: 10, background: `${colors[pLevel]}22`, color: colors[pLevel], fontWeight: 700, marginLeft: 'auto' }}>{pLevel.toUpperCase()}</span>;
                    })()}
                </h2>
                {cogProfile && cogProfile.sessionsCount > 0 ? (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Calibration</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: cogProfile.calibration >= 70 ? 'var(--success)' : cogProfile.calibration >= 40 ? 'var(--warning)' : 'var(--danger)' }}>{cogProfile.calibration}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>EWMA / {cogProfile.sessionsCount} sessions</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Overconfidence</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: cogProfile.overconfidence <= 0.1 ? 'var(--success)' : cogProfile.overconfidence <= 0.3 ? 'var(--warning)' : 'var(--danger)' }}>{Math.round(cogProfile.overconfidence * 100)}%</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Reflection</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: cogProfile.reflection >= 0.7 ? 'var(--success)' : cogProfile.reflection >= 0.4 ? 'var(--warning)' : 'var(--danger)' }}>{Math.round(cogProfile.reflection * 100)}%</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Reasoning Quality</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: (cogProfile.reasoningQualityEwma ?? 0) >= 3 ? 'var(--success)' : (cogProfile.reasoningQualityEwma ?? 0) >= 2 ? 'var(--warning)' : 'var(--danger)' }}>{(cogProfile.reasoningQualityEwma ?? 0).toFixed(1)}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/5</span></div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Ambiguity Tolerance</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: (cogProfile.ambiguityEwma ?? 0) >= 60 ? 'var(--success)' : (cogProfile.ambiguityEwma ?? 0) >= 40 ? 'var(--warning)' : 'var(--danger)' }}>{cogProfile.ambiguityEwma ?? 0}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/100</span></div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Meta-Cognition</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: (cogProfile.metaCognitionEwma ?? 0) >= 3 ? 'var(--success)' : (cogProfile.metaCognitionEwma ?? 0) >= 2 ? 'var(--warning)' : 'var(--danger)' }}>{(cogProfile.metaCognitionEwma ?? 0).toFixed(1)}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/5</span></div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Adversarial Pass</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: (cogProfile.adversarialPassEwma ?? 0) >= 0.7 ? 'var(--success)' : (cogProfile.adversarialPassEwma ?? 0) >= 0.4 ? 'var(--warning)' : 'var(--danger)' }}>{Math.round((cogProfile.adversarialPassEwma ?? 0) * 100)}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>%</span></div>
                            </div>
                        </div>

                        {/* Phase 14.8: Decision Lab Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Decision Lab EWMA</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: (cogProfile.decisionLabEwma ?? 0) >= 3 ? 'var(--success)' : (cogProfile.decisionLabEwma ?? 0) >= 2 ? 'var(--warning)' : 'var(--danger)' }}>{(cogProfile.decisionLabEwma ?? 0).toFixed(1)}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/5</span></div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Labs Completed</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{cogProfile.decisionLabsCompleted ?? 0}</div>
                            </div>
                        </div>
                        {(() => {
                            const dlLabs = JSON.parse(childLS.getItem('brainbro_decision_labs_v1') || '[]').slice(0, 3);
                            if (dlLabs.length === 0) return null;
                            return (
                                <div style={{ marginTop: 14 }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Recent Labs</div>
                                    {dlLabs.map((l: any, i: number) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, marginBottom: 4, fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>{DL_THEME_LABELS[l.theme as keyof typeof DL_THEME_LABELS] || l.theme}</span>
                                            <span style={{ color: l.score >= 3 ? 'var(--success)' : l.score >= 2 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>{l.score}/5</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                        {(() => {
                            const pLog = getPressureLog().slice(0, 5);
                            if (pLog.length === 0) return null;
                            const pColors: Record<string, string> = { low: 'var(--success)', normal: 'var(--text-muted)', high: 'var(--warning)', elite: 'var(--danger)' };
                            return (
                                <div style={{ marginTop: 20 }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 10 }}>Pressure History (last 5)</div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {pLog.map((p, i) => (
                                            <span key={i} style={{ padding: '4px 12px', borderRadius: 12, background: `${pColors[p.level] || 'var(--text-muted)'}22`, color: pColors[p.level] || 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>{p.level.toUpperCase()}</span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem', background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 12 }}>Complete a session to generate cognitive metrics.</p>
                )}
            </motion.div>

            {/* Phase 14.9: Vocab Progress */}
            {(() => {
                const vp = getVocabProfile();
                if (!vp || Object.keys(vp.words).length === 0) return null;
                const weak = getWeakWords(vp, 15);
                const dueCount = countDueWords(vp, Date.now());
                const mastered = getMasteredCount(vp);
                const totalWords = Object.keys(vp.words).length;
                return (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 28 }}>
                        <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-glow)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BookOpen size={20} /> Vocabulario
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 6 }}>Due Today</div>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: dueCount > 0 ? 'var(--warning)' : 'var(--success)' }}>{dueCount}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 6 }}>Mastered</div>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--success)' }}>{mastered}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 6 }}>Total</div>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{totalWords}</div>
                            </div>
                        </div>
                        {weak.length > 0 && (
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 10 }}>Weak Words</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {weak.map(w => (
                                        <span key={w.id} style={{ padding: '4px 10px', borderRadius: 8, background: w.mastery <= 1 ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.12)', color: w.mastery <= 1 ? 'var(--danger)' : 'var(--warning)', fontSize: '0.8rem', fontWeight: 600 }}>{w.word} <span style={{ opacity: 0.6 }}>({w.wrongCount}✗)</span></span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                );
            })()}

            {/* Phase 14.4: Cognitive Drift Status */}
            {cogProfile && cogProfile.sessionsCount >= 3 && (() => {
                const drift: DriftAnalysis = analyzeDrift(getCognitiveSessions().slice(0, 10), cogProfile);
                const statusLabel = drift.gamingDetected ? 'Gaming Detected' : drift.regressionDetected ? 'Regression' : drift.plateauDetected ? 'Plateau' : 'Stable';
                const statusColor = drift.gamingDetected ? 'var(--danger)' : drift.regressionDetected ? 'var(--danger)' : drift.plateauDetected ? 'var(--warning)' : 'var(--success)';
                const recLabels: Record<string, string> = { escalate: 'Escalate pressure', stabilize: 'Maintain current level', intensify_models: 'Intensify mental models', increase_uncertainty: 'Increase uncertainty exposure' };
                return (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ marginTop: 24, borderColor: `${statusColor}44`, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: statusColor }} />
                        <h2 style={{ marginBottom: 16, fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-main)' }}>
                            <AlertTriangle color={statusColor} size={22} /> COGNITIVE DRIFT
                            <span style={{ fontSize: '0.7rem', padding: '4px 12px', borderRadius: 10, background: `${statusColor}22`, color: statusColor, fontWeight: 700, marginLeft: 'auto' }}>{statusLabel}</span>
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>Drift Score</div>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: drift.driftScore <= 20 ? 'var(--success)' : drift.driftScore <= 50 ? 'var(--warning)' : 'var(--danger)' }}>{drift.driftScore}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/100</span></div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>Recommendation</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: statusColor, marginTop: 8 }}>{recLabels[drift.recommendation] || drift.recommendation}</div>
                            </div>
                        </div>
                    </motion.div>
                );
            })()}

            {/* Phase 14.5: Mental Model Distribution */}

            {/* Phase 15.8: Writing */}
            {(() => {
                const wAttempts = getWritingAttempts();
                const wEwma = cogProfile?.writingEwma ?? 0;
                if (wAttempts.length === 0 && !wEwma) return null;
                return (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ marginTop: 24, borderColor: 'rgba(168,85,247,0.3)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'rgb(168,85,247)' }} />
                        <h2 style={{ marginBottom: 16, fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-main)' }}>
                            ✍️ WRITING & ARGUMENTATION
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: wAttempts.length > 0 ? 16 : 0 }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Writing EWMA</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: wEwma >= 3 ? 'var(--success)' : wEwma >= 2 ? 'var(--warning)' : 'var(--danger)' }}>{wEwma.toFixed(1)}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/5</span></div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Completed</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{cogProfile?.writingCompleted ?? 0}</div>
                            </div>
                        </div>
                        {wAttempts.length > 0 && (
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Recent Attempts</div>
                                {wAttempts.slice(0, 3).map((a: any, i: number) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, marginBottom: 4, fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{new Date(a.createdAt).toLocaleDateString()}</span>
                                        <span style={{ color: a.scores.total >= 15 ? 'var(--success)' : a.scores.total >= 10 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>{a.scores.total}/25 ({a.mode})</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                );
            })()}

            {/* Phase 15.9: Reading */}
            {(() => {
                const rAttempts = getReadingAttempts();
                const rEwma = cogProfile?.readingEwma ?? 0;
                if (rAttempts.length === 0 && !rEwma) return null;
                return (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ marginTop: 24, borderColor: 'rgba(14,165,233,0.3)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'rgb(14,165,233)' }} />
                        <h2 style={{ marginBottom: 16, fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-main)' }}>
                            📖 READING & FACT CHECKING
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: rAttempts.length > 0 ? 16 : 0 }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Reading EWMA</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: rEwma >= 3 ? 'var(--success)' : rEwma >= 2 ? 'var(--warning)' : 'var(--danger)' }}>{rEwma.toFixed(1)}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/5</span></div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Completed</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'rgb(14,165,233)' }}>{cogProfile?.readingCompleted ?? 0}</div>
                            </div>
                        </div>
                        {rAttempts.length > 0 && (
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Recent Attempts</div>
                                {rAttempts.slice(0, 3).map((a: any, i: number) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, marginBottom: 4, fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{new Date(a.createdAt).toLocaleDateString()}</span>
                                        <span style={{ color: a.score >= 4 ? 'var(--success)' : a.score >= 2 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>{a.score}/5 ({a.mode})</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                );
            })()}

            {/* Phase 16.0: SEL */}
            {(() => {
                const sAttempts = getSELAttempts();
                const sEwma = cogProfile?.selEwma ?? 0;
                if (sAttempts.length === 0 && !sEwma) return null;
                return (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ marginTop: 24, borderColor: 'rgba(168,85,247,0.3)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'rgb(168,85,247)' }} />
                        <h2 style={{ marginBottom: 16, fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-main)' }}>
                            💜 SOCIAL-EMOTIONAL & ETHICS
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: sAttempts.length > 0 ? 16 : 0 }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>SEL EWMA</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: sEwma >= 3 ? 'var(--success)' : sEwma >= 2 ? 'var(--warning)' : 'var(--danger)' }}>{sEwma.toFixed(1)}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/5</span></div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Completed</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'rgb(168,85,247)' }}>{cogProfile?.selCompleted ?? 0}</div>
                            </div>
                        </div>
                        {sAttempts.length > 0 && (
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 8 }}>Recent Attempts</div>
                                {sAttempts.slice(0, 3).map((a: any, i: number) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, marginBottom: 4, fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{a.theme} · {new Date(a.createdAt).toLocaleDateString()}</span>
                                        <span style={{ color: a.score >= 4 ? 'var(--success)' : a.score >= 2 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>{a.score}/5 ({a.mode})</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                );
            })()}
            {cogProfile && cogProfile.modelCounts && Object.keys(cogProfile.modelCounts).length > 0 && (
                <motion.div variants={itemVariants} className="card glass-panel" style={{ marginTop: 24, borderColor: 'rgba(34,197,94,0.3)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--success)' }} />
                    <h2 style={{ marginBottom: 16, fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-main)' }}>
                        <BrainCircuit color="var(--success)" size={22} /> MENTAL MODELS
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                        {ALL_MODELS.map(m => {
                            const count = cogProfile.modelCounts?.[m] || 0;
                            return (
                                <div key={m} style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{MODEL_LABELS[m]}</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: count > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {
                area.id === 'math' && mathMasteryData && mathMasteryData.byTag && Object.keys(mathMasteryData.byTag).length > 0 && (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ marginTop: 40, borderColor: 'var(--accent-primary)', marginBottom: 40 }}>
                        <h2 style={{ marginBottom: 24, fontSize: '1.8rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-main)' }}>
                            <Activity color="var(--accent-glow)" /> MATH MASTERY (TIER 1)
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                            {Object.entries(mathMasteryData.byTag)
                                .sort((a: any, b: any) => (a[1].wins / (a[1].attempts || 1)) - (b[1].wins / (b[1].attempts || 1)))
                                .map(([tag, data]: [string, any]) => (
                                    <div key={tag} style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '1.2rem', color: 'var(--text-main)', textTransform: 'capitalize' }}>{tag.replace('_', ' ')}</div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: data.wins === data.attempts && data.attempts > 0 ? 'var(--success)' : 'var(--warning)' }}>
                                                {data.wins} / {data.attempts} WINS
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {Math.round((data.wins / (data.attempts || 1)) * 100)}% ACCURACY
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </motion.div>
                )
            }

            <motion.div variants={itemVariants} style={{ marginTop: 40 }}>
                <h2 style={{ marginBottom: 24, fontSize: '2rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Trophy color="var(--warning)" /> GLOBAL METRICS
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 32 }}>
                    <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 24, margin: 0 }}>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: 20, borderRadius: 12, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                            <Zap size={36} color="var(--warning)" style={{ filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.5))' }} />
                        </div>
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>TOTAL XP / LEVEL</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--warning)', textShadow: '0 0 15px rgba(245, 158, 11, 0.3)' }}>
                                {xpData.total} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ LVL {currentLevel}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 24, margin: 0 }}>
                        <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: 20, borderRadius: 12, border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                            <Flame size={36} color="var(--danger)" style={{ filter: 'drop-shadow(0 0 10px rgba(244, 63, 94, 0.5))' }} />
                        </div>
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>STREAK (CURRENT / BEST)</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--danger)', textShadow: '0 0 15px rgba(244, 63, 94, 0.3)' }}>
                                {streak.current} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ BEST: {streak.best}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card glass-panel" style={{ marginBottom: 40 }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <Award color="var(--accent-primary)" size={24} />
                        ACQUIRED BADGES
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                        {badges.length > 0 ? badges.map((badge, i) => (
                            <div key={i} className="badge neon-border" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--text-main)', fontSize: '1.1rem', padding: '12px 24px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 15px rgba(139, 92, 246, 0.2)' }}>
                                <Award size={18} color="var(--accent-primary)" /> {badge}
                            </div>
                        )) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No badges acquired yet. Complete missions to unlock!</p>
                        )}
                    </div>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="card glass-panel" style={{ marginTop: 40 }}>
                <h2 style={{ marginBottom: 24, textTransform: 'uppercase', letterSpacing: '1px' }}>SIMULATION HISTORY</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {history.map((h, i) => (
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                            key={h.id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '20px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--border)',
                                borderRadius: 16,
                                transition: 'all 0.2s'
                            }}
                            whileHover={{ background: 'rgba(139, 92, 246, 0.1)', borderColor: 'var(--accent-primary)', scale: 1.01 }}
                        >
                            <div>
                                <h4 style={{ marginBottom: 6, fontSize: '1.2rem', color: 'var(--text-main)' }}>{h.topic}</h4>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{h.date}</div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                                <div style={{
                                    fontWeight: 900,
                                    color: h.score === h.total ? 'var(--success)' : 'var(--accent-primary)',
                                    fontSize: '1.4rem',
                                    background: h.score === h.total ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                    padding: '4px 12px',
                                    borderRadius: 8
                                }}>
                                    {h.score}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>/{h.total}</span>
                                </div>
                                <Link to={`/area/${area.id}/review/${h.id}`} style={{
                                    color: 'var(--text-main)',
                                    fontWeight: 800,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}>
                                    INSPECT <ArrowRight size={14} />
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </motion.div >
    );
}
