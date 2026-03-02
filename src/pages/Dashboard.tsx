import { Link, useNavigate } from 'react-router-dom';
import { growthAreas } from '../data/growthAreas';
import { BookOpen, Bug, Lock, Flame, Star, Zap, CheckCircle, Circle, Play, Timer, SkipForward } from 'lucide-react';
import { getTodayMission } from '../lib/missionEngine';
import { getStreak, getXp, getMissions, getOnboarding, saveOnboarding, getProfile, saveProfile, getWeeklyProgramConfig, getDailyPlan, saveDailyPlan, startDailyPlanItem, completeDailyPlanItem, updateActionStep } from '../lib/storage';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ProfileData, DailyPlan } from '../types';
import { generateDailyPlan, getDateKey } from '../lib/programEngine';
import WritingLab from '../components/WritingLab';
import ReadingLab from '../components/ReadingLab';
import SELLab from '../components/SELLab';
import { getContractWeekKey } from '../lib/contractEngine';
import { getGoalContract, saveGoalContract, saveWeeklyProgramConfig } from '../lib/storage';
import { getActiveAgeBand } from '../lib/safetyPolicy';
import { getFocusMode, setFocusMode, trackSessionStart, trackSessionComplete, saveDailyReflection } from '../lib/launchAnalytics';

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

