/**
 * Phase 15.0: Parent Dashboard (POP) — visibility, control, accountability.
 * Protected by parent gate passcode.
 */

import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { Shield, Lock, Unlock, Download, Trash2, TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, ArrowLeft, Users, UserPlus, UserMinus, Zap, RefreshCw } from 'lucide-react';
import { isPasscodeSet, setPasscode, unlockParentGate, isParentUnlocked, lockParentGate } from '../lib/parentGate';
import { getOpsSummary, generateWeeklyReport, type OpsSummary } from '../lib/parentOps';
import { exportBrainBroState, exportEncryptedSyncPackage, importEncryptedSyncPackage, type SyncScope } from '../lib/backup';
import { saveCognitiveProfile, getCognitiveProfile, getWeeklyProgramConfig, saveWeeklyProgramConfig, saveDailyPlan, getHistory, getDebrief, saveDebrief, appendOutcomeSurvey, getOutcomeSurvey } from '../lib/storage';
import { getRegistry, addChild, removeChild, setActiveChild, updateChildAgeBand } from '../lib/childStorage';
import type { AgeBand, WeeklyProgramConfig } from '../types';
import { isCryptoAvailable } from '../lib/cryptoPack';
import { growthAreas } from '../data/growthAreas';
import { generateDailyPlan } from '../lib/programEngine';
import { buildDebrief, getDebriefWeekKey } from '../lib/debriefEngine';
import { APP_VERSION } from '../lib/version';
import { OUTCOME_ITEMS, getOutcomeWeekKey, computeOutcomeEwma, buildOutcomeInsights } from '../lib/outcomeEngine';
import type { OutcomeSurveyItemId, ExperimentVariantId } from '../types';
import { getDateKey, addDays, isExperimentActive, computeExperimentResult, getDaysRemaining, getVerdict, VARIANT_LABELS } from '../lib/experimentEngine';
import { appendExperimentResult, getExperimentResults } from '../lib/storage';
import { recomputeLedgerForToday } from '../lib/ledgerEngine';
import SparklineBars from '../components/SparklineBars';
import { detectEarlyWarnings, computeTrendLabel } from '../lib/trendEngine';
import { getLedgerRange, patchWeeklyProgramConfig } from '../lib/storage';
import { getHighestPriorityPlaybook } from '../lib/playbookEngine';
import { getContractWeekKey, suggestDefaultContract, computeContractCompliance, exportContractMarkdown } from '../lib/contractEngine';
import { getGoalContract, saveGoalContract } from '../lib/storage';
import type { GoalContract } from '../types';
import { getLaunchMetrics } from '../lib/launchAnalytics';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

function downloadFile(content: string, filename: string, type: string = 'text/markdown') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

