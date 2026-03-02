import { useState, useEffect, useRef } from 'react';
import { getHistory, getVocab, getAccent, getRate, getAdaptiveProfile, getCustomSessions, clearCustomSessions, getOnboarding, getProfile, getMistakes, getCognitiveSessions } from '../lib/storage';
import { exportBrainBroState, importBrainBroState, createSnapshot, getSnapshots, listBrainBroKeys } from '../lib/backup';
import { SCORER_VERSION } from '../lib/qualityScorer';
import { Database, Trash2, Download, Wand2, RefreshCcw, Upload, Camera, Brain, BarChart3 } from 'lucide-react';
import { APP_VERSION, BUILD_DATE } from '../lib/version';
import type { CognitiveSessionSummary, CognitiveAttempt } from '../types';
import { childLS } from '../lib/childStorage';

export default function Debug() {
    const [results, setResults] = useState<any[]>([]);
    const [vocab, setVocab] = useState<Record<string, any>>({});
    const [accent, setAccent] = useState<string>('');
    const [rate, setRate] = useState<number>(1);
    const [adaptive, setAdaptive] = useState<any>({});
    const [customSessions, setCustomSessions] = useState<any[]>([]);
    const [onboarding, setOnboarding] = useState<any>({});
    const [profile, setProfile] = useState<any>(null);
    const [mistakes, setMistakes] = useState<any>(null);
    const [importMsg, setImportMsg] = useState('');
    const [snapshots, setSnapshots] = useState<{ createdAt: string; size: number; hash: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setResults(getHistory());
        setVocab(getVocab());
        setAccent(getAccent());
        setRate(getRate());
        setAdaptive(getAdaptiveProfile());
        setCustomSessions(getCustomSessions());
        setOnboarding(getOnboarding());
        setProfile(getProfile());
        setMistakes(getMistakes());
        setSnapshots(getSnapshots());
    }, []);

    const handleClear = () => {
        if (confirm('Are you sure you want to clear ALL data?')) {
            listBrainBroKeys().forEach(k => childLS.removeItem(k));
            clearCustomSessions();
            window.location.reload();
        }
    };

    const handleClearGenerated = () => {
        if (confirm('Clear Generated Sessions?')) { clearCustomSessions(); window.location.reload(); }
    };

    const handleResetOnboarding = () => {
        if (confirm('Reset Onboarding?')) { childLS.removeItem('brainbro_onboarding_v1'); window.location.reload(); }
    };
    const handleResetProfile = () => {
        if (confirm('Reset Profile?')) { childLS.removeItem('brainbro_profile_v1'); window.location.reload(); }
    };
    const handleResetMistakes = () => {
        if (confirm('Reset Mistakes?')) { childLS.removeItem('brainbro_mistakes_v1'); window.location.reload(); }
    };
    const handleResetPronunciation = () => {
        if (confirm('Reset Pronunciation?')) { childLS.removeItem('brainbro_pronunciation_v1'); window.location.reload(); }
    };

    const handleDownloadBackup = () => {
        const json = exportBrainBroState();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brainbro-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = importBrainBroState(reader.result as string);
            if (result.ok) {
                setImportMsg('✅ Backup restored successfully. Reloading...');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setImportMsg(`❌ Import failed: ${(result.errors || []).join(', ')}`);
            }
        };
        reader.readAsText(file);
    };

    const handleCreateSnapshot = () => {
        createSnapshot();
        setSnapshots(getSnapshots());
        setImportMsg('📸 Snapshot created');
        setTimeout(() => setImportMsg(''), 2000);
    };

    // ─── Cognitive Telemetry Data ───
    const cogSessions: CognitiveSessionSummary[] = getCognitiveSessions();
    const allAttempts: CognitiveAttempt[] = cogSessions.flatMap(s => s.attempts || []).slice(-50);

    const confBuckets = [0, 0, 0, 0, 0];
    let defaultConfCount = 0;
    let aiCount = 0;
    let heuristicCount = 0;
    const errorCounts: Record<string, number> = {};
    const recentNotes: string[] = [];

    allAttempts.forEach(a => {
        const c = a.confidence ?? 50;
        if (c <= 20) confBuckets[0]++;
        else if (c <= 40) confBuckets[1]++;
        else if (c <= 60) confBuckets[2]++;
        else if (c <= 80) confBuckets[3]++;
        else confBuckets[4]++;

        if (c === 50) defaultConfCount++;
        if (a.scoringMode === 'ai') aiCount++;
        else heuristicCount++;

        if (a.errorType && a.errorType !== 'unknown' && !a.isCorrect) {
            errorCounts[a.errorType] = (errorCounts[a.errorType] || 0) + 1;
        }
        if (a.scoringNotes && recentNotes.length < 5) {
            recentNotes.push(a.scoringNotes.length > 60 ? a.scoringNotes.slice(0, 60) + '…' : a.scoringNotes);
        }
    });

    const overconfWrong = allAttempts.filter(a => (a.confidence ?? 50) >= 80 && !a.isCorrect).length;
    const defaultPct = allAttempts.length > 0 ? Math.round(100 * defaultConfCount / allAttempts.length) : 0;
    const topErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const totalScored = aiCount + heuristicCount;
    const aiPct = totalScored > 0 ? Math.round(100 * aiCount / totalScored) : 0;

    const cardStyle = { background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8, textAlign: 'center' as const, border: '1px solid var(--border)' };
    const labelStyle = { fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' as const, fontWeight: 800, letterSpacing: '1px', marginBottom: 6 };
    const valStyle = { fontSize: '1.8rem', fontWeight: 900 };

    return (
        <div>
            <h1 style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Database color="var(--primary)" /> System Debug Panel
            </h1>

            <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 32 }}>
                <div><div className="stat-label">Total Sessions</div><div className="stat-val" style={{ fontSize: '2rem' }}>{results.length}</div></div>
                <div><div className="stat-label">Total Vocab</div><div className="stat-val" style={{ fontSize: '2rem' }}>{Object.keys(vocab).length}</div></div>
                <div><div className="stat-label">Generated Sessions</div><div className="stat-val" style={{ fontSize: '2rem', color: 'var(--primary)' }}>{customSessions.length}</div></div>
                <div><div className="stat-label">Accent</div><div className="stat-val" style={{ fontSize: '1.5rem' }}>{accent}</div></div>
                <div><div className="stat-label">Rate</div><div className="stat-val" style={{ fontSize: '1.5rem' }}>{rate}x</div></div>
                <div><div className="stat-label">Onboarding</div><div className="stat-val" style={{ fontSize: '1.5rem', color: onboarding.completed ? 'var(--success)' : 'var(--warning)' }}>{onboarding.completed ? 'Done' : 'Pending'}</div></div>
                <div><div className="stat-label">Snapshots</div><div className="stat-val" style={{ fontSize: '1.5rem' }}>{snapshots.length}</div></div>
                <div><div className="stat-label">Scorer Version</div><div className="stat-val" style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>{SCORER_VERSION}</div></div>
            </div>

            {/* ─── Backup / Restore ─── */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn" style={{ width: 'auto', background: 'var(--success)' }} onClick={handleDownloadBackup}>
                    <Download size={18} /> Download Backup
                </button>
                <button className="btn" style={{ width: 'auto', background: 'var(--accent-primary)' }} onClick={() => fileInputRef.current?.click()}>
                    <Upload size={18} /> Restore from Backup
                </button>
                <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleRestore} />
                <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleCreateSnapshot}>
                    <Camera size={18} /> Create Snapshot
                </button>
                {importMsg && <span style={{ padding: '8px 16px', borderRadius: 8, background: importMsg.includes('✅') ? 'rgba(16,185,129,0.1)' : importMsg.includes('📸') ? 'rgba(139,92,246,0.1)' : 'rgba(244,63,94,0.1)', color: importMsg.includes('❌') ? 'var(--danger)' : 'var(--success)', fontSize: '0.9rem' }}>{importMsg}</span>}
            </div>

            {/* ─── Reset Buttons ─── */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleResetOnboarding}><RefreshCcw size={16} /> Onboarding</button>
                <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleResetProfile}><RefreshCcw size={16} /> Profile</button>
                <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleResetMistakes}><RefreshCcw size={16} /> Mistakes</button>
                <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleResetPronunciation}><RefreshCcw size={16} /> Pronunciation</button>
                <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleClearGenerated}><Wand2 size={16} /> Generated</button>
                <button className="btn" style={{ width: 'auto', background: 'var(--danger)' }} onClick={handleClear}><Trash2 size={16} /> Clear ALL</button>
            </div>

            {/* ─── Cognitive Telemetry ─── */}
            <div className="card" style={{ marginBottom: 32 }}>
                <h2 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Brain size={22} color="var(--accent-primary)" /> Cognitive Telemetry <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(last 50 attempts)</span>
                </h2>

                {allAttempts.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No cognitive data yet. Complete a session to generate telemetry.</p>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
                            <div style={cardStyle}>
                                <div style={labelStyle}>Overconf Wrong</div>
                                <div style={{ ...valStyle, color: overconfWrong > 3 ? 'var(--danger)' : 'var(--text-main)' }}>{overconfWrong}</div>
                            </div>
                            <div style={cardStyle}>
                                <div style={labelStyle}>Default Conf %</div>
                                <div style={{ ...valStyle, color: defaultPct > 60 ? 'var(--warning)' : 'var(--success)' }}>{defaultPct}%</div>
                            </div>
                            <div style={cardStyle}>
                                <div style={labelStyle}>AI Scoring %</div>
                                <div style={{ ...valStyle, color: 'var(--accent-primary)' }}>{aiPct}%</div>
                            </div>
                            <div style={cardStyle}>
                                <div style={labelStyle}>Total Attempts</div>
                                <div style={valStyle}>{allAttempts.length}</div>
                            </div>
                        </div>

                        <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={18} /> Confidence Distribution</h3>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                            {['0-20', '21-40', '41-60', '61-80', '81-100'].map((label, i) => (
                                <div key={label} style={{ ...cardStyle, flex: '1 1 80px', minWidth: 80 }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: i === 4 ? 'var(--danger)' : i === 2 ? 'var(--warning)' : 'var(--text-main)' }}>{confBuckets[i]}</div>
                                </div>
                            ))}
                        </div>

                        {topErrors.length > 0 && (
                            <>
                                <h3 style={{ marginBottom: 8 }}>Top Error Types</h3>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                                    {topErrors.map(([type, count]) => (
                                        <span key={type} style={{ padding: '6px 14px', borderRadius: 16, background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 700 }}>
                                            {type}: {count}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}

                        {recentNotes.length > 0 && (
                            <>
                                <h3 style={{ marginBottom: 8 }}>Recent Scoring Notes</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
                                    {recentNotes.map((n, i) => (
                                        <div key={i} style={{ padding: '4px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{n}</div>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* ─── Snapshots ─── */}
            {snapshots.length > 0 && (
                <div className="card" style={{ marginBottom: 32 }}>
                    <h2 style={{ marginBottom: 16 }}>Snapshots ({snapshots.length})</h2>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {snapshots.map((s, i) => (
                            <div key={i} style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                <span>{new Date(s.createdAt).toLocaleString()}</span>
                                <span>{(s.size / 1024).toFixed(1)} KB • #{s.hash}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Raw Data Sections ─── */}
            {[
                ['Profile v1', profile],
                ['Adaptive Profile', adaptive],
                ['Results', results],
                ['Mistakes v1', mistakes],
                ['Vocabulary', vocab],
            ].map(([label, data]) => (
                <div className="card" style={{ marginBottom: 32 }} key={label as string}>
                    <h2 style={{ marginBottom: 16 }}>Raw: {label as string}</h2>
                    <pre style={{ background: 'var(--bg-color)', padding: 16, borderRadius: 8, overflowX: 'auto', fontSize: '0.85rem', color: 'var(--text-main)', border: '1px solid var(--border)', maxHeight: 300 }}>
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            ))}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.5 }}>v{APP_VERSION} · {BUILD_DATE}</span>
                <div style={{ display: 'flex', gap: 12 }}>
                    <a href="/smoke" style={{ color: 'rgb(245,158,11)', fontSize: '0.75rem', opacity: 0.6, textDecoration: 'none', fontWeight: 700 }}>🧪 Smoke Test</a>
                    <a href="/parent" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', opacity: 0.4, textDecoration: 'none' }}>Parent →</a>
                </div>
            </div>
        </div>
    );
}
