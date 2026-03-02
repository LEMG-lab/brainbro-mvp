/**
 * Phase 15.4: Teacher Mode — lesson plans + printable worksheets.
 * Protected by parentGate.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { Lock, Unlock, ArrowLeft, Download, BookOpen, FileText, Eye, Key } from 'lucide-react';
import { isPasscodeSet, setPasscode, unlockParentGate, isParentUnlocked, lockParentGate } from '../lib/parentGate';
import { getAvailableAreas, getAvailableTiers, buildLessonPlan, buildWorksheetMd } from '../lib/teacherEngine';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

function downloadMd(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

export default function TeacherMode() {
    const [unlocked, setUnlocked] = useState(isParentUnlocked());
    const [passcodeInput, setPasscodeInput] = useState('');
    const [passError, setPassError] = useState('');
    const [isSettingNew] = useState(!isPasscodeSet());

    // Teacher state
    const [areaId, setAreaId] = useState('english');
    const [tier, setTier] = useState('1');
    const [duration, setDuration] = useState<30 | 45>(45);
    const [includeKey, setIncludeKey] = useState(false);
    const [keyConfirm, setKeyConfirm] = useState(false);
    const [preview, setPreview] = useState('');
    const [previewType, setPreviewType] = useState<'lesson' | 'worksheet' | ''>('');

    const areas = getAvailableAreas();
    const tiers = getAvailableTiers(areaId);
    const now = Date.now();

    const handleUnlock = () => {
        if (isSettingNew) {
            if (passcodeInput.length < 4) { setPassError('Mínimo 4 caracteres.'); return; }
            setPasscode(passcodeInput);
            setUnlocked(true);
        } else {
            if (unlockParentGate(passcodeInput)) { setUnlocked(true); }
            else { setPassError('Contraseña incorrecta.'); }
        }
    };

    // Gate UI
    if (!unlocked) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 400, margin: '80px auto', padding: 32 }}>
                <div className="card glass-panel" style={{ padding: 32, textAlign: 'center' }}>
                    <BookOpen size={48} color="rgb(168,85,247)" style={{ marginBottom: 16 }} />
                    <h2 style={{ color: 'var(--text-main)', fontSize: '1.3rem', marginBottom: 8 }}>Teacher Mode</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
                        {isSettingNew ? 'Set a passcode to protect this area.' : 'Enter passcode to access.'}
                    </p>
                    <input
                        type="password"
                        value={passcodeInput}
                        onChange={e => setPasscodeInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                        placeholder={isSettingNew ? 'Create passcode (min 4)' : 'Passcode'}
                        style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)', fontSize: '1rem', marginBottom: 12 }}
                    />
                    {passError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 10 }}>{passError}</div>}
                    <button onClick={handleUnlock} style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: 'rgb(168,85,247)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>
                        <Unlock size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        {isSettingNew ? 'Set & Enter' : 'Unlock'}
                    </button>
                    <Link to="/" style={{ display: 'block', marginTop: 16, color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>← Back to Dashboard</Link>
                </div>
            </motion.div>
        );
    }

    const handlePreviewLesson = () => {
        setPreview(buildLessonPlan({ areaId, tier, duration, dateNow: now }));
        setPreviewType('lesson');
    };

    const handlePreviewWorksheet = () => {
        setPreview(buildWorksheetMd({ areaId, tier, dateNow: now, includeAnswerKey: includeKey }));
        setPreviewType('worksheet');
    };

    const handleDownloadLesson = () => {
        const md = buildLessonPlan({ areaId, tier, duration, dateNow: now });
        downloadMd(md, `lesson-plan-${areaId}-${new Date(now).toISOString().split('T')[0]}.md`);
    };

    const handleDownloadWorksheet = () => {
        const md = buildWorksheetMd({ areaId, tier, dateNow: now, includeAnswerKey: includeKey });
        downloadMd(md, `worksheet-${areaId}-${new Date(now).toISOString().split('T')[0]}.md`);
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ maxWidth: 900, margin: '0 auto', padding: '20px' }}>
            {/* Header */}
            <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Link to="/parent" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}><ArrowLeft size={20} /></Link>
                    <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', fontWeight: 900 }}>
                        <BookOpen size={22} style={{ verticalAlign: 'middle', marginRight: 8, color: 'rgb(168,85,247)' }} />
                        Teacher Mode
                    </h1>
                </div>
                <button onClick={() => { lockParentGate(); setUnlocked(false); }} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Lock size={14} /> Lock
                </button>
            </motion.div>

            {/* Config */}
            <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20 }}>
                <h2 style={{ fontSize: '1rem', color: 'rgb(168,85,247)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>⚙️ Configuration</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                    {/* Area */}
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: 4 }}>Area</label>
                        <select value={areaId} onChange={e => { setAreaId(e.target.value); setTier('1'); }} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                        </select>
                    </div>
                    {/* Tier */}
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: 4 }}>Tier/Level</label>
                        <select value={tier} onChange={e => setTier(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                            {tiers.map(t => <option key={t} value={t}>Tier {t}</option>)}
                        </select>
                    </div>
                    {/* Duration */}
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: 4 }}>Duration</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setDuration(30)} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: duration === 30 ? '2px solid rgb(168,85,247)' : '1px solid var(--border)', background: duration === 30 ? 'rgba(168,85,247,0.15)' : 'transparent', color: duration === 30 ? 'rgb(168,85,247)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>30 min</button>
                            <button onClick={() => setDuration(45)} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: duration === 45 ? '2px solid rgb(168,85,247)' : '1px solid var(--border)', background: duration === 45 ? 'rgba(168,85,247,0.15)' : 'transparent', color: duration === 45 ? 'rgb(168,85,247)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>45 min</button>
                        </div>
                    </div>
                    {/* Answer Key */}
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: 4 }}>Answer Key</label>
                        {!includeKey ? (
                            <button onClick={() => setKeyConfirm(true)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <Key size={14} /> Include Key
                            </button>
                        ) : keyConfirm ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => { setIncludeKey(true); setKeyConfirm(false); }} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', background: 'rgb(168,85,247)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>Confirm</button>
                                <button onClick={() => setKeyConfirm(false)} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                            </div>
                        ) : (
                            <button onClick={() => setIncludeKey(false)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '2px solid rgb(168,85,247)', background: 'rgba(168,85,247,0.15)', color: 'rgb(168,85,247)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <Key size={14} /> Key Included ✓
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Actions */}
            <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20 }}>
                <h2 style={{ fontSize: '1rem', color: 'rgb(168,85,247)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>📄 Generate</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button onClick={handlePreviewLesson} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, rgb(168,85,247), rgb(120,60,200))', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                        <Eye size={16} /> Preview Lesson Plan
                    </button>
                    <button onClick={handleDownloadLesson} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: '1px solid rgb(168,85,247)', background: 'rgba(168,85,247,0.1)', color: 'rgb(168,85,247)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                        <Download size={16} /> Download Lesson Plan
                    </button>
                    <button onClick={handlePreviewWorksheet} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                        <FileText size={16} /> Preview Worksheet
                    </button>
                    <button onClick={handleDownloadWorksheet} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                        <Download size={16} /> Download Worksheet
                    </button>
                </div>
            </motion.div>

            {/* Preview */}
            {preview && (
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={{ fontSize: '1rem', color: 'rgb(168,85,247)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {previewType === 'lesson' ? '📋 Lesson Plan Preview' : '📝 Worksheet Preview'}
                        </h2>
                        <button onClick={() => setPreview('')} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>Close</button>
                    </div>
                    <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8, maxHeight: 600, overflow: 'auto' }}>
                        {preview}
                    </pre>
                </motion.div>
            )}
        </motion.div>
    );
}
