/**
 * Phase 15.8: Writing Lab Component
 * Weekly argumentative writing mission with rubric scoring.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, CheckCircle, Loader2 } from 'lucide-react';
import type { WritingPrompt, WritingScores, AgeBand } from '../types';
import { getWritingPrompt, scoreWriting, getWeekKey } from '../lib/writingEngine';
import { appendWritingAttempt, setLastWritingWeekKey, getCognitiveProfile, saveCognitiveProfile, getXp, saveXp } from '../lib/storage';
import { getActiveChildId } from '../lib/childStorage';

const TEMPLATE_CHIPS = [
    'Tesis: "Creo que..."',
    'Razón 1: ___',
    'Razón 2: ___',
    'Contraargumento: "Sin embargo..."',
    'Respuesta: "Aún así..."',
];

interface Props {
    ageBand: AgeBand;
    dateNow: number;
    onComplete: () => void;
}

export default function WritingLab({ ageBand, dateNow, onComplete }: Props) {
    const prompt: WritingPrompt = getWritingPrompt(ageBand, dateNow);
    const [text, setText] = useState('');
    const [scoring, setScoring] = useState(false);
    const [result, setResult] = useState<{ scores: WritingScores; notes: string; mode: 'ai' | 'heuristic' } | null>(null);

    const handleSubmit = async () => {
        if (text.trim().length < 40 || scoring) return;
        setScoring(true);
        try {
            const res = await scoreWriting(text, prompt);
            setResult(res);

            // Save attempt
            const childId = getActiveChildId();
            appendWritingAttempt({
                id: `wa-${Date.now()}`,
                promptId: prompt.id,
                childId,
                createdAt: Date.now(),
                text,
                scores: res.scores,
                notes: res.notes,
                mode: res.mode,
            });

            // Update profile
            const profile = getCognitiveProfile();
            if (profile) {
                const prev = profile.writingEwma ?? 0;
                const avgScore = res.scores.total / 5;
                profile.writingEwma = prev * 0.75 + avgScore * 0.25;
                profile.writingCompleted = (profile.writingCompleted ?? 0) + 1;
                saveCognitiveProfile(profile);
            }

            // Mark week done
            setLastWritingWeekKey(getWeekKey(dateNow));

            // XP
            if (res.scores.total >= 15) {
                const xp = getXp();
                xp.total += 5;
                saveXp(xp);
            }
        } catch { /* silent */ }
        setScoring(false);
    };

    const scoreColor = (v: number) => v >= 4 ? 'var(--success)' : v >= 2 ? 'var(--warning)' : 'var(--danger)';
    const LABELS: Record<string, string> = { thesis: 'Tesis', evidence: 'Evidencia', counter: 'Contraargumento', structure: 'Estructura', logic: 'Lógica' };

    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <PenTool size={18} color="rgb(168,85,247)" />
                <span style={{ color: 'rgb(168,85,247)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Writing Lab — {prompt.topic}</span>
            </div>

            <p style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: 1.5, marginBottom: 16 }}>{prompt.prompt}</p>

            {!result ? (
                <>
                    {/* Template chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {TEMPLATE_CHIPS.map((chip, i) => (
                            <button key={i} onClick={() => setText(prev => prev + (prev ? '\n\n' : '') + chip)} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.08)', color: 'rgb(168,85,247)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                {chip.split(':')[0]}
                            </button>
                        ))}
                    </div>

                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Escribe tu ensayo aquí (mínimo 40 caracteres)..."
                        rows={8}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)', padding: 12, resize: 'vertical', fontSize: '0.95rem', lineHeight: 1.6 }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <span style={{ fontSize: '0.75rem', color: text.length >= 40 ? 'var(--text-muted)' : 'var(--warning)' }}>{text.length} caracteres</span>
                        <button
                            onClick={handleSubmit}
                            disabled={text.trim().length < 40 || scoring}
                            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: text.trim().length >= 40 ? 'rgb(168,85,247)' : 'rgba(168,85,247,0.3)', color: '#fff', fontWeight: 700, cursor: text.trim().length >= 40 ? 'pointer' : 'default', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, opacity: scoring ? 0.7 : 1 }}
                        >
                            {scoring ? <><Loader2 size={14} className="spin" /> Evaluando...</> : 'Enviar Ensayo'}
                        </button>
                    </div>
                </>
            ) : (
                <AnimatePresence>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Score grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
                            {(['thesis', 'evidence', 'counter', 'structure', 'logic'] as const).map(key => (
                                <div key={key} style={{ textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: scoreColor(result.scores[key]) }}>{result.scores[key]}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>{LABELS[key]}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: result.scores.total >= 15 ? 'var(--success)' : 'var(--warning)' }}>Total: {result.scores.total}/25</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4 }}>{result.mode === 'ai' ? '🤖 AI' : '📐 Heuristic'}</span>
                        </div>

                        {/* Notes */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-line', lineHeight: 1.6, marginBottom: 14 }}>
                            {result.notes}
                        </div>

                        {result.scores.total >= 15 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700, marginBottom: 10 }}>
                                <CheckCircle size={16} /> +5 XP awarded
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
