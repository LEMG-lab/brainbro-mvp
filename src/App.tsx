import { useState, useEffect } from 'react';
import { sessions } from './data/sessions';
import { SessionData, SessionResult, WrongAnswer, VocabItem } from './types';
import { PlayCircle, Award, ArrowRight, Brain, History as HistoryIcon, LogOut } from 'lucide-react';

export default function App() {
    const [currentView, setCurrentView] = useState<'dashboard' | 'practice' | 'review'>('dashboard');
    const [activeSession, setActiveSession] = useState<SessionData | null>(null);
    const [accent, setAccent] = useState<'en-US' | 'en-GB'>('en-US');

    // App state
    const [history, setHistory] = useState<SessionResult[]>([]);

    // Practice state
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [scriptRevealed, setScriptRevealed] = useState(false);
    const [currentResult, setCurrentResult] = useState<SessionResult | null>(null);

    // TTS synthesis
    const synth = window.speechSynthesis;

    useEffect(() => {
        const saved = localStorage.getItem('brainbro_history');
        if (saved) {
            setHistory(JSON.parse(saved));
        }
    }, []);

    const saveResult = (res: SessionResult) => {
        const updated = [res, ...history];
        setHistory(updated);
        localStorage.setItem('brainbro_history', JSON.stringify(updated));
    };

    const startSession = (sess: SessionData) => {
        setActiveSession(sess);
        setAnswers({});
        setScriptRevealed(false);
        setCurrentResult(null);
        setCurrentView('practice');
    };

    const handleReadAloud = () => {
        if (!activeSession) return;
        synth.cancel(); // stop current if any
        const utterance = new SpeechSynthesisUtterance(activeSession.text);

        // Choose voice
        const voices = synth.getVoices();
        const voice = voices.find(v => v.lang === accent) || voices.find(v => v.lang.includes('en'));
        if (voice) utterance.voice = voice;
        utterance.rate = 0.9; // Slightly slower for learning
        synth.speak(utterance);
    };

    const handleSelectAnswer = (qIndex: number, option: string) => {
        setAnswers(prev => ({ ...prev, [qIndex]: option }));
    };

    const handleSubmit = () => {
        if (!activeSession) return;
        let score = 0;
        const wrongQs: WrongAnswer[] = [];

        activeSession.questions.forEach((q, idx) => {
            const chosen = answers[idx];
            if (chosen === q.correct) {
                score++;
            } else {
                wrongQs.push({
                    q: q.q,
                    chosen: chosen || 'No answer',
                    correct: q.correct,
                    explanation_es: q.explanation_es
                });
            }
        });

        const result: SessionResult = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(),
            accent,
            topic: activeSession.topic,
            difficulty: activeSession.difficulty,
            score,
            total: activeSession.questions.length,
            wrongQuestions: wrongQs,
            vocabLearned: activeSession.vocabLearned
        };

        saveResult(result);
        setCurrentResult(result);
        setScriptRevealed(true);
        setCurrentView('review');
    };

    const stopAudioAndReturn = () => {
        synth.cancel();
        setCurrentView('dashboard');
    };

    if (currentView === 'dashboard') {
        return (
            <div className="container">
                <div className="header">
                    <h1>🧠 BrainBro</h1>
                    <p>Your direct, no-BS English coach.</p>
                </div>

                <div className="card">
                    <h2>Start a Practice Session</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Listen to native passages, train your ear, increase your vocab.</p>
                    <div className="session-list">
                        {sessions.map(sess => (
                            <div key={sess.id} className="session-item" onClick={() => startSession(sess)}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{sess.topic}</h3>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Diff: {sess.difficulty}/5 • {sess.questions.length} questions</span>
                                </div>
                                <button className="btn" style={{ width: 'auto', padding: '10px 16px' }}><PlayCircle size={20} /> Play</button>
                            </div>
                        ))}
                    </div>
                </div>

                {history.length > 0 && (
                    <div className="card">
                        <h2><HistoryIcon className="inline mr-2" /> Recent History</h2>
                        <div className="session-list" style={{ marginTop: 16 }}>
                            {history.slice(0, 3).map(h => (
                                <div key={h.id} style={{ padding: '12px 16px', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{h.topic} ({h.date})</span>
                                    <span style={{ fontWeight: 'bold', color: h.score === h.total ? 'var(--success)' : 'var(--primary)' }}>
                                        {h.score} / {h.total}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (currentView === 'practice' && activeSession) {
        const allAnswered = Object.keys(answers).length === activeSession.questions.length;
        return (
            <div className="container">
                <button onClick={stopAudioAndReturn} className="btn btn-secondary" style={{ width: 'auto', marginBottom: 24, padding: '8px 16px' }}>
                    <LogOut size={18} /> Exit
                </button>
                <div className="card">
                    <div className="badge">Difficulty: {activeSession.difficulty}/5</div>
                    <h2>{activeSession.topic}</h2>

                    <div className="controls-row" style={{ marginTop: 24 }}>
                        <select value={accent} onChange={(e) => setAccent(e.target.value as any)}>
                            <option value="en-US">🇺🇸 American</option>
                            <option value="en-GB">🇬🇧 British</option>
                        </select>
                        <button className="btn" onClick={handleReadAloud} style={{ width: 'auto', flex: 1 }}>
                            <PlayCircle size={24} /> Read Aloud
                        </button>
                    </div>

                    <p className="passage-hidden" style={{ marginTop: 24, fontSize: '1.1rem', lineHeight: 1.6 }}>
                        {activeSession.text}
                        <br /><br />
                        (Script is hidden while you listen. Finish the quiz to unlock it!)
                    </p>
                </div>

                <div className="card">
                    <h2>Quiz</h2>
                    {activeSession.questions.map((q, qIndex) => (
                        <div key={qIndex} className="question-block">
                            <h3>{qIndex + 1}. {q.q}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {q.options.map(opt => (
                                    <button
                                        key={opt}
                                        className={`option-btn ${answers[qIndex] === opt ? 'selected' : ''}`}
                                        onClick={() => handleSelectAnswer(qIndex, opt)}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    <button
                        className="btn"
                        style={{ marginTop: 32 }}
                        disabled={!allAnswered}
                        onClick={handleSubmit}
                    >
                        Submit Answers <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        );
    }

    if (currentView === 'review' && activeSession && currentResult) {
        return (
            <div className="container">
                <div className="card" style={{ textAlign: 'center' }}>
                    <Award size={64} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
                    <h1>{currentResult.score} / {currentResult.total}</h1>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Great effort, bro.</p>
                </div>

                <div className="coach-tip">
                    <Brain size={48} color="#F59E0B" />
                    <div>
                        <h3 style={{ margin: '0 0 8px 0', color: '#B45309' }}>Coach Tip</h3>
                        <p style={{ margin: 0, color: '#92400E', fontSize: '1.1rem', lineHeight: 1.5 }}>{activeSession.coachTip}</p>
                    </div>
                </div>

                <div className="card">
                    <h2>Audio Script Revealed</h2>
                    <p style={{ marginTop: 16, fontSize: '1.1rem', lineHeight: 1.6, padding: 16, background: 'var(--bg-color)', borderRadius: 12 }}>
                        {activeSession.text}
                    </p>
                </div>

                {currentResult.wrongQuestions.length > 0 && (
                    <div className="card">
                        <h2 style={{ color: 'var(--danger)' }}>Mistakes Review</h2>
                        {currentResult.wrongQuestions.map((wq, i) => (
                            <div key={i} className="feedback-card">
                                <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 12 }}>{wq.q}</p>
                                <p style={{ color: 'var(--danger)', marginBottom: 4 }}>❌ You chose: {wq.chosen}</p>
                                <p style={{ color: 'var(--success)', marginBottom: 12 }}>✅ Correct: {wq.correct}</p>
                                <p style={{ background: 'white', padding: 12, borderRadius: 8, fontSize: '0.95rem' }}>
                                    <strong>💡 Bro says:</strong> {wq.explanation_es}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="card">
                    <h2>Vocab Extracted</h2>
                    <div className="vocab-grid">
                        {activeSession.vocabLearned.map((v, i) => (
                            <div key={i} className="vocab-card">
                                <div className="vocab-word">{v.word} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>— {v.meaning_es}</span></div>
                                <div style={{ marginTop: 8, fontStyle: 'italic', fontSize: '0.95rem' }}>Ex: "{v.example_en}"</div>
                            </div>
                        ))}
                    </div>
                </div>

                <button className="btn" onClick={() => setCurrentView('dashboard')}>
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return null;
}
