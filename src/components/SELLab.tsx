/**
 * Phase 16.0: SEL Lab Component
 * Weekly social-emotional & ethics micro-exercise.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, CheckCircle, Loader2 } from 'lucide-react';
import type { SELScenario, AgeBand } from '../types';
import { getSELScenario, scoreSEL, getSELWeekKey } from '../lib/selEngine';
import { appendSELAttempt, setLastSELWeekKey, getCognitiveProfile, saveCognitiveProfile, getXp, saveXp } from '../lib/storage';
import { getActiveChildId } from '../lib/childStorage';

const TEMPLATE_CHIPS = [
    { label: 'Yo siento...', text: 'Yo siento ___ cuando ___' },
    { label: 'Perspectiva', text: 'Creo que la otra persona siente ___' },
    { label: 'Solución', text: 'Voy a hacer ___ para resolverlo' },
    { label: 'Ética IA', text: 'Con IA: verificar / citar / no copiar / no datos personales' },
];

interface Props {
    ageBand: AgeBand;
    dateNow: number;
    onComplete: () => void;
}

export default function SELLab({ ageBand, dateNow, onComplete }: Props) {
    const scenario: SELScenario = getSELScenario(ageBand, dateNow);
    const [answers, setAnswers] = useState<string[]>(scenario.prompts.map(() => ''));
    const [scoring, setScoring] = useState(false);
    const [result, setResult] = useState<{ score: number; notes: string; mode: 'ai' | 'heuristic' } | null>(null);

    const totalLen = answers.reduce((s, a) => s + a.length, 0);
    const canSubmit = totalLen >= 20 && !scoring;

    const THEME_LABELS: Record<string, string> = { impulse: 'Control de Impulsos', empathy: 'Empatía', conflict: 'Resolución de Conflictos', ethics_ai: 'Ética IA' };
    const THEME_COLORS: Record<string, string> = { impulse: 'rgb(244,63,94)', empathy: 'rgb(168,85,247)', conflict: 'rgb(245,158,11)', ethics_ai: 'rgb(14,165,233)' };
    const themeColor = THEME_COLORS[scenario.theme] || 'rgb(168,85,247)';

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setScoring(true);
        try {
            const ans = { a1: answers[0], a2: answers[1], a3: answers[2] || undefined };
            const res = await scoreSEL(ans, scenario);
            setResult(res);

            const childId = getActiveChildId();
            appendSELAttempt({
                id: `sel-${Date.now()}`,
                scenarioId: scenario.id,
                createdAt: Date.now(),
                childId,
                answers: ans,
                score: res.score as 0 | 1 | 2 | 3 | 4 | 5,
                notes: res.notes,
                mode: res.mode,
                theme: scenario.theme,
            });

            const profile = getCognitiveProfile();
            if (profile) {
                const prev = profile.selEwma ?? 0;
                profile.selEwma = prev * 0.75 + res.score * 0.25;
                profile.selCompleted = (profile.selCompleted ?? 0) + 1;
                saveCognitiveProfile(profile);
            }

            setLastSELWeekKey(getSELWeekKey(dateNow));

            if (res.score >= 4) {
                const xp = getXp();
                xp.total += 3;
                saveXp(xp);
            }
        } catch { /* silent */ }
        setScoring(false);
    };

    const areaStyle = { width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)', padding: 10, resize: 'vertical' as const, fontSize: '0.9rem', lineHeight: 1.5 };

    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: `1px solid ${themeColor}33`, background: `${themeColor}08` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Heart size={18} color={themeColor} />
                <span style={{ color: themeColor, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>SEL Lab — {THEME_LABELS[scenario.theme]}</span>
            </div>

            {/* Scenario */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: 14, borderRadius: 8, marginBottom: 16, border: '1px solid var(--border)', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-main)' }}>
                {scenario.scenario}
            </div>

            {!result ? (
                <>
                    {/* Template chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {TEMPLATE_CHIPS.map((chip, i) => (
                            <button key={i} onClick={() => {
                                const idx = Math.min(i, answers.length - 1);
                                const newAnswers = [...answers];
                                newAnswers[idx] = newAnswers[idx] + (newAnswers[idx] ? '\n' : '') + chip.text;
                                setAnswers(newAnswers);
                            }} style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${themeColor}33`, background: `${themeColor}12`, color: themeColor, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                                {chip.label}
                            </button>
                        ))}
                    </div>

                    {/* Prompts */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                        {scenario.prompts.map((prompt, i) => (
                            <div key={i}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: themeColor, marginBottom: 4, display: 'block' }}>{prompt}</label>
                                <textarea
                                    value={answers[i]}
                                    onChange={e => { const na = [...answers]; na[i] = e.target.value; setAnswers(na); }}
                                    rows={2}
                                    style={areaStyle}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: totalLen >= 20 ? 'var(--text-muted)' : 'var(--warning)' }}>{totalLen} caracteres</span>
                        <button onClick={handleSubmit} disabled={!canSubmit} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: canSubmit ? themeColor : `${themeColor}44`, color: '#fff', fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, opacity: scoring ? 0.7 : 1 }}>
                            {scoring ? <><Loader2 size={14} className="spin" /> Evaluando...</> : 'Enviar'}
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
                                <CheckCircle size={16} /> +3 XP awarded
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
