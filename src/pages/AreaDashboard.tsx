import { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { getHistory, getVocab, getAdaptiveProfile, saveCustomSession, getMissions } from '../lib/storage';
import { PlayCircle, Target, ArrowRight, BookOpen, BrainCircuit, Wand2, Loader2, KeyRound, Flag } from 'lucide-react';
import { generateSession } from '../lib/gemini';
import { getTodayMission } from '../lib/missionEngine';
import { motion, Variants } from 'framer-motion';

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

export default function AreaDashboard() {
    const navigate = useNavigate();
    const { area } = useOutletContext<{ area: any }>();
    const isEnglish = area.id === 'english';

    const history = getHistory().filter((h: any) => h.areaId === area.id || (isEnglish && !h.areaId));
    const vocabMap = getVocab();

    const mission = getTodayMission();
    const missionsData = getMissions();
    const isMissionReady = mission.areaId === area.id && !(missionsData?.completedMissionIds?.includes(mission.id));
    const [isGenerating, setIsGenerating] = useState(false);
    const [topicInput, setTopicInput] = useState('');
    const [genError, setGenError] = useState('');

    const totalSessions = history.length;
    const avgScore = totalSessions > 0
        ? Math.round((history.reduce((acc, h) => acc + (h.score / h.total), 0) / totalSessions) * 100)
        : 0;

    const allVocab = Object.values(vocabMap);
    const weakWords = allVocab.filter(v => (v.mistakesCount || 0) > 0);
    const weakWordsCount = weakWords.length;

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
                <Link to="/" style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'inline-block', marginBottom: 16 }}>
                    ← Back to Training Arenas
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                    <h1 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
                        {area.name}
                    </h1>
                    {isMissionReady && (
                        <span className="badge" style={{ background: 'var(--danger)', color: 'white', display: 'flex', alignItems: 'center', gap: 6, margin: 0, padding: '6px 16px', fontSize: '1rem', border: 'none', boxShadow: '0 0 15px var(--danger)' }}>
                            <Flag size={16} /> MISSION READY
                        </span>
                    )}
                </div>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>{area.description}</p>
            </motion.div>

            <motion.div variants={itemVariants} className="card glass-panel" style={{ marginBottom: 32, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -30, left: -30, width: 100, height: 100, background: 'var(--accent-primary)', filter: 'blur(50px)', borderRadius: '50%', opacity: 0.2, pointerEvents: 'none' }} />
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, color: 'var(--text-main)', fontWeight: 800 }}>
                    <Wand2 color="var(--accent-primary)" /> AI GENERATOR
                </h2>
                {!import.meta.env.VITE_GEMINI_API_KEY ? (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: 16, borderRadius: 8, border: '1px solid var(--danger)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <KeyRound color="var(--danger)" style={{ flexShrink: 0, marginTop: 4 }} />
                        <div>
                            <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: 4 }}>API Key Required</strong>
                            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem' }}>Set <code style={{ background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4 }}>VITE_GEMINI_API_KEY</code> in your <code style={{ background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4 }}>.env.local</code> file and restart the dev server to enable session generation.</p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Deploy an AI-crafted training module strictly adapted to your parameters.</p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="Target parameters (e.g. Protocol 7, Space Trade)..."
                                value={topicInput}
                                onChange={e => setTopicInput(e.target.value)}
                                style={{ flex: 1, minWidth: 200, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', color: 'var(--text-main)' }}
                                disabled={isGenerating}
                            />
                            <button
                                className="btn neon-border"
                                style={{ width: 'auto', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 15px var(--accent-glow)' }}
                                onClick={async () => {
                                    if (isGenerating) return;
                                    setIsGenerating(true);
                                    setGenError('');
                                    try {
                                        const adaptive = getAdaptiveProfile();
                                        const session = await generateSession({
                                            areaId: area.id,
                                            topic: topicInput,
                                            difficulty: adaptive.currentDifficulty,
                                            accent: isEnglish ? adaptive.preferredAccent : undefined,
                                            vocabList: isEnglish ? weakWords.map(w => w.word) : []
                                        });
                                        saveCustomSession(session);
                                        navigate(`/area/${area.id}/session/${session.id}`);
                                    } catch (err: any) {
                                        setGenError(err.message || 'Generation failed');
                                    } finally {
                                        setIsGenerating(false);
                                    }
                                }}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <Loader2 className="spinner" size={18} /> : <Wand2 size={18} />}
                                {isGenerating ? 'INITIALIZING...' : 'GENERATE AI SESSION'}
                            </button>
                        </div>
                        {genError && (
                            <p style={{ color: 'var(--danger)', marginTop: 12, fontSize: '0.9rem', fontWeight: 600 }}>{genError}</p>
                        )}
                    </div>
                )}
            </motion.div>

            <motion.div variants={itemVariants} className="card glass-panel neon-border" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -30, bottom: -30, width: 150, height: 150, background: 'var(--success)', filter: 'blur(60px)', borderRadius: '50%', opacity: 0.1, pointerEvents: 'none' }} />
                {history.length > 0 ? (() => {
                    const adaptive = getAdaptiveProfile();
                    const lastRec = adaptive.lastRecommendations[0];
                    return (
                        <>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, fontWeight: 800 }}>
                                <BrainCircuit color="var(--success)" /> ACTION PLAN: PHASE 1
                            </h2>
                            <p style={{ color: 'var(--text-main)', marginBottom: 24, fontSize: '1.1rem' }}>
                                System recommends a <strong>Level {adaptive.currentDifficulty}</strong> operation. {isEnglish ? `Target Accent: ${adaptive.preferredAccent === 'en-GB' ? '🇬🇧 UK' : '🇺🇸 US'}.` : ''}
                            </p>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                {lastRec && lastRec.sessionId ? (
                                    <Link to={`/area/${area.id}/session/${lastRec.sessionId}`} className="btn" style={{ width: 'auto', padding: '16px 32px', background: 'var(--success)', color: '#000', fontWeight: 800 }}>
                                        EXECUTE PLAN <PlayCircle size={20} />
                                    </Link>
                                ) : (
                                    <Link to={`/area/${area.id}/practice`} className="btn" style={{ width: 'auto', padding: '16px 32px', background: 'var(--success)', color: '#000', fontWeight: 800 }}>
                                        RESUME OPERATIONS <PlayCircle size={20} />
                                    </Link>
                                )}
                            </div>
                        </>
                    );
                })() : (
                    <>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, fontWeight: 800 }}>
                            <BookOpen color="var(--success)" /> INITIATION SEQUENCE
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '1.1rem' }}>
                            Complete your first training session to calibrate the AI coach.
                        </p>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <Link to={`/area/${area.id}/practice`} className="btn" style={{ width: 'auto', padding: '16px 32px', background: 'var(--success)', color: '#000', fontWeight: 800, boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' }}>
                                INITIATE FIRST RUN <PlayCircle size={20} />
                            </Link>
                        </div>
                    </>
                )}
            </motion.div>

            <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 40, marginTop: 40 }}>
                <div className="stat-box glass-panel" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="stat-val" style={{ color: 'var(--text-main)', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>{totalSessions}</div>
                    <div className="stat-label">OPERATIONS</div>
                </div>
                <div className="stat-box glass-panel" style={{ border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div className="stat-val" style={{ color: 'var(--success)', textShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}>{avgScore}%</div>
                    <div className="stat-label">ACCURACY</div>
                </div>
                {isEnglish && (
                    <div className="stat-box glass-panel" style={{ border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                        <div className="stat-val" style={{ color: 'var(--danger)', textShadow: '0 0 10px rgba(244, 63, 94, 0.4)' }}>{weakWordsCount > 0 ? weakWordsCount : allVocab.length}</div>
                        <div className="stat-label">{weakWordsCount > 0 ? 'WEAK TARGETS' : 'WORDS ACQUIRED'}</div>
                    </div>
                )}
            </motion.div>

            <motion.div variants={itemVariants}>
                {history.length > 0 ? (
                    <div>
                        <h3 style={{ marginBottom: 16, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Latest After Action Report</h3>
                        <div className="card glass-panel" style={{ padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ marginBottom: 4, fontSize: '1.2rem', color: 'var(--text-main)' }}>{history[0].topic}</h4>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{history[0].date} // SCORE: <span style={{ color: 'var(--success)' }}>{history[0].score}/{history[0].total}</span></div>
                                </div>
                                <Link to={`/area/${area.id}/review/${history[0].id}`} className="btn" style={{ width: 'auto', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                                    VIEW LOGS <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="card glass-panel" style={{ textAlign: 'center', padding: 40, borderStyle: 'dashed', borderColor: 'var(--border)' }}>
                        <Target size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 16px' }} />
                        <h3 style={{ color: 'var(--text-muted)' }}>AWAITING DATA</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: 8, opacity: 0.6 }}>Systems offline until first operation is complete.</p>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