export default function ParentDashboard() {
    const [unlocked, setUnlocked] = useState(isParentUnlocked());
    const [passcodeInput, setPasscodeInput] = useState('');
    const [passError, setPassError] = useState('');
    const [isSettingNew] = useState(!isPasscodeSet());
    const [period, setPeriod] = useState<7 | 30>(7);
    const [resetConfirm, setResetConfirm] = useState(false);
    const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
    const registry = getRegistry();
    const activeChild = registry.children.find(c => c.id === registry.activeChildId);
    const [syncMsg, setSyncMsg] = useState('');
    const syncFileRef = useRef<HTMLInputElement>(null);
    const hasCrypto = isCryptoAvailable();

    // Phase 16.1: Debrief
    const [debriefMd, setDebriefMd] = useState<string | null>(() => {
        if (!activeChild) return null;
        const existing = getDebrief(getDebriefWeekKey(Date.now()), activeChild.id);
        return existing ? existing.md : null;
    });
    const [debriefLoading, setDebriefLoading] = useState(false);
    const [debriefExpanded, setDebriefExpanded] = useState(false);

    // Phase 16.3: Outcome Survey
    const outcomeWeekKey = getOutcomeWeekKey(Date.now());
    const existingOutcome = activeChild ? getOutcomeSurvey(outcomeWeekKey, activeChild.id) : null;
    const [outcomeRatings, setOutcomeRatings] = useState<Record<string, number>>(
        existingOutcome ? existingOutcome.ratings : Object.fromEntries(OUTCOME_ITEMS.map(i => [i.id, 3]))
    );
    const [outcomeNotes, setOutcomeNotes] = useState(existingOutcome?.notes || '');
    const [outcomeSaved, setOutcomeSaved] = useState(!!existingOutcome);
    const [outcomeInsights, setOutcomeInsights] = useState<string[]>([]);

    // Phase 16.4: Experiment Mode
    const profile = getCognitiveProfile();
    const expCfg = profile?.currentExperiment;
    const todayKey = getDateKey(Date.now());
    const expActive = isExperimentActive(expCfg, todayKey);
    const [selectedVariant, setSelectedVariant] = useState<ExperimentVariantId>('oc_penalty_strict');
    const [expResults] = useState(() => getExperimentResults().slice(0, 3));

    // Phase 16.6: Trend Sparklines
    const ledger7 = getLedgerRange(7);
    const ledger7Chrono = [...ledger7].reverse();
    const earlyWarnings = detectEarlyWarnings(ledger7);
    const [showPlaybook, setShowPlaybook] = useState(false);
    const [playbookApplied, setPlaybookApplied] = useState(false);
    const topPlaybook = getHighestPriorityPlaybook(earlyWarnings);

    // Phase 16.9: Goal Contract
    const contractWeek = getContractWeekKey();
    const existingContract = getGoalContract(contractWeek, activeChild?.id || '');
    const defaultContract = activeChild ? suggestDefaultContract(activeChild.id) : null;
    const [contractMode, setContractMode] = useState<'view' | 'edit'>(existingContract ? 'view' : 'edit');
    const [cAcademic, setCacademic] = useState(existingContract?.academicGoal || defaultContract?.academicGoal || '');
    const [cBehavior, setCbehavior] = useState(existingContract?.behaviorGoal || defaultContract?.behaviorGoal || '');
    const [cIntegrity, setCintegrity] = useState(existingContract?.integrityGoal || defaultContract?.integrityGoal || 75);
    const [cParentName, setCparentName] = useState(existingContract?.parentName || '');
    const [cChildName, setCchildName] = useState(existingContract?.childName || '');
    const [cSaved, setCsaved] = useState(!!existingContract);
    const compliance = existingContract ? computeContractCompliance(existingContract) : null;
    const adoptionMetrics = getLaunchMetrics();

    // Phase 15.5: AWP
    const activeAreas = growthAreas.filter(a => a.status === 'active');
    const defaultWeights: Record<string, number> = {};
    activeAreas.forEach(a => { defaultWeights[a.id] = 5; });
    const [awpCfg, setAwpCfg] = useState<WeeklyProgramConfig>(() => {
        const saved = getWeeklyProgramConfig();
        return saved || { enabled: false, weeklyMinutes: 120, areaWeights: defaultWeights };
    });
    const updateAwpCfg = (patch: Partial<WeeklyProgramConfig>) => {
        const next = { ...awpCfg, ...patch };
        setAwpCfg(next);
        saveWeeklyProgramConfig(next);
    };
    const regeneratePlan = () => {
        const plan = generateDailyPlan({ now: Date.now(), cfg: awpCfg });
        if (plan) saveDailyPlan(plan);
    };
    // Weekly adherence calc
    const history = getHistory();
    const now7 = Date.now();
    const weekMs = 7 * 86400000;
    const weekSessions = history.filter(r => (now7 - new Date(r.date).getTime()) < weekMs);
    const completedMinutes = weekSessions.length * 10; // ~10 min per session estimate
    const adherencePct = awpCfg.weeklyMinutes > 0 ? Math.min(100, Math.round((completedMinutes / awpCfg.weeklyMinutes) * 100)) : 0;

    const handleUnlock = () => {
        if (isSettingNew) {
            if (passcodeInput.length < 4) { setPassError('Mínimo 4 caracteres.'); return; }
            setPasscode(passcodeInput);
            setUnlocked(true);
            setPassError('');
        } else {
            if (unlockParentGate(passcodeInput)) {
                setUnlocked(true);
                setPassError('');
            } else {
                setPassError('Contraseña incorrecta.');
            }
        }
    };

    const handleLock = () => { lockParentGate(); setUnlocked(false); setPasscodeInput(''); };

    const handleEncryptedExport = async (scope: SyncScope) => {
        setSyncMsg('');
        const pass1 = prompt('Create a passphrase (≥8 characters):');
        if (!pass1 || pass1.length < 8) { setSyncMsg('❌ Passphrase must be at least 8 characters.'); return; }
        const pass2 = prompt('Confirm passphrase:');
        if (pass1 !== pass2) { setSyncMsg('❌ Passphrases do not match.'); return; }
        try {
            const json = await exportEncryptedSyncPackage(scope, pass1);
            downloadFile(json, `brainbro-sync-${scope === 'active_child' ? (activeChild?.name || 'child').replace(/\s+/g, '_') : 'all'}-${new Date().toISOString().split('T')[0]}.brainbro`, 'application/json');
            setSyncMsg('✅ Encrypted sync file downloaded.');
        } catch (e: any) {
            setSyncMsg(`❌ Export failed: ${e?.message || 'unknown'}`);
        }
    };

    const handleSyncImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setSyncMsg('');
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        const pass = prompt('Enter passphrase to decrypt:');
        if (!pass) { setSyncMsg('❌ Passphrase required.'); return; }
        try {
            const result = await importEncryptedSyncPackage(pass, text);
            if (result.ok) {
                setSyncMsg(`✅ Imported ${result.childrenCount} child(ren). Reloading...`);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setSyncMsg(`❌ ${result.errors?.join(' ') || 'Import failed.'}`);
            }
        } catch (e: any) {
            setSyncMsg(`❌ ${e?.message || 'Decryption failed.'}`);
        }
        if (syncFileRef.current) syncFileRef.current.value = '';
    };

    // Gate UI
    if (!unlocked) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 400, margin: '80px auto', padding: 32 }}>
                <div className="card glass-panel" style={{ padding: 32, textAlign: 'center' }}>
                    <Shield size={48} color="rgb(168,85,247)" style={{ marginBottom: 16 }} />
                    <h2 style={{ color: 'var(--text-main)', fontSize: '1.3rem', marginBottom: 8 }}>Parent Dashboard</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
                        {isSettingNew ? 'Set a passcode to protect this dashboard.' : 'Enter your passcode to access.'}
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

    // Dashboard
    const summary: OpsSummary = getOpsSummary(period);
    const m = summary.metrics;

    return (
        <>
            <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ maxWidth: 900, margin: '0 auto', padding: '20px' }}>
                {/* Header */}
                <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}><ArrowLeft size={20} /></Link>
                        <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', fontWeight: 900 }}>
                            <Shield size={22} style={{ verticalAlign: 'middle', marginRight: 8, color: 'rgb(168,85,247)' }} />
                            Parent Ops Dashboard
                        </h1>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setPeriod(7)} style={{ padding: '6px 14px', borderRadius: 6, border: period === 7 ? '2px solid rgb(168,85,247)' : '1px solid var(--border)', background: period === 7 ? 'rgba(168,85,247,0.15)' : 'transparent', color: period === 7 ? 'rgb(168,85,247)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>7 Days</button>
                        <button onClick={() => setPeriod(30)} style={{ padding: '6px 14px', borderRadius: 6, border: period === 30 ? '2px solid rgb(168,85,247)' : '1px solid var(--border)', background: period === 30 ? 'rgba(168,85,247,0.15)' : 'transparent', color: period === 30 ? 'rgb(168,85,247)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>30 Days</button>
                        <button onClick={handleLock} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Lock size={14} /> Lock
                        </button>
                        <Link to="/timeline" style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>Timeline</Link>
                    </div>
                </motion.div>

                {/* Phase 16.6: Early Warning Banner */}
                {earlyWarnings.length > 0 && (
                    <motion.div variants={itemVariants} style={{ marginBottom: 16 }}>
                        {earlyWarnings.map((w, i) => (
                            <div key={i} style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--danger)' }}>{w.label} trending down 3 days</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>💡 {w.suggestion}</div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* Phase 16.7: Intervention Playbook */}
                {topPlaybook && (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 20, marginBottom: 16, border: '1px solid rgba(251,146,60,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <h2 style={{ fontSize: '0.9rem', color: 'rgb(251,146,60)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                \ud83d\udcd6 Playbook: {topPlaybook.title}
                            </h2>
                            <button onClick={() => setShowPlaybook(!showPlaybook)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(251,146,60,0.3)', background: 'transparent', color: 'rgb(251,146,60)', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}>
                                {showPlaybook ? 'Hide' : 'View Playbook'}
                            </button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>{topPlaybook.why}</p>

                        {showPlaybook && (
                            <div style={{ marginTop: 14 }}>
                                {([['\u23f0 Next 24h', topPlaybook.next24h], ['\ud83d\udcc5 Next 7 days', topPlaybook.next7d], ['\ud83d\uded1 Stop Doing', topPlaybook.stopDoing], ['\u2705 Success Looks Like', topPlaybook.successLooksLike]] as [string, string[]][]).map(([title, items]) => (
                                    <div key={title} style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>{title}</div>
                                        {items.map((item, i) => (
                                            <div key={i} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5, paddingLeft: 10, borderLeft: '2px solid rgba(251,146,60,0.2)', marginBottom: 3 }}>{item}</div>
                                        ))}
                                    </div>
                                ))}

                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                    {topPlaybook.recommendedConfigPatch && (
                                        <button
                                            onClick={() => {
                                                if (topPlaybook.recommendedConfigPatch && confirm('\u00bfAplicar cambios recomendados al Autopilot?')) {
                                                    patchWeeklyProgramConfig(topPlaybook.recommendedConfigPatch);
                                                    setPlaybookApplied(true);
                                                }
                                            }}
                                            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: playbookApplied ? 'rgba(16,185,129,0.15)' : 'rgb(251,146,60)', color: playbookApplied ? 'rgb(16,185,129)' : '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                                        >
                                            {playbookApplied ? '\u2713 Applied to Autopilot' : '\u2699\ufe0f Apply to Autopilot'}
                                        </button>
                                    )}
                                    {topPlaybook.recommendedExperiment && (
                                        <button
                                            onClick={() => {
                                                if (topPlaybook.recommendedExperiment) setSelectedVariant(topPlaybook.recommendedExperiment);
                                            }}
                                            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(139,92,246,0.3)', background: 'transparent', color: 'rgb(139,92,246)', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                                        >
                                            \ud83e\uddea Suggest Experiment
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Phase 16.6: 7-Day Trends */}
                {ledger7Chrono.length > 0 && (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 20, marginBottom: 20, border: '1px solid rgba(59,130,246,0.2)' }}>
                        <h2 style={{ fontSize: '0.9rem', color: 'rgb(59,130,246)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            📈 7-Day Trends
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            {[
                                { key: 'minutesCompleted', label: 'Minutes', unit: 'min', invert: false },
                                { key: 'planIntegrity', label: 'Plan Integrity', unit: '%', invert: false },
                                { key: 'calibration', label: 'Calibration', unit: '%', invert: false },
                                { key: 'overconfidence', label: 'Overconfidence', unit: '', invert: true },
                                { key: 'followThrough', label: 'Follow-Through', unit: '', invert: false },
                                { key: 'outcomeAvg', label: 'Outcome Avg', unit: '/5', invert: false },
                            ].map(({ key, label, unit, invert }) => {
                                const vals = ledger7Chrono.map((e: any) => e.metrics[key] ?? 0);
                                const last = vals[vals.length - 1];
                                const trend = computeTrendLabel(vals);
                                const trendIcon = trend === 'up' ? (invert ? '🔻' : '🔺') : trend === 'down' ? (invert ? '🔺' : '🔻') : '▪';
                                return (
                                    <div key={key} style={{ background: 'rgba(0,0,0,0.15)', padding: 10, borderRadius: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{typeof last === 'number' ? (last < 1 && !unit ? (last * 100).toFixed(0) + '%' : last.toFixed(1)) : '-'}{unit && last >= 1 ? unit : ''}</span>
                                        </div>
                                        <SparklineBars values={vals} height={20} invertColor={invert} />
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 3, textAlign: 'right' }}>{trendIcon}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Phase 15.1: Child Management */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 20, marginBottom: 20 }}>
                    <h2 style={{ fontSize: '1rem', color: 'rgb(168,85,247)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Users size={18} /> Children ({registry.children.length})
                    </h2>
                    <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                        {registry.children.map(c => (
                            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: c.id === registry.activeChildId ? 'rgba(168,85,247,0.1)' : 'rgba(0,0,0,0.2)', borderRadius: 8, border: c.id === registry.activeChildId ? '1px solid rgb(168,85,247)' : '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ color: 'var(--text-main)', fontWeight: c.id === registry.activeChildId ? 800 : 500, fontSize: '0.9rem' }}>{c.name}</span>
                                    {c.id === registry.activeChildId && <span style={{ color: 'rgb(168,85,247)', fontSize: '0.75rem', fontWeight: 800 }}>ACTIVE</span>}
                                    <select value={c.ageBand || '9-11'} onChange={e => { updateChildAgeBand(c.id, e.target.value as AgeBand); window.location.reload(); }} style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer' }}>
                                        <option value="6-8">6-8 yrs</option>
                                        <option value="9-11">9-11 yrs</option>
                                        <option value="12-14">12-14 yrs</option>
                                        <option value="15-18">15-18 yrs</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {c.id !== registry.activeChildId && (
                                        <button onClick={() => { setActiveChild(c.id); window.location.reload(); }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>Switch</button>
                                    )}
                                    {registry.children.length > 1 && (
                                        removeConfirmId === c.id ? (
                                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                <button onClick={() => { removeChild(c.id); setRemoveConfirmId(null); window.location.reload(); }} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: 'var(--danger)', color: '#fff', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 700 }}>Confirm</button>
                                                <button onClick={() => setRemoveConfirmId(null)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer' }}>Cancel</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setRemoveConfirmId(c.id)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.7rem' }}><UserMinus size={12} /></button>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => { const name = prompt('Name for new child:'); if (name?.trim()) { addChild(name.trim()); window.location.reload(); } }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                        <UserPlus size={16} /> Add Child
                    </button>
                    <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Viewing metrics for: <strong style={{ color: 'var(--text-main)' }}>{activeChild?.name || 'Unknown'}</strong></div>
                </motion.div>

                {/* Core Metrics Grid */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20 }}>
                    <h2 style={{ fontSize: '1rem', color: 'rgb(168,85,247)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Core Metrics</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                        {[
                            { label: 'Calibration', value: `${Math.round(m.calibration)}%`, color: m.calibration >= 60 ? 'var(--success)' : m.calibration >= 40 ? 'var(--warning)' : 'var(--danger)' },
                            { label: 'Overconfidence', value: `${Math.round(m.overconfidence * 100)}%`, color: m.overconfidence <= 0.2 ? 'var(--success)' : m.overconfidence <= 0.3 ? 'var(--warning)' : 'var(--danger)' },
                            { label: 'Reflection', value: `${Math.round(m.reflection * 100)}%`, color: m.reflection >= 0.6 ? 'var(--success)' : m.reflection >= 0.4 ? 'var(--warning)' : 'var(--danger)' },
                            { label: 'Meta-Cognition', value: `${m.metaCognition.toFixed(1)}/5`, color: m.metaCognition >= 3 ? 'var(--success)' : m.metaCognition >= 2 ? 'var(--warning)' : 'var(--danger)' },
                            { label: 'Adversarial', value: `${Math.round(m.adversarialPass * 100)}%`, color: m.adversarialPass >= 0.7 ? 'var(--success)' : m.adversarialPass >= 0.4 ? 'var(--warning)' : 'var(--danger)' },
                            { label: 'Decision Lab', value: `${m.decisionLabEwma.toFixed(1)}/5`, color: m.decisionLabEwma >= 3 ? 'var(--success)' : m.decisionLabEwma >= 2 ? 'var(--warning)' : 'var(--danger)' },
                            { label: 'Sessions', value: `${summary.sessionsCount}`, color: 'var(--accent-primary)' },
                            { label: 'XP Total', value: `${summary.xpTotal}`, color: 'var(--accent-primary)' },
                        ].map(met => (
                            <div key={met.label} style={{ background: 'rgba(0,0,0,0.3)', padding: 14, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 6 }}>{met.label}</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: met.color }}>{met.value}</div>
                            </div>
                        ))}
                    </div>
                    {/* Vocab row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>Vocab Due</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: m.vocabDue > 0 ? 'var(--warning)' : 'var(--success)' }}>{m.vocabDue}</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>Mastered</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)' }}>{m.vocabMastered}</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>Total</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{m.vocabTotal}</div>
                        </div>
                    </div>
                </motion.div>

                {/* Trends */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20 }}>
                    <h2 style={{ fontSize: '1rem', color: 'rgb(168,85,247)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Trends ({period}d vs prev {period}d)</h2>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {summary.trends.map(t => (
                            <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                <span style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem' }}>{t.label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.previous}{t.unit}</span>
                                    <span style={{ fontSize: '0.85rem' }}>→</span>
                                    <span style={{ fontWeight: 700, color: t.direction === 'up' ? 'var(--success)' : t.direction === 'down' ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.9rem' }}>{t.current}{t.unit}</span>
                                    {t.direction === 'up' ? <TrendingUp size={16} color="var(--success)" /> : t.direction === 'down' ? <TrendingDown size={16} color="var(--danger)" /> : <Minus size={14} color="var(--text-muted)" />}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Flags */}
                {summary.flags.length > 0 && (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.03)' }}>
                        <h2 style={{ fontSize: '1rem', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertTriangle size={18} /> Flags
                        </h2>
                        <div style={{ display: 'grid', gap: 8 }}>
                            {summary.flags.map((f, i) => (
                                <div key={i} style={{ padding: '8px 14px', background: f.severity === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.08)', borderRadius: 8, fontSize: '0.9rem', color: f.severity === 'critical' ? 'var(--danger)' : 'var(--warning)', fontWeight: 600, borderLeft: `3px solid ${f.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'}` }}>
                                    {f.message}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Interventions */}
                {summary.interventions.length > 0 && (
                    <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.03)' }}>
                        <h2 style={{ fontSize: '1rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Lightbulb size={18} /> Recommended Interventions
                        </h2>
                        <div style={{ display: 'grid', gap: 8 }}>
                            {summary.interventions.map((iv, i) => (
                                <div key={i} style={{ padding: '8px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, fontSize: '0.9rem', color: 'var(--text-main)', borderLeft: `3px solid ${iv.priority === 'high' ? 'var(--danger)' : iv.priority === 'medium' ? 'var(--warning)' : 'var(--success)'}` }}>
                                    <span style={{ color: iv.priority === 'high' ? 'var(--danger)' : iv.priority === 'medium' ? 'var(--warning)' : 'var(--success)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', marginRight: 8 }}>{iv.priority}</span>
                                    {iv.message}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Phase 15.5: Autopilot Program */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(168,85,247,0.25)' }}>
                    <h2 style={{ fontSize: '1rem', color: 'rgb(168,85,247)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Zap size={18} /> Autopilot Program
                    </h2>

                    {/* Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                        <span style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem' }}>Autopilot Enabled</span>
                        <button
                            onClick={() => updateAwpCfg({ enabled: !awpCfg.enabled })}
                            style={{ width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative', background: awpCfg.enabled ? 'rgb(168,85,247)' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s' }}
                        >
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: awpCfg.enabled ? 25 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                        </button>
                    </div>

                    {awpCfg.enabled && (
                        <>
                            {/* Weekly minutes */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>Weekly Target</span>
                                    <span style={{ color: 'var(--text-main)', fontWeight: 900, fontSize: '0.9rem' }}>{awpCfg.weeklyMinutes} min</span>
                                </div>
                                <input
                                    type="range" min={60} max={300} step={10} value={awpCfg.weeklyMinutes}
                                    onChange={e => updateAwpCfg({ weeklyMinutes: Number(e.target.value) })}
                                    style={{ width: '100%', accentColor: 'rgb(168,85,247)' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    <span>60 min</span><span>300 min</span>
                                </div>
                            </div>

                            {/* Area weights */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, marginBottom: 8 }}>Area Weights</div>
                                {activeAreas.map(a => (
                                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                        <span style={{ width: 70, color: 'var(--text-main)', fontSize: '0.8rem', fontWeight: 600 }}>{a.name}</span>
                                        <input
                                            type="range" min={0} max={10} step={1}
                                            value={awpCfg.areaWeights[a.id] ?? 5}
                                            onChange={e => updateAwpCfg({ areaWeights: { ...awpCfg.areaWeights, [a.id]: Number(e.target.value) } })}
                                            style={{ flex: 1, accentColor: 'rgb(168,85,247)' }}
                                        />
                                        <span style={{ width: 20, textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 800 }}>{awpCfg.areaWeights[a.id] ?? 5}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Regenerate */}
                            <button
                                onClick={regeneratePlan}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: 'none', background: 'rgb(168,85,247)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', marginBottom: 16 }}
                            >
                                <RefreshCw size={16} /> Regenerate Today's Plan
                            </button>

                            {/* Weekly Summary */}
                            <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Weekly Summary</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{completedMinutes}/{awpCfg.weeklyMinutes}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Minutes (7d)</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: adherencePct >= 80 ? 'var(--success)' : adherencePct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{adherencePct}%</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Adherence</div>
                                    </div>
                                </div>
                            </div>

                            {/* Plan Integrity — Phase 15.6 */}
                            <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, marginTop: 10 }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Plan Integrity</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: summary.planIntegrity.avg7d >= 80 ? 'var(--success)' : summary.planIntegrity.avg7d >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{summary.planIntegrity.avg7d}%</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Avg Score (7d)</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: summary.planIntegrity.flaggedDays === 0 ? 'var(--success)' : 'var(--danger)' }}>{summary.planIntegrity.flaggedDays}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Flagged Days</div>
                                    </div>
                                </div>
                                {summary.planIntegrity.flags.length > 0 && (
                                    <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--warning)' }}>
                                        ⚠ {summary.planIntegrity.flags.join(', ')}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </motion.div>

                {/* Phase 15.7: Follow-Through */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(34,197,94,0.25)' }}>
                    <h2 style={{ fontSize: '1rem', color: 'rgb(34,197,94)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        🎯 Follow-Through (7d)
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: summary.followThrough.rate >= 0.7 ? 'var(--success)' : summary.followThrough.rate >= 0.4 ? 'var(--warning)' : 'var(--danger)' }}>{Math.round(summary.followThrough.rate * 100)}%</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rate</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)' }}>{summary.followThrough.completed}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Done</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: summary.followThrough.skipped > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{summary.followThrough.skipped}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Skipped</div>
                        </div>
                    </div>
                </motion.div>

                {/* Phase 15.8: Writing */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(168,85,247,0.25)' }}>
                    <h2 style={{ fontSize: '1rem', color: 'rgb(168,85,247)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        ✍️ Writing & Argumentation
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: summary.writing.lastNotes ? 12 : 0 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: summary.writing.ewma >= 3 ? 'var(--success)' : summary.writing.ewma >= 2 ? 'var(--warning)' : 'var(--text-muted)' }}>{summary.writing.ewma.toFixed(1)}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EWMA /5</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{summary.writing.completed}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Completed</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: summary.writing.lastScore !== null && summary.writing.lastScore >= 15 ? 'var(--success)' : 'var(--warning)' }}>{summary.writing.lastScore !== null ? `${summary.writing.lastScore}/25` : '—'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Last Score</div>
                        </div>
                    </div>
                    {summary.writing.lastNotes && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 6, lineHeight: 1.5 }}>{summary.writing.lastNotes}</div>
                    )}
                </motion.div>

                {/* Phase 15.9: Reading */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(14,165,233,0.25)' }}>
                    <h2 style={{ fontSize: '1rem', color: 'rgb(14,165,233)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        📖 Reading & Fact Checking
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: summary.reading.lastNotes ? 12 : 0 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: summary.reading.ewma >= 3 ? 'var(--success)' : summary.reading.ewma >= 2 ? 'var(--warning)' : 'var(--text-muted)' }}>{summary.reading.ewma.toFixed(1)}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EWMA /5</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'rgb(14,165,233)' }}>{summary.reading.completed}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Completed</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: summary.reading.lastScore !== null && summary.reading.lastScore >= 4 ? 'var(--success)' : 'var(--warning)' }}>{summary.reading.lastScore !== null ? `${summary.reading.lastScore}/5` : '—'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Last Score</div>
                        </div>
                    </div>
                    {summary.reading.lastNotes && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 6, lineHeight: 1.5 }}>{summary.reading.lastNotes}</div>
                    )}
                </motion.div>

                {/* Phase 16.0: SEL */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(168,85,247,0.25)' }}>
                    <h2 style={{ fontSize: '1rem', color: 'rgb(168,85,247)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        💜 Social-Emotional & Ethics
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: summary.sel.lastNotes ? 12 : 0 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: summary.sel.ewma >= 3 ? 'var(--success)' : summary.sel.ewma >= 2 ? 'var(--warning)' : 'var(--text-muted)' }}>{summary.sel.ewma.toFixed(1)}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EWMA /5</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'rgb(168,85,247)' }}>{summary.sel.completed}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Completed</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: summary.sel.lastScore !== null && summary.sel.lastScore >= 4 ? 'var(--success)' : 'var(--warning)' }}>{summary.sel.lastScore !== null ? `${summary.sel.lastScore}/5` : '—'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{summary.sel.lastTheme || 'Last Score'}</div>
                        </div>
                    </div>
                    {summary.sel.lastNotes && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 6, lineHeight: 1.5 }}>{summary.sel.lastNotes}</div>
                    )}
                </motion.div>

                {/* Phase 16.3: Outcome Survey */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(16,185,129,0.25)' }}>
                    <h2 style={{ fontSize: '1rem', color: 'rgb(16,185,129)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        📊 Weekly Outcomes (2 min)
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.4 }}>Rate observable behaviors this week. This is NOT diagnosis — just lightweight observation.</p>

                    {/* Outcome metrics card */}
                    {(summary.outcome.latestAvg !== null || summary.outcome.ewma > 0) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: summary.outcome.ewma >= 3.5 ? 'var(--success)' : summary.outcome.ewma >= 2.5 ? 'var(--warning)' : 'var(--danger)' }}>{summary.outcome.ewma.toFixed(1)}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>EWMA /5</div>
                            </div>
                            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'rgb(16,185,129)' }}>{summary.outcome.latestAvg?.toFixed(1) ?? '—'}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>This Week</div>
                            </div>
                            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>{summary.outcome.completed}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Surveys</div>
                            </div>
                        </div>
                    )}

                    {/* Trend line */}
                    {summary.outcome.trend.length > 1 && (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', marginBottom: 14, height: 30 }}>
                            {summary.outcome.trend.map((v: number, i: number) => (
                                <div key={i} style={{ flex: 1, background: v >= 3.5 ? 'var(--success)' : v >= 2.5 ? 'var(--warning)' : 'var(--danger)', height: `${(v / 5) * 100}%`, borderRadius: 3, opacity: i === 0 ? 1 : 0.5 }} title={`W${i}: ${v.toFixed(1)}`} />
                            ))}
                        </div>
                    )}

                    {/* Insights */}
                    {outcomeInsights.length > 0 && (
                        <div style={{ background: 'rgba(16,185,129,0.06)', padding: 12, borderRadius: 8, marginBottom: 14, border: '1px solid rgba(16,185,129,0.15)' }}>
                            {outcomeInsights.map((ins, i) => (
                                <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: i < outcomeInsights.length - 1 ? 6 : 0 }}>💡 {ins}</div>
                            ))}
                        </div>
                    )}

                    {/* Survey sliders */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                        {OUTCOME_ITEMS.map(item => (
                            <div key={item.id} style={{ background: 'rgba(0,0,0,0.15)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{item.label}</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 900, color: (outcomeRatings[item.id] || 3) >= 4 ? 'var(--success)' : (outcomeRatings[item.id] || 3) >= 3 ? 'var(--warning)' : 'var(--danger)' }}>{outcomeRatings[item.id] || 3}</span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>{item.description}</div>
                                <input
                                    type="range" min={1} max={5} step={1}
                                    value={outcomeRatings[item.id] || 3}
                                    onChange={e => setOutcomeRatings(prev => ({ ...prev, [item.id]: parseInt(e.target.value) }))}
                                    style={{ width: '100%', accentColor: 'rgb(16,185,129)' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                    <span>Nunca</span><span>Rara vez</span><span>A veces</span><span>Frecuente</span><span>Siempre</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <textarea
                        value={outcomeNotes}
                        onChange={e => setOutcomeNotes(e.target.value.slice(0, 200))}
                        placeholder="Notas opcionales (max 200 caracteres)..."
                        rows={2}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)', padding: 10, fontSize: '0.85rem', resize: 'none', marginBottom: 10 }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: outcomeSaved ? 'var(--success)' : 'var(--text-muted)' }}>{outcomeSaved ? '✅ Saved for this week' : `${outcomeNotes.length}/200`}</span>
                        <button
                            onClick={() => {
                                if (!activeChild) return;
                                const resp = {
                                    id: `outcome-${Date.now()}`,
                                    weekKey: outcomeWeekKey,
                                    childId: activeChild.id,
                                    createdAt: Date.now(),
                                    ratings: outcomeRatings as Record<OutcomeSurveyItemId, 1 | 2 | 3 | 4 | 5>,
                                    notes: outcomeNotes || undefined,
                                };
                                appendOutcomeSurvey(resp);
                                const profile = getCognitiveProfile();
                                if (profile) {
                                    const avg = Object.values(outcomeRatings).reduce((s, v) => s + v, 0) / Object.values(outcomeRatings).length;
                                    profile.outcomeEwma = computeOutcomeEwma(profile.outcomeEwma ?? 0, avg);
                                    profile.outcomesCompleted = (profile.outcomesCompleted ?? 0) + 1;
                                    saveCognitiveProfile(profile);
                                }
                                setOutcomeSaved(true);
                                setOutcomeInsights(buildOutcomeInsights(summary, outcomeRatings));
                                recomputeLedgerForToday();
                            }}
                            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: outcomeSaved ? 'rgba(16,185,129,0.15)' : 'rgb(16,185,129)', color: outcomeSaved ? 'rgb(16,185,129)' : '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            {outcomeSaved ? 'Update' : 'Submit'}
                        </button>
                    </div>
                </motion.div>

                {/* Phase 16.9: Weekly Goal Contract */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 20, marginBottom: 20, border: '1px solid rgba(34,197,94,0.25)' }}>
                    <h2 style={{ fontSize: '0.9rem', color: 'rgb(34,197,94)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        Weekly Goal Contract ({contractWeek})
                    </h2>

                    {contractMode === 'edit' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Academic Goal (max 120 chars)
                                <input value={cAcademic} onChange={e => setCacademic(e.target.value.slice(0, 120))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontSize: '0.8rem', marginTop: 3 }} />
                            </label>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Behavior Goal (max 120 chars)
                                <input value={cBehavior} onChange={e => setCbehavior(e.target.value.slice(0, 120))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontSize: '0.8rem', marginTop: 3 }} />
                            </label>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Integrity Goal: {cIntegrity}%
                                <input type="range" min={60} max={100} value={cIntegrity} onChange={e => setCintegrity(Number(e.target.value))} style={{ width: '100%', marginTop: 3 }} />
                            </label>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    Parent Name: <input value={cParentName} onChange={e => setCparentName(e.target.value.slice(0, 30))} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontSize: '0.75rem', width: 120 }} />
                                </label>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    Child Name: <input value={cChildName} onChange={e => setCchildName(e.target.value.slice(0, 30))} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontSize: '0.75rem', width: 120 }} />
                                </label>
                            </div>
                            <button onClick={() => {
                                if (!activeChild || !cAcademic || !cBehavior) return;
                                const contract: GoalContract = {
                                    id: `gc-${contractWeek}-${activeChild.id}`,
                                    weekKey: contractWeek,
                                    childId: activeChild.id,
                                    createdAt: Date.now(),
                                    academicGoal: cAcademic,
                                    behaviorGoal: cBehavior,
                                    integrityGoal: cIntegrity,
                                    parentName: cParentName,
                                    childName: cChildName,
                                    parentSigned: !!cParentName,
                                    childSigned: !!cChildName,
                                    signedAt: cParentName && cChildName ? Date.now() : undefined,
                                };
                                saveGoalContract(contract);
                                setCsaved(true);
                                setContractMode('view');
                            }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'rgb(34,197,94)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', marginTop: 4 }}>
                                {cSaved ? 'Update Contract' : 'Create Contract'}
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Academic: <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{existingContract?.academicGoal}</span></div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Behavior: <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{existingContract?.behaviorGoal}</span></div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Integrity: <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{'>'}={existingContract?.integrityGoal}%</span></div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, fontSize: '0.7rem', marginBottom: 10 }}>
                                <span style={{ color: existingContract?.parentSigned ? 'var(--success)' : 'var(--warning)' }}>{existingContract?.parentSigned ? '\u2713' : '\u25cb'} Parent: {existingContract?.parentName || '(unsigned)'}</span>
                                <span style={{ color: existingContract?.childSigned ? 'var(--success)' : 'var(--warning)' }}>{existingContract?.childSigned ? '\u2713' : '\u25cb'} Child: {existingContract?.childName || '(unsigned)'}</span>
                            </div>
                            {compliance && (
                                <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', marginBottom: 10 }}>
                                    <span>Integrity met: <b style={{ color: compliance.integrityMetDays >= 5 ? 'var(--success)' : 'var(--warning)' }}>{compliance.integrityMetDays}/{compliance.totalDays}d</b></span>
                                    <span>Avg: <b>{compliance.avgIntegrity}%</b></span>
                                    <span>Behavior tracked: <b style={{ color: compliance.behaviorTracked ? 'var(--success)' : 'var(--danger)' }}>{compliance.behaviorTracked ? 'Yes' : 'No'}</b></span>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => setContractMode('edit')} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>Edit</button>
                                {existingContract && <button onClick={() => exportContractMarkdown(existingContract)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>Download .md</button>}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Phase 16.4: Experiment Mode */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(139,92,246,0.25)' }}>
                    <h2 style={{ fontSize: '1rem', color: 'rgb(139,92,246)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        🧪 Experiment Mode (7 days)
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.4 }}>Run a controlled 7-day intervention and compare before vs during metrics.</p>

                    {expActive && expCfg ? (
                        <div style={{ background: 'rgba(139,92,246,0.08)', padding: 16, borderRadius: 8, border: '1px solid rgba(139,92,246,0.2)', marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'rgb(139,92,246)' }}>{VARIANT_LABELS[expCfg.variant]}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--warning)' }}>{getDaysRemaining(expCfg)} days left</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>{expCfg.startDateKey} → {expCfg.endDateKey}</div>
                            <button
                                onClick={() => {
                                    if (!activeChild || !expCfg) return;
                                    const result = computeExperimentResult(activeChild.id, expCfg);
                                    appendExperimentResult(result);
                                    const p = getCognitiveProfile();
                                    if (p) { p.currentExperiment = undefined; saveCognitiveProfile(p); }
                                    window.location.reload();
                                }}
                                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--warning)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                End Early & Save Results
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                            <select
                                value={selectedVariant}
                                onChange={e => setSelectedVariant(e.target.value as ExperimentVariantId)}
                                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                            >
                                {(Object.keys(VARIANT_LABELS) as ExperimentVariantId[]).filter(v => v !== 'baseline').map(v => (
                                    <option key={v} value={v}>{VARIANT_LABELS[v]}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => {
                                    if (!activeChild) return;
                                    const start = todayKey;
                                    const end = addDays(start, 6);
                                    const cfg = { enabled: true, variant: selectedVariant, startDateKey: start, endDateKey: end };
                                    const p = getCognitiveProfile();
                                    if (p) { p.currentExperiment = cfg; saveCognitiveProfile(p); }
                                    window.location.reload();
                                }}
                                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'rgb(139,92,246)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                            >
                                Start 7-Day Experiment
                            </button>
                        </div>
                    )}

                    {/* Latest results */}
                    {expResults.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Recent Results</div>
                            {expResults.map((r: any, i: number) => {
                                const verdict = getVerdict(r.delta);
                                const color = verdict === 'improved' ? 'var(--success)' : verdict === 'worse' ? 'var(--danger)' : 'var(--warning)';
                                return (
                                    <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, border: `1px solid ${color}20` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{VARIANT_LABELS[r.variant as ExperimentVariantId] || r.variant}</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color, textTransform: 'uppercase' }}>{verdict}</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, fontSize: '0.65rem' }}>
                                            {['outcomeAvg', 'calibration', 'overconfidence', 'followThrough', 'meta'].map(k => {
                                                const d = r.delta[k] as number;
                                                return (
                                                    <div key={k} style={{ textAlign: 'center', padding: 4, borderRadius: 4, background: 'rgba(0,0,0,0.15)' }}>
                                                        <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                                                        <div style={{ fontWeight: 800, color: k === 'overconfidence' ? (d < 0 ? 'var(--success)' : d > 0 ? 'var(--danger)' : 'var(--text-muted)') : (d > 0 ? 'var(--success)' : d < 0 ? 'var(--danger)' : 'var(--text-muted)') }}>
                                                            {d > 0 ? '+' : ''}{typeof d === 'number' ? d.toFixed(2) : d}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4 }}>{r.startDateKey} → {r.endDateKey}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>

                {/* Phase 17.1: Adoption Metrics */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 16, marginBottom: 20, border: '1px solid rgba(59,130,246,0.25)' }}>
                    <h2 style={{ fontSize: '0.8rem', color: 'rgb(59,130,246)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Adoption Metrics (14d)</h2>
                    {(() => {
                        const m = adoptionMetrics;
                        return (
                            <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem' }}>
                                <div><span style={{ color: 'var(--text-muted)' }}>Active Days:</span> <b>{m.daysActiveLast14}/14</b></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>Avg Min/Day:</span> <b>{m.averageMinutesPerActiveDay}</b></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>Completion:</span> <b style={{ color: m.completionRate >= 75 ? 'var(--success)' : 'var(--warning)' }}>{m.completionRate}%</b></div>
                            </div>
                        );
                    })()}
                </motion.div>

                {/* Phase 17.0: Release / Export */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 20, marginBottom: 20, border: '1px solid rgba(245,158,11,0.25)' }}>
                    <h2 style={{ fontSize: '0.9rem', color: 'rgb(245,158,11)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        Release / Export
                    </h2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={async () => {
                            const { buildReleaseNotesMd, downloadMd } = await import('../lib/releaseEngine');
                            downloadMd(buildReleaseNotesMd(), `brainbro-release-v${(await import('../lib/version')).APP_VERSION}.md`);
                        }} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)', background: 'transparent', color: 'rgb(245,158,11)', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>
                            Release Notes .md
                        </button>
                        <button onClick={async () => {
                            if (!activeChild) return;
                            const { buildChildSummaryMd, downloadMd } = await import('../lib/releaseEngine');
                            const md = await buildChildSummaryMd(activeChild.id, activeChild.name);
                            downloadMd(md, `brainbro-${activeChild.name.toLowerCase()}-summary.md`);
                        }} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)', background: 'transparent', color: 'rgb(245,158,11)', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>
                            Child Summary .md
                        </button>
                        <button onClick={async () => {
                            const { buildGlobalPackMd, downloadMd } = await import('../lib/releaseEngine');
                            const children = registry.children.map((c: any) => ({ id: c.id, name: c.name }));
                            downloadMd(buildGlobalPackMd(children), `brainbro-global-pack.md`);
                        }} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)', background: 'transparent', color: 'rgb(245,158,11)', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>
                            Global Pack .md
                        </button>
                    </div>
                </motion.div>

                {/* Phase 16.1: Weekly Debrief Script */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(245,158,11,0.25)' }}>
                    <h2 style={{ fontSize: '1rem', color: 'rgb(245,158,11)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        🎯 Weekly Debrief Script
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>5-minute talking script based on this week's actual data. Includes wins, concerns, parent questions, and a real-world exercise.</p>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: debriefMd ? 14 : 0 }}>
                        <button
                            onClick={async () => {
                                if (!activeChild) return;
                                setDebriefLoading(true);
                                try {
                                    const result = await buildDebrief(activeChild.id, Date.now());
                                    saveDebrief(result.weekKey, activeChild.id, result.md);
                                    setDebriefMd(result.md);
                                    setDebriefExpanded(true);
                                } catch { /* silent */ }
                                setDebriefLoading(false);
                            }}
                            disabled={debriefLoading}
                            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: debriefMd ? 'rgba(245,158,11,0.15)' : 'rgb(245,158,11)', color: debriefMd ? 'rgb(245,158,11)' : '#fff', fontWeight: 700, cursor: debriefLoading ? 'default' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, opacity: debriefLoading ? 0.6 : 1 }}
                        >
                            <RefreshCw size={14} />
                            {debriefLoading ? 'Generating...' : debriefMd ? 'Regenerate' : 'Generate This Week'}
                        </button>

                        {debriefMd && (
                            <>
                                <button
                                    onClick={() => setDebriefExpanded(!debriefExpanded)}
                                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', background: 'transparent', color: 'rgb(245,158,11)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    {debriefExpanded ? 'Collapse' : 'Preview'}
                                </button>
                                <button
                                    onClick={() => downloadFile(debriefMd, `debrief-${getDebriefWeekKey(Date.now())}.md`)}
                                    style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'rgb(16,185,129)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    <Download size={14} /> Download .md
                                </button>
                            </>
                        )}
                    </div>

                    {debriefMd && debriefExpanded && (
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 400, overflowY: 'auto', border: '1px solid var(--border)' }}>
                            {debriefMd}
                        </div>
                    )}
                </motion.div>

                {/* Actions */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: '1rem', color: 'rgb(168,85,247)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Actions</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <Link to="/teacher" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, rgb(168,85,247), rgb(120,60,200))', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem' }}>
                            📚 Teacher Mode
                        </Link>
                        <button
                            onClick={() => downloadFile(generateWeeklyReport(), `brainbro-weekly-${new Date().toISOString().split('T')[0]}.md`)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: 'none', background: 'rgb(168,85,247)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            <Download size={16} /> Export Weekly Report
                        </button>
                        <button
                            onClick={() => downloadFile(exportBrainBroState(), `brainbro-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json')}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            <Download size={16} /> Full Backup
                        </button>
                        {!resetConfirm ? (
                            <button
                                onClick={() => setResetConfirm(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                <Trash2 size={16} /> Reset Cognitive Metrics
                            </button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>Confirm reset?</span>
                                <button
                                    onClick={() => {
                                        saveCognitiveProfile({
                                            calibration: 50, overconfidence: 0, reflection: 0.5,
                                            sessionsCount: 0, lastUpdatedISO: new Date().toISOString(),
                                            reasoningQualityEwma: 0, ambiguityEwma: 50,
                                        });
                                        setResetConfirm(false);
                                    }}
                                    style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--danger)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                                >Yes, Reset</button>
                                <button onClick={() => setResetConfirm(false)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Phase 15.2: Encrypted Sync */}
                <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: '1rem', color: 'rgb(168,85,247)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>🔒 Encrypted Sync</h2>
                    {!hasCrypto ? (
                        <div style={{ color: 'var(--warning)', fontSize: '0.85rem' }}>Web Crypto not available in this browser. Encrypted sync disabled.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                <button onClick={() => handleEncryptedExport('active_child')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, rgb(168,85,247), rgb(120,60,200))', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <Download size={16} /> Sync Active Child
                                </button>
                                <button onClick={() => handleEncryptedExport('all_children')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: '1px solid rgb(168,85,247)', background: 'rgba(168,85,247,0.1)', color: 'rgb(168,85,247)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <Download size={16} /> Sync All Children
                                </button>
                                <button onClick={() => syncFileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <Lock size={16} /> Import Sync File
                                </button>
                                <input ref={syncFileRef} type="file" accept=".brainbro,.json" style={{ display: 'none' }} onChange={handleSyncImport} />
                            </div>
                            {syncMsg && <div style={{ padding: '8px 14px', borderRadius: 8, background: syncMsg.includes('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: syncMsg.includes('✅') ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>{syncMsg}</div>}
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AES-256-GCM + PBKDF2. Passphrase ≥8 chars required. Never shared with any server.</div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.4 }}>BrainBro v{APP_VERSION}</div>
        </>
    );
}
