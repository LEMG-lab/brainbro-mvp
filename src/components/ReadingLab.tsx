/**
 * Phase 15.9: Reading Lab Component
 * Weekly reading comprehension + fact checking exercise.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, Loader2 } from 'lucide-react';
import type { ReadingPassage, AgeBand } from '../types';
import { getReadingPassage, scoreReading, getReadingWeekKey } from '../lib/readingEngine';
import { appendReadingAttempt, setLastReadingWeekKey, getCognitiveProfile, saveCognitiveProfile, getXp, saveXp } from '../lib/storage';
import { getActiveChildId } from '../lib/childStorage';

const TEMPLATE_CHIPS = [
    { label: 'Afirmación 1', text: 'Afirmación 1: ___' },
    { label: 'Afirmación 2', text: 'Afirmación 2: ___' },
    { label: 'Hecho/Opinión', text: 'Esto es hecho/opinión porque ___' },
    { label: 'Verificar', text: 'Para verificar necesito ___' },
    { label: 'Manipulación', text: 'Puede ser manipulación porque ___' },
];

interface Props {
    ageBand: AgeBand;
    dateNow: number;
    onComplete: () => void;
}

export default function ReadingLab({ ageBand, dateNow, onComplete }: Props) {
    const passage: ReadingPassage = getReadingPassage(ageBand, dateNow);
    const [claims, setClaims] = useState('');
    const [factOpinion, setFactOpinion] = useState('');
    const [verification, setVerification] = useState('');
    const [manipulation, setManipulation] = useState('');
    const [scoring, setScoring] = useState(false);
    const [result, setResult] = useState<{ score: number; notes: string; mode: 'ai' | 'heuristic' } | null>(null);

    const totalLen = claims.length + factOpinion.length + verification.length + manipulation.length;
    const canSubmit = totalLen >= 30 && !scoring;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setScoring(true);
        try {
            const answers = { claims, factOpinion, verification, manipulation };
            const res = await scoreReading(answers, passage);
            setResult(res);

            const childId = getActiveChildId();
            appendReadingAttempt({
                id: `ra-${Date.now()}`,
                passageId: passage.id,
                createdAt: Date.now(),
                childId,
                answers,
                score: res.score as 0 | 1 | 2 | 3 | 4 | 5,
                notes: res.notes,
                mode: res.mode,
            });

            const profile = getCognitiveProfile();
            if (profile) {
                const prev = profile.readingEwma ?? 0;
                profile.readingEwma = prev * 0.75 + res.score * 0.25;
                profile.readingCompleted = (profile.readingCompleted ?? 0) + 1;
                saveCognitiveProfile(profile);
            }

            setLastReadingWeekKey(getReadingWeekKey(dateNow));

            if (res.score >= 4) {
                const xp = getXp();
                xp.total += 4;
                saveXp(xp);
            }
        } catch { /* silent */ }
        setScoring(false);
    };

    const areaStyle = { width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)', padding: 10, resize: 'vertical' as const, fontSize: '0.9rem', lineHeight: 1.5 };

    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(14,165,233,0.3)', background: 'rgba(14,165,233,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <BookOpen size={18} color="rgb(14,165,233)" />
                <span style={{ color: 'rgb(14,165,233)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Reading Lab — {passage.title}</span>
            </div>

            {/* Passage */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: 14, borderRadius: 8, marginBottom: 16, border: '1px solid var(--border)', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-main)' }}>
                {passage.text}
            </div>

            {!result ? (
                <>
                    {/* Template chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {TEMPLATE_CHIPS.map((chip, i) => {
                            const setters = [setClaims, setClaims, setFactOpinion, setVerification, setManipulation];
                            return (
                                <button key={i} onClick={() => setters[i](prev => prev + (prev ? '\n' : '') + chip.text)} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(14,165,233,0.3)', background: 'rgba(14,165,233,0.08)', color: 'rgb(14,165,233)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                                    {chip.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* 4 prompts */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgb(14,165,233)', marginBottom: 4, display: 'block' }}>📌 Extrae 2 afirmaciones del texto</label>
                            <textarea value={claims} onChange={e => setClaims(e.target.value)} rows={2} placeholder="Afirmación 1: ...\nAfirmación 2: ..." style={areaStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgb(14,165,233)', marginBottom: 4, display: 'block' }}>🔍 ¿Hecho u opinión? ¿Por qué?</label>
                            <textarea value={factOpinion} onChange={e => setFactOpinion(e.target.value)} rows={2} placeholder="La afirmación 1 es hecho porque..." style={areaStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgb(14,165,233)', marginBottom: 4, display: 'block' }}>🧪 ¿Cómo lo verificarías? ¿Qué falta?</label>
                            <textarea value={verification} onChange={e => setVerification(e.target.value)} rows={2} placeholder="Para verificar necesitaría..." style={areaStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgb(14,165,233)', marginBottom: 4, display: 'block' }}>⚡ ¿Ves alguna táctica de manipulación?</label>
                            <textarea value={manipulation} onChange={e => setManipulation(e.target.value)} rows={2} placeholder="Podría ser manipulación porque..." style={areaStyle} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: totalLen >= 30 ? 'var(--text-muted)' : 'var(--warning)' }}>{totalLen} caracteres</span>
                        <button onClick={handleSubmit} disabled={!canSubmit} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: canSubmit ? 'rgb(14,165,233)' : 'rgba(14,165,233,0.3)', color: '#fff', fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, opacity: scoring ? 0.7 : 1 }}>
                            {scoring ? <><Loader2 size={14} className="spin" /> Evaluando...</> : 'Enviar Análisis'}
                        </button>
                    </div>
                </>
            ) : (
                <AnimatePresence>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '2rem', fontWeight: 900, color: result.score >= 4 ? 'var(--success)' : result.score >= 2 ? 'var(--warning)' : 'var(--danger)' }}>{result.score}</span>
                                <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/5</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4 }}>{result.mode === 'ai' ? '🤖 AI' : '📐 Heuristic'}</span>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-line', lineHeight: 1.6, marginBottom: 14 }}>
                            {result.notes}
                        </div>

                        {result.score >= 4 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700, marginBottom: 10 }}>
                                <CheckCircle size={16} /> +4 XP awarded
                            </div>
                        )}

                        <button onClick={onComplete} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--success)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                            Continuar
                        </button>
                    </motion.div>
                </AnimatePresence>
            )}
        </motion.div>
    );
}
