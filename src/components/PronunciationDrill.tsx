import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RotateCcw, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Augment window object for speech recognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

interface Props {
    sentence: string;
    accent: string;
    onComplete: (score: number) => void;
}

const normalize = (s: string) => s.toLowerCase().replace(/[.,?!¡¿]/g, '').trim().replace(/\s+/g, ' ');

export const PronunciationDrill: React.FC<Props> = ({ sentence, accent, onComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState<number | null>(null);
    const [missing, setMissing] = useState<string[]>([]);
    const [extra, setExtra] = useState<string[]>([]);

    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Speech recognition not supported in this browser. Use typing mode instead (or try Chrome).');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = accent === 'en-GB' ? 'en-GB' : 'en-US';

        recognition.onresult = (event: any) => {
            const currentTranscript = Array.from(event.results)
                .map((result: any) => result[0].transcript)
                .join('');
            setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') return;
            setError(`Speech recognition error: ${event.error}`);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [accent]);

    // When recording stops and we have a transcript, grade it
    useEffect(() => {
        if (!isRecording && transcript.length > 0) {
            gradeAttempt(transcript);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRecording]);

    const startRecording = () => {
        if (!recognitionRef.current) return;
        setError(null);
        setTranscript('');
        setScore(null);
        setMissing([]);
        setExtra([]);
        try {
            recognitionRef.current.start();
            setIsRecording(true);
        } catch (e: any) {
            setError(`Failed to start recording: ${e.message}`);
        }
    };

    const stopRecording = () => {
        if (!recognitionRef.current || !isRecording) return;
        recognitionRef.current.stop();
        setIsRecording(false);
    };

    const gradeAttempt = (finalTranscript: string) => {
        const targetWords = normalize(sentence).split(' ').filter(w => w);
        const spokenWords = normalize(finalTranscript).split(' ').filter(w => w);

        let matchCount = 0;
        const missingWords: string[] = [];
        const spokenCopy = [...spokenWords];

        targetWords.forEach(tw => {
            const idx = spokenCopy.indexOf(tw);
            if (idx !== -1) {
                matchCount++;
                spokenCopy.splice(idx, 1);
            } else {
                missingWords.push(tw);
            }
        });

        const extraWords = spokenCopy;
        const finalScore = targetWords.length > 0 ? Math.round((matchCount / targetWords.length) * 100) : 0;

        setMissing(missingWords);
        setExtra(extraWords);
        setScore(finalScore);
        onComplete(finalScore);
    };

    return (
        <div style={{ marginTop: 24, padding: 24, background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: 16 }}>
            <h4 style={{ color: 'var(--accent-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <Mic size={20} /> Pronunciation Drill (30s)
            </h4>

            <div style={{ background: 'rgba(0,0,0,0.4)', padding: 16, borderRadius: 12, marginBottom: 20, borderLeft: '3px solid var(--accent-primary)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 4 }}>TARGET SENTENCE ({accent})</span>
                <span style={{ color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 600 }}>{sentence}</span>
            </div>

            {error ? (
                <div style={{ color: 'var(--danger)', background: 'rgba(244, 63, 94, 0.1)', padding: 12, borderRadius: 8, border: '1px solid var(--danger)', marginBottom: 16 }}>
                    {error}
                </div>
            ) : (
                <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                    {!isRecording && score === null && (
                        <button className="btn neon-border" onClick={startRecording} style={{ background: 'var(--accent-primary)', color: '#fff', padding: '12px 24px', flex: 1 }}>
                            <Mic size={18} /> Start Recording
                        </button>
                    )}
                    {isRecording && (
                        <button className="btn neon-border" onClick={stopRecording} style={{ background: 'rgba(244, 63, 94, 0.2)', color: 'var(--danger)', borderColor: 'var(--danger)', padding: '12px 24px', flex: 1, boxShadow: '0 0 20px rgba(244, 63, 94, 0.4)' }}>
                            <Square size={18} /> Stop Recording
                        </button>
                    )}
                    {score !== null && (
                        <button className="btn" onClick={startRecording} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', padding: '12px 24px', flex: 1 }}>
                            <RotateCcw size={18} /> Retry
                        </button>
                    )}
                </div>
            )}

            <AnimatePresence>
                {transcript && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 4 }}>TRANSCRIPT</span>
                        <div style={{ color: 'var(--text-main)', fontSize: '1.1rem', minHeight: 24, fontStyle: isRecording ? 'italic' : 'normal', opacity: isRecording ? 0.7 : 1 }}>
                            {transcript} {isRecording && <span className="pulse">...</span>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {score !== null && !isRecording && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: 20, borderRadius: 12, background: score >= 85 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', border: score >= 85 ? '1px solid var(--success)' : '1px solid var(--warning)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Award size={24} color={score >= 85 ? 'var(--success)' : 'var(--warning)'} />
                                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: score >= 85 ? 'var(--success)' : 'var(--warning)' }}>SCORE: {score}%</span>
                            </div>
                            {score >= 85 && <span style={{ color: 'var(--success)', fontWeight: 800, fontSize: '0.9rem', background: 'rgba(16, 185, 129, 0.2)', padding: '4px 12px', borderRadius: 12 }}>+XP BONUS</span>}
                        </div>

                        {(missing.length > 0 || extra.length > 0) && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                                <div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Missing Words</span>
                                    {missing.length === 0 ? <span style={{ color: 'var(--success)' }}>None!</span> : (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {missing.map((w, i) => <span key={i} style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: '0.9rem' }}>{w}</span>)}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Extra Words</span>
                                    {extra.length === 0 ? <span style={{ color: 'var(--success)' }}>None!</span> : (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {extra.map((w, i) => <span key={i} style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: '0.9rem' }}>{w}</span>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