export default function Dashboard() {
    const navigate = useNavigate();

    // Phase 15.5: Autopilot today's plan
    const [plan, setPlan] = useState<DailyPlan | null>(null);
    const programCfg = getWeeklyProgramConfig();
    const [focusMode, setFocusModeState] = useState(getFocusMode());
    const [showCompletion, setShowCompletion] = useState(false);
    const [ritualText, setRitualText] = useState('');

    useEffect(() => {
        if (!programCfg || !programCfg.enabled) { setPlan(null); return; }
        const now = Date.now();
        const existing = getDailyPlan();
        const sixHours = 6 * 3600000;
        if (existing && existing.dateKey === getDateKey(now) && (now - existing.generatedAt) < sixHours) {
            setPlan(existing);
        } else {
            const newPlan = generateDailyPlan({ now, cfg: programCfg });
            if (newPlan) { saveDailyPlan(newPlan); setPlan(newPlan); }
        }
    }, []);
    const mission = getTodayMission();
    const streak = getStreak();
    const xp = getXp();
    const missionsData = getMissions();
    const isCompleted = missionsData?.completedMissionIds?.includes(mission.id) || false;

    const [onboarding, setOnboarding] = useState(getOnboarding());
    const [modalStep, setModalStep] = useState(onboarding.step || 1);

    const [profile, setProfile] = useState<ProfileData | null>(getProfile());
    const [profileStep, setProfileStep] = useState(1);
    const [tempProfile, setTempProfile] = useState<Partial<ProfileData>>({
        name: '',
        age: 14,
        interests: [],
        goal: 'skills',
        coachStyle: 'friendly',
        dailyMinutes: 10
    });

    const finishOnboarding = () => {
        const newData = { completed: true, step: 3 };
        saveOnboarding(newData);
        setOnboarding(newData);
    };

    const finishProfile = (skip: boolean = false) => {
        if (skip) {
            const defaultProfile: ProfileData = {
                name: 'Agent',
                age: 14,
                interests: ['gaming', 'tech'],
                goal: 'skills',
                coachStyle: 'friendly',
                dailyMinutes: 10
            };
            saveProfile(defaultProfile);
            setProfile(defaultProfile);
        } else {
            const finalProfile = tempProfile as ProfileData;
            if (!finalProfile.name) finalProfile.name = 'Agent';
            saveProfile(finalProfile);
            setProfile(finalProfile);
        }
    };


    const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        e.currentTarget.style.transform = `perspective(1000px) rotateX(${- y / 15}deg) rotateY(${x / 15}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.currentTarget.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ position: 'relative' }}>
            <AnimatePresence>
                {!onboarding.completed && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="card glass-panel neon-border"
                            style={{ maxWidth: 500, width: '90%', padding: 40, textAlign: 'center', background: 'var(--bg-secondary)' }}
                        >
                            {modalStep === 1 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <div style={{ background: 'var(--accent-primary)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 30px var(--accent-glow)' }}>
                                        <Zap size={32} color="#fff" />
                                    </div>
                                    <h2 style={{ fontSize: '2rem', marginBottom: 16 }}>Welcome to BrainBro</h2>
                                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: 32 }}>Step 1: Pick Today's Mission to start your daily training.</p>
                                    <button className="btn" onClick={() => setModalStep(2)}>Next ➔</button>
                                </motion.div>
                            )}
                            {modalStep === 2 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <div style={{ background: 'var(--warning)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 30px rgba(245, 158, 11, 0.5)' }}>
                                        <BookOpen size={32} color="#fff" />
                                    </div>
                                    <h2 style={{ fontSize: '2rem', marginBottom: 16 }}>Solve & Answer</h2>
                                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: 32 }}>Step 2: Read or listen carefully. Submit all answers to transmit your logs.</p>
                                    <button className="btn" onClick={() => setModalStep(3)}>Next ➔</button>
                                </motion.div>
                            )}
                            {modalStep === 3 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <div style={{ background: 'var(--success)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)' }}>
                                        <Flame size={32} color="#fff" />
                                    </div>
                                    <h2 style={{ fontSize: '2rem', marginBottom: 16 }}>Earn XP & Streaks</h2>
                                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: 32 }}>Step 3: Level up your global rank and collect badges.</p>
                                    <button className="btn" style={{ background: 'var(--success)', color: '#000' }} onClick={finishOnboarding}>Start My First Mission</button>
                                </motion.div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: modalStep === i ? 'var(--accent-primary)' : 'var(--border)', transition: 'all 0.3s' }} />
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {onboarding.completed && !profile && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="card glass-panel neon-border"
                            style={{ maxWidth: 500, width: '90%', padding: 40, background: 'var(--bg-secondary)', position: 'relative' }}
                        >
                            <h2 style={{ fontSize: '1.8rem', marginBottom: 24, textAlign: 'center' }}>Quick Setup ({profileStep}/5)</h2>

                            {profileStep === 1 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-main)', fontSize: '1.1rem' }}>Operator Name</label>
                                    <input type="text" className="search-input" style={{ width: '100%', marginBottom: 24, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: '#fff', padding: 12, borderRadius: 8 }} placeholder="Enter name" value={tempProfile.name || ''} onChange={e => setTempProfile({ ...tempProfile, name: e.target.value })} />

                                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-main)', fontSize: '1.1rem' }}>Age</label>
                                    <input type="number" className="search-input" style={{ width: '100%', marginBottom: 32, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: '#fff', padding: 12, borderRadius: 8 }} value={tempProfile.age || 14} onChange={e => setTempProfile({ ...tempProfile, age: parseInt(e.target.value) })} />
                                    <button className="btn" style={{ width: '100%' }} onClick={() => setProfileStep(2)}>Next ➔</button>
                                </motion.div>
                            )}

                            {profileStep === 2 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-main)', fontSize: '1.1rem' }}>What are your interests?</label>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Select a few to personalize your missions.</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
                                        {['gaming', 'sports', 'music', 'tech', 'science', 'history', 'art'].map(interest => {
                                            const isSelected = tempProfile.interests?.includes(interest);
                                            return (
                                                <button key={interest}
                                                    onClick={() => {
                                                        const ints = tempProfile.interests || [];
                                                        setTempProfile({ ...tempProfile, interests: isSelected ? ints.filter(i => i !== interest) : [...ints, interest] });
                                                    }}
                                                    style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'} `, background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize' }}
                                                >
                                                    {interest}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button className="btn" style={{ width: '100%' }} onClick={() => setProfileStep(3)}>Next ➔</button>
                                </motion.div>
                            )}

                            {profileStep === 3 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <label style={{ display: 'block', marginBottom: 16, color: 'var(--text-main)', fontSize: '1.1rem' }}>Main Goal</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                                        {[
                                            { id: 'exam', label: 'Exam Prep (Formal)' },
                                            { id: 'school', label: 'School Support' },
                                            { id: 'skills', label: 'Real-world Skills' }
                                        ].map(target => (
                                            <button key={target.id}
                                                onClick={() => setTempProfile({ ...tempProfile, goal: target.id as any })}
                                                style={{ textAlign: 'left', padding: 16, borderRadius: 12, border: `1px solid ${tempProfile.goal === target.id ? 'var(--accent-primary)' : 'var(--border)'} `, background: tempProfile.goal === target.id ? 'rgba(139, 92, 246, 0.1)' : 'rgba(0,0,0,0.2)', color: tempProfile.goal === target.id ? 'var(--accent-primary)' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }}
                                            >
                                                {target.label}
                                            </button>
                                        ))}
                                    </div>
                                    <button className="btn" style={{ width: '100%' }} onClick={() => setProfileStep(4)}>Next ➔</button>
                                </motion.div>
                            )}

                            {profileStep === 4 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <label style={{ display: 'block', marginBottom: 16, color: 'var(--text-main)', fontSize: '1.1rem' }}>Coach Style</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                                        {[
                                            { id: 'strict', label: 'Military Strict' },
                                            { id: 'competitive', label: 'Esports Competitive' },
                                            { id: 'friendly', label: 'Friendly & Chill' }
                                        ].map(target => (
                                            <button key={target.id}
                                                onClick={() => setTempProfile({ ...tempProfile, coachStyle: target.id as any })}
                                                style={{ textAlign: 'left', padding: 16, borderRadius: 12, border: `1px solid ${tempProfile.coachStyle === target.id ? 'var(--accent-primary)' : 'var(--border)'} `, background: tempProfile.coachStyle === target.id ? 'rgba(139, 92, 246, 0.1)' : 'rgba(0,0,0,0.2)', color: tempProfile.coachStyle === target.id ? 'var(--accent-primary)' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }}
                                            >
                                                {target.label}
                                            </button>
                                        ))}
                                    </div>
                                    <button className="btn" style={{ width: '100%' }} onClick={() => setProfileStep(5)}>Next ➔</button>
                                </motion.div>
                            )}

                            {profileStep === 5 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                    <label style={{ display: 'block', marginBottom: 16, color: 'var(--text-main)', fontSize: '1.1rem' }}>Daily Target Time</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
                                        {[5, 10, 15, 20].map(mins => (
                                            <button key={mins}
                                                onClick={() => setTempProfile({ ...tempProfile, dailyMinutes: mins as any })}
                                                style={{ padding: 16, borderRadius: 12, border: `1px solid ${tempProfile.dailyMinutes === mins ? 'var(--accent-primary)' : 'var(--border)'} `, background: tempProfile.dailyMinutes === mins ? 'rgba(139, 92, 246, 0.1)' : 'rgba(0,0,0,0.2)', color: tempProfile.dailyMinutes === mins ? 'var(--accent-primary)' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s', fontSize: '1.2rem', fontWeight: 800 }}
                                            >
                                                {mins}m
                                            </button>
                                        ))}
                                    </div>
                                    <button className="btn" style={{ width: '100%', background: 'var(--success)', color: '#000' }} onClick={() => finishProfile(false)}>Build My Profile</button>
                                </motion.div>
                            )}

                            <div style={{ marginTop: 24, textAlign: 'center' }}>
                                <button onClick={() => finishProfile(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }}>Skip Quick Setup</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div variants={itemVariants} style={{ marginBottom: 40, textAlign: 'center' }}>
                <h1 style={{ fontSize: '3.5rem', fontWeight: 900, background: 'linear-gradient(to right, #fff, var(--accent-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8, letterSpacing: '-1px' }}>
                    {profile?.name ? `Ready, ${profile.name}?` : 'Level Up Your Brain'}
                </h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Master real-world skills. Dominate the stats.</p>

                {import.meta.env.DEV && !focusMode && (
                    <div style={{ marginTop: 24 }}>
                        <Link to="/debug" className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.9rem' }}>
                            <Bug size={16} /> Debug Mode
                        </Link>
                    </div>
                )}
                <button onClick={() => { const next = !focusMode; setFocusModeState(next); setFocusMode(next); }} style={{ marginTop: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: focusMode ? 'rgba(234,179,8,0.15)' : 'transparent', color: focusMode ? 'rgb(234,179,8)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>
                    ⚡ Focus Mode {focusMode ? 'ON' : 'OFF'}
                </button>
            </motion.div>

            {/* Phase 17.1: First-Run Fast Path */}
            {(!programCfg || !programCfg.enabled) && !plan && (
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 32, marginBottom: 28, border: '2px solid rgba(16,185,129,0.4)', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--success)', marginBottom: 8 }}>Start in 60 Seconds</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>One click to begin your first 10-minute Focus Sprint.</p>
                    <button onClick={() => {
                        const defaultCfg = { enabled: true, weeklyMinutes: 70, areaWeights: { thinking: 5, vocabulary: 5, writing: 5 } };
                        saveWeeklyProgramConfig(defaultCfg);
                        const newPlan = generateDailyPlan({ now: Date.now(), cfg: defaultCfg });
                        if (newPlan) { saveDailyPlan(newPlan); setPlan(newPlan); }
                        trackSessionStart();
                        if (newPlan && newPlan.items.length > 0) {
                            const firstItem = newPlan.items[0];
                            if (firstItem.type === 'session' && firstItem.areaId && firstItem.sessionId) {
                                navigate(`/area/${firstItem.areaId}/session/${firstItem.sessionId}`);
                            } else {
                                navigate(`/area/english`);
                            }
                        }
                    }} style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, rgb(16,185,129), rgb(59,130,246))', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}>
                        ⚡ Start 10-Min Focus Sprint
                    </button>
                </motion.div>
            )}

            {/* Mission Banner */}
            <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 40 }}>
                <motion.div
                    whileHover={{ scale: isCompleted ? 1 : 1.02 }}
                    className="card glass-panel"
                    style={{
                        margin: 0,
                        padding: 32,
                        position: 'relative',
                        overflow: 'hidden',
                        animation: isCompleted ? 'none' : 'breatheBorder 3s infinite',
                        border: isCompleted ? '1px solid var(--border)' : '1px solid rgba(139, 92, 246, 0.5)',
                        boxShadow: (!onboarding.completed || (onboarding.completed && onboarding.step === 3 && !isCompleted)) ? '0 0 30px var(--accent-glow)' : 'none'
                    }}
                >
                    {!isCompleted && <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', animation: 'lightSweep 3s infinite', pointerEvents: 'none' }} />}
                    <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'var(--accent-glow)', filter: 'blur(50px)', borderRadius: '50%', pointerEvents: 'none' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: 12, borderRadius: 12 }}>
                            <Zap color="var(--accent-primary)" size={24} style={{ filter: 'drop-shadow(0 0 5px var(--accent-glow))' }} />
                        </div>
                        <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>DAILY MISSION</h2>
                        {isCompleted && <span className="badge" style={{ background: 'var(--success)', color: '#000', border: 'none', marginLeft: 'auto', boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }}>CLEARED</span>}
                    </div>

                    <h3 style={{ fontSize: '1.35rem', marginBottom: 8, color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)' }}>{mission.title}</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '1.05rem', lineHeight: 1.5 }}>{mission.description}</p>

                    <button
                        className="btn"
                        disabled={isCompleted}
                        style={{
                            width: '100%',
                            background: isCompleted ? 'transparent' : 'var(--accent-primary)',
                            border: isCompleted ? '2px solid var(--border)' : 'none',
                            color: isCompleted ? 'var(--text-muted)' : '#fff',
                            boxShadow: isCompleted ? 'none' : '0 0 20px var(--accent-glow)',
                            animation: (!onboarding.completed || (onboarding.completed && onboarding.step === 3 && !isCompleted)) ? 'pulseGlow 2s infinite' : 'none'
                        }}
                        onClick={() => navigate(`/area//practice`)}
                    >
                        {isCompleted ? 'Mission Complete +50 XP' : 'Start Mission ➔'}
                    </button >
                </motion.div >

                {/* Stats Card */}
                < div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 24, justifyContent: 'center', margin: 0, padding: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: 16, borderRadius: 16, boxShadow: 'inset 0 0 20px rgba(244, 63, 94, 0.05)' }}>
                            <Flame color="var(--danger)" size={32} style={{ filter: streak.current > 0 ? 'drop-shadow(0 0 8px rgba(244, 63, 94, 0.6))' : 'none' }} />
                        </div>
                        <div>
                            <div className="stat-label" style={{ fontSize: '0.9rem', marginBottom: 4 }}>Log Streak</div>
                            <div className="stat-val" style={{ fontSize: '2.5rem', marginBottom: 0, lineHeight: 1, color: streak.current > 0 ? 'var(--danger)' : 'var(--border)', textShadow: streak.current > 0 ? '0 0 10px rgba(244, 63, 94, 0.5)' : 'none' }}>
                                {streak.current} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal', textShadow: 'none' }}>DAYS</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: 16, borderRadius: 16, boxShadow: 'inset 0 0 20px rgba(245, 158, 11, 0.05)' }}>
                            <Star color="var(--warning)" size={32} style={{ filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.5))' }} />
                        </div>
                        <div>
                            <div className="stat-label" style={{ fontSize: '0.9rem', marginBottom: 4 }}>Lifetime XP</div>
                            <div className="stat-val" style={{ fontSize: '2.5rem', marginBottom: 0, lineHeight: 1, color: 'var(--warning)', textShadow: '0 0 10px rgba(245, 158, 11, 0.5)' }}>{xp.total}</div>
                        </div>
                    </div>
                </div >
            </motion.div >

            {/* Phase 16.9: Child Contract View */}
            {(() => {
                const wk = getContractWeekKey();
                const contract = getGoalContract(wk, '');
                if (!contract || !contract.parentSigned) return null;
                return (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 16, marginBottom: 16, border: '1px solid rgba(34,197,94,0.2)' }}>
                        <h3 style={{ fontSize: '0.85rem', color: 'rgb(34,197,94)', fontWeight: 800, margin: '0 0 8px 0' }}>This Week's Agreement</h3>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            <div>1. {contract.academicGoal}</div>
                            <div>2. {contract.behaviorGoal}</div>
                            <div>3. Plan integrity {'>'}{contract.integrityGoal}%</div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, fontSize: '0.65rem', marginTop: 8 }}>
                            <span style={{ color: contract.parentSigned ? 'var(--success)' : 'var(--text-muted)' }}>{contract.parentSigned ? '\u2713' : '\u25cb'} {contract.parentName || 'Parent'}</span>
                            {contract.childSigned ?
                                <span style={{ color: 'var(--success)' }}>\u2713 {contract.childName}</span> :
                                <button onClick={() => {
                                    const name = prompt('Tu nombre para firmar:');
                                    if (name) {
                                        contract.childName = name;
                                        contract.childSigned = true;
                                        contract.signedAt = Date.now();
                                        saveGoalContract(contract);
                                    }
                                }} style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(34,197,94,0.3)', background: 'transparent', color: 'rgb(34,197,94)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700 }}>Sign</button>
                            }
                        </div>
                    </motion.div>
                );
            })()}

            {/* Phase 15.5: Today's Plan */}
            {
                programCfg?.enabled && plan && plan.items.length > 0 ? (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 28, border: '1px solid rgba(168,85,247,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <h2 style={{ fontSize: '1.2rem', color: 'rgb(168,85,247)', fontWeight: 900, margin: 0 }}>📋 TODAY&apos;S PLAN</h2>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{plan.totalMinutes} min target</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                            {plan.items.map(item => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: item.completed ? 'rgba(16,185,129,0.08)' : item.startedAt ? 'rgba(168,85,247,0.06)' : 'rgba(0,0,0,0.2)', border: `1px solid ${item.completed ? 'rgba(16,185,129,0.3)' : item.startedAt ? 'rgba(168,85,247,0.25)' : 'var(--border)'}` }}>
                                    <div style={{ color: item.completed ? 'var(--success)' : item.startedAt ? 'rgb(168,85,247)' : 'var(--text-muted)' }}>
                                        {item.completed ? <CheckCircle size={20} /> : item.startedAt ? <Timer size={20} /> : <Circle size={20} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: item.completed ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: item.completed ? 'line-through' : 'none' }}>
                                            {item.id.includes('WRITING_LAB') ? '✍️ Writing Lab' : item.id.includes('READING_LAB') ? '📖 Reading Lab' : item.id.includes('SEL_LAB') ? '💜 SEL Lab' : item.type === 'session' ? `📚 ${item.areaId?.charAt(0).toUpperCase()}${item.areaId?.slice(1)} Session` : item.type === 'vocab' ? '🔤 Vocab Drill' : item.type === 'decision_lab' ? '🌍 Decision Lab' : '🔄 Review'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {item.reason} · {item.minutes}min
                                            {item.completed && item.evidence && <span style={{ marginLeft: 6, color: 'var(--success)' }}>✓ verified</span>}
                                            {item.completed && !item.evidence && <span style={{ marginLeft: 6, color: 'var(--warning)' }}>⚠ unverified</span>}
                                        </div>
                                    </div>
                                    {!item.completed && !item.startedAt && (
                                        <button onClick={() => { startDailyPlanItem(item.id); setPlan(getDailyPlan()); }} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(168,85,247,0.4)', background: 'transparent', color: 'rgb(168,85,247)', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                                            Start
                                        </button>
                                    )}
                                    {!item.completed && item.startedAt && (
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {item.id.includes('-r2a-') ? (
                                                <>
                                                    <button onClick={() => {
                                                        const stepId = item.id.split('-r2a-')[1];
                                                        if (stepId) { updateActionStep(stepId, { status: 'done', completedAt: Date.now() }); }
                                                        completeDailyPlanItem(item.id, { kind: 'timer', value: 3 });
                                                        setPlan(getDailyPlan());
                                                    }} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: 'rgb(16,185,129)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}>
                                                        ✓ Done
                                                    </button>
                                                    <button onClick={() => {
                                                        const stepId = item.id.split('-r2a-')[1];
                                                        if (stepId) { updateActionStep(stepId, { status: 'skipped' }); }
                                                        completeDailyPlanItem(item.id, { kind: 'timer', value: 0, note: 'skipped' });
                                                        setPlan(getDailyPlan());
                                                    }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}>
                                                        <SkipForward size={12} />
                                                    </button>
                                                </>
                                            ) : item.id.includes('WRITING_LAB') ? (
                                                <span style={{ fontSize: '0.75rem', color: 'rgb(168,85,247)', fontWeight: 700 }}>⬇ Writing Lab below</span>
                                            ) : item.id.includes('READING_LAB') ? (
                                                <span style={{ fontSize: '0.75rem', color: 'rgb(14,165,233)', fontWeight: 700 }}>⬇ Reading Lab below</span>
                                            ) : item.id.includes('SEL_LAB') ? (
                                                <span style={{ fontSize: '0.75rem', color: 'rgb(168,85,247)', fontWeight: 700 }}>⬇ SEL Lab below</span>
                                            ) : (
                                                <button onClick={() => {
                                                    startDailyPlanItem(item.id);
                                                    if (item.type === 'session' && item.areaId) navigate(`/area/${item.areaId}/session/${item.sessionId}`);
                                                    else if (item.type === 'vocab') navigate('/area/english/practice');
                                                    else if (item.type === 'decision_lab') navigate('/area/life/practice');
                                                    else navigate('/area/english/progress');
                                                }} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'rgb(168,85,247)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Play size={12} /> Go
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>✅ {plan.items.filter(i => i.completed).length}/{plan.items.length} completed</div>
                        {/* Inline WritingLab when WRITING_LAB item is started */}
                        {plan.items.some(i => i.id.includes('WRITING_LAB') && i.startedAt && !i.completed) && (
                            <div style={{ marginTop: 14 }}>
                                <WritingLab
                                    ageBand={getActiveAgeBand()}
                                    dateNow={Date.now()}
                                    onComplete={() => {
                                        const wlItem = plan.items.find(i => i.id.includes('WRITING_LAB'));
                                        if (wlItem) completeDailyPlanItem(wlItem.id, { kind: 'timer', value: 12 });
                                        setPlan(getDailyPlan());
                                    }}
                                />
                            </div>
                        )}
                        {/* Inline ReadingLab when READING_LAB item is started */}
                        {plan.items.some(i => i.id.includes('READING_LAB') && i.startedAt && !i.completed) && (
                            <div style={{ marginTop: 14 }}>
                                <ReadingLab
                                    ageBand={getActiveAgeBand()}
                                    dateNow={Date.now()}
                                    onComplete={() => {
                                        const rlItem = plan.items.find(i => i.id.includes('READING_LAB'));
                                        if (rlItem) completeDailyPlanItem(rlItem.id, { kind: 'timer', value: 10 });
                                        setPlan(getDailyPlan());
                                    }}
                                />
                            </div>
                        )}
                        {/* Inline SELLab when SEL_LAB item is started */}
                        {plan.items.some(i => i.id.includes('SEL_LAB') && i.startedAt && !i.completed) && (
                            <div style={{ marginTop: 14 }}>
                                <SELLab
                                    ageBand={getActiveAgeBand()}
                                    dateNow={Date.now()}
                                    onComplete={() => {
                                        const slItem = plan.items.find(i => i.id.includes('SEL_LAB'));
                                        if (slItem) completeDailyPlanItem(slItem.id, { kind: 'timer', value: 8 });
                                        setPlan(getDailyPlan());
                                    }}
                                />
                            </div>
                        )}
                    </motion.div>
                ) : !programCfg?.enabled ? (
                    <motion.div variants={itemVariants} style={{ marginBottom: 28 }}>
                        <Link to="/parent" style={{ display: 'block', padding: '14px 20px', borderRadius: 10, border: '1px dashed rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.05)', color: 'rgb(168,85,247)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                            📋 Enable Autopilot in Parent Dashboard for daily plans
                        </Link>
                    </motion.div>
                ) : null
            }

            {/* Phase 17.1: Completion Modal */}
            {showCompletion && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card glass-panel" style={{ padding: 40, textAlign: 'center', maxWidth: 400, width: '100%' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)', marginBottom: 8 }}>Session Complete.</h2>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                            Streak today: ✓ · Minutes completed: {plan?.items.filter(i => i.completed).reduce((s, i) => s + i.minutes, 0) || 0}
                        </div>
                        <input value={ritualText} onChange={e => setRitualText(e.target.value.slice(0, 200))} placeholder="¿Qué fue lo más difícil hoy?" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', fontSize: '0.85rem', marginBottom: 12 }} />
                        <button onClick={() => {
                            if (ritualText.trim()) saveDailyReflection(ritualText);
                            const mins = plan?.items.filter(i => i.completed).reduce((s, i) => s + i.minutes, 0) || 0;
                            trackSessionComplete(mins);
                            setShowCompletion(false);
                        }} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--success)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                            Done
                        </button>
                    </motion.div>
                </motion.div>
            )}

            <motion.h2 variants={itemVariants} style={{ fontSize: '1.5rem', marginBottom: 24, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                Training Arenas
            </motion.h2>

            <motion.div variants={containerVariants} className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {growthAreas.map(area => {
                    const isActive = area.status === 'active';
                    return (
                        <motion.div key={area.id} variants={itemVariants}>
                            <Link
                                to={isActive ? `/area/${area.id}` : '#'}
                                className={`session-card glass-panel ${isActive ? 'neon-border' : ''}`}
                                onMouseMove={isActive ? handleMouseMove : undefined}
                                onMouseLeave={isActive ? handleMouseLeave : undefined}
                                style={{
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    filter: isActive ? 'none' : 'grayscale(1) blur(1px)',
                                    opacity: isActive ? 1 : 0.6,
                                    borderColor: isActive ? 'transparent' : 'var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    position: 'relative',
                                    zIndex: 1,
                                    transition: 'transform 0.1s ease-out, filter 0.3s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                        {area.name}
                                    </h3>
                                    {!isActive ? (
                                        <Lock size={20} color="var(--text-muted)" />
                                    ) : (
                                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)', margin: 0, boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)', animation: 'pulseGlow 2s infinite' }}>
                                            ONLINE
                                        </span>
                                    )}
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.5, flex: 1 }}>
                                    {area.description}
                                </p>

                                <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: 700 }}>
                                    {isActive ? <><BookOpen size={18} /> Enter Arena ➔</> : 'Locked'}
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </motion.div>
        </motion.div>
    );
}
