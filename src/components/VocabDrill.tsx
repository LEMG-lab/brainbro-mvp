/**
 * Phase 14.9: VocabDrill — Spaced retrieval flashcard component.
 * Shows due words as self-check cards: "I knew it" / "I missed it".
 */

import { useState } from 'react';
import { BookOpen, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { scheduleNext, pickDueWords } from '../lib/vocabEngine';
import { getVocabProfile, saveVocabProfile, getXp, saveXp } from '../lib/storage';
import type { VocabWord, VocabProfile } from '../types';

interface VocabDrillProps {
    areaId: string;
    onComplete: () => void;
}

export default function VocabDrill({ areaId, onComplete }: VocabDrillProps) {
    const [profile] = useState<VocabProfile | null>(() => getVocabProfile());
    const [words] = useState<VocabWord[]>(() => pickDueWords(profile, Date.now(), 12));
    const [currentIdx, setCurrentIdx] = useState(0);
    const [results, setResults] = useState<boolean[]>([]);
    const [done, setDone] = useState(false);

    if (words.length === 0) return null;

    const handleAnswer = (correct: boolean) => {
        const updated = scheduleNext(words[currentIdx], correct);
        // Save immediately
        const p = getVocabProfile();
        if (p) {
            p.words[updated.id] = updated;
            p.updatedAt = Date.now();
            saveVocabProfile(p);
        }
        const newResults = [...results, correct];
        setResults(newResults);

        if (currentIdx + 1 >= words.length) {
            // Done
            const correctCount = newResults.filter(r => r).length;
            const pct = correctCount / newResults.length;
            if (pct >= 0.7) {
                const xp = getXp();
                xp.total += 2;
                xp.byArea[areaId] = (xp.byArea[areaId] || 0) + 2;
                saveXp(xp);
            }
            setDone(true);
        } else {
            setCurrentIdx(currentIdx + 1);
        }
    };

    if (done) {
        const correctCount = results.filter(r => r).length;
        const pct = Math.round((correctCount / results.length) * 100);
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card glass-panel" style={{ padding: 20, border: '1px solid rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.04)', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <BookOpen size={18} color="rgb(56,189,248)" />
                    <span style={{ color: 'rgb(56,189,248)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Vocab Drill Complete</span>
                </div>
                <div style={{ color: 'var(--text-main)', fontSize: '1rem' }}>
                    {correctCount}/{results.length} correctas ({pct}%) {pct >= 70 ? '— +2 XP' : ''}
                </div>
                <button onClick={onComplete} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: 'none', background: 'rgb(56,189,248)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>Continuar</button>
            </motion.div>
        );
    }

    const w = words[currentIdx];

    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card glass-panel" style={{ padding: 24, border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.04)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BookOpen size={18} color="rgb(56,189,248)" />
                    <span style={{ color: 'rgb(56,189,248)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Vocab Drill</span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{currentIdx + 1}/{words.length}</span>
            </div>

            <div style={{ textAlign: 'center', padding: '28px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: 12, marginBottom: 16 }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: 8 }}>{w.word}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {w.lang === 'en' ? '🇬🇧 English' : '🇪🇸 Español'} • Mastery: {w.mastery}/5 • Visto {w.seenCount}x
                </div>
                {w.examples && w.examples.length > 0 && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>"{w.examples[w.examples.length - 1]}"</div>
                )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => handleAnswer(false)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: '1px solid var(--danger)', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                    <X size={16} /> No lo sé
                </button>
                <button onClick={() => handleAnswer(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--success)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                    <Check size={16} /> Lo sé
                </button>
            </div>
        </motion.div>
    );
}
