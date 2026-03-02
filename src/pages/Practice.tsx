import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { sessions as mockSessions } from '../data/sessions';
import { getCustomSessionsByArea } from '../lib/storage';
import { Play, Sparkles, Filter } from 'lucide-react';
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

export default function Practice() {
    const { area } = useOutletContext<{ area: any }>();
    const isEnglish = area.id === 'english';

    const [filter, setFilter] = useState<'all' | 'mock' | 'generated'>('all');

    const customSessions = getCustomSessionsByArea(area.id);
    const allSessions = [
        ...customSessions.map(s => ({ ...s, source: 'generated' as const })),
        ...mockSessions.filter((s: any) => s.areaId === area.id || (isEnglish && !s.areaId)).map(s => ({ ...s, source: 'mock' as const }))
    ];

    const displayedSessions = allSessions.filter(s => {
        if (filter === 'all') return true;
        return s.source === filter;
    });

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
                    OPERATIONAL DATABASE: <span style={{ color: 'var(--accent-primary)', textShadow: '0 0 20px rgba(139, 92, 246, 0.4)' }}>{area.name}</span>
                </h1>

                <div className="glass-panel neon-border" style={{ padding: '20px 24px', borderRadius: '12px', marginTop: 16, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', width: 200, height: 100, background: 'var(--accent-glow)', filter: 'blur(40px)', opacity: 0.3, pointerEvents: 'none' }} />
                    <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                        <strong>OPERATION PROTOCOL:</strong> Select Simulation ➔ <strong>INITIATE</strong> ➔ {isEnglish ? 'Receive Audio Transmission ➔ ' : 'Analyze Scenario ➔ '} Resolve Queries ➔ <strong>TRANSMIT</strong>.
                        <br />
                        <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: 8, display: 'inline-block', opacity: 0.7 }}>
                            // One cycle = 1 Briefing + 5 Queries + Telemetry Feedback
                        </span>
                    </p>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                <Filter size={20} color="var(--text-muted)" style={{ marginRight: 8 }} />
                <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                    className={`btn ${filter === 'all' ? 'neon-border' : ''}`}
                    style={{
                        width: 'auto',
                        padding: '10px 20px',
                        fontSize: '0.95rem',
                        background: filter === 'all' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        border: filter === 'all' ? 'none' : '1px solid var(--border)',
                        color: filter === 'all' ? '#fff' : 'var(--text-muted)'
                    }}
                    onClick={() => setFilter('all')}
                >
                    ALL DATA
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                    className={`btn ${filter === 'generated' ? 'neon-border' : ''}`}
                    style={{
                        width: 'auto',
                        padding: '10px 20px',
                        fontSize: '0.95rem',
                        background: filter === 'generated' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        border: filter === 'generated' ? 'none' : '1px solid var(--border)',
                        color: filter === 'generated' ? '#fff' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                    onClick={() => setFilter('generated')}
                >
                    <Sparkles size={16} /> AI SYNTHESIZED
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                    className={`btn ${filter === 'mock' ? 'neon-border' : ''}`}
                    style={{
                        width: 'auto',
                        padding: '10px 20px',
                        fontSize: '0.95rem',
                        background: filter === 'mock' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        border: filter === 'mock' ? 'none' : '1px solid var(--border)',
                        color: filter === 'mock' ? '#fff' : 'var(--text-muted)'
                    }}
                    onClick={() => setFilter('mock')}
                >
                    CORE ARCHIVES
                </motion.button>
            </motion.div>

            <motion.div variants={containerVariants} className="grid-cards">
                {displayedSessions.map(sess => (
                    <motion.div key={sess.id} variants={itemVariants} whileHover={{ scale: 1.02, y: -4 }}>
                        <div className={`session-card glass-panel ${sess.source === 'generated' ? 'neon-border' : ''}`} style={{ border: sess.source === 'generated' ? 'none' : '1px solid var(--border)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                    CLASS {sess.difficulty}
                                </div>
                                {sess.id.startsWith('math_t1_') && (
                                    <div className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent-glow)', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
                                        TIER 1
                                    </div>
                                )}
                                {sess.source === 'generated' && (
                                    <div style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        <Sparkles size={14} /> SYNTH
                                    </div>
                                )}
                            </div>
                            <h3 style={{ fontSize: '1.35rem', marginBottom: 8, color: 'var(--text-main)' }}>{sess.topic}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: 24, flex: 1, opacity: 0.8 }}>
                                {sess.questions?.length || 0} QUERIES • {sess.vocabLearned?.length || 0} TARGETS
                            </p>
                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                <Link to={`/area/${area.id}/session/${sess.id}`} className="btn" style={{
                                    background: sess.source === 'generated' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.05)',
                                    color: sess.source === 'generated' ? 'var(--accent-primary)' : 'var(--text-main)',
                                    border: `1px solid ${sess.source === 'generated' ? 'rgba(139, 92, 246, 0.3)' : 'var(--border)'}`
                                }}>
                                    INITIATE <Play size={18} />
                                </Link>
                            </motion.div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </motion.div>
    );
}
