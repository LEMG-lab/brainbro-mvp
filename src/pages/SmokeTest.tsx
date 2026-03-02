/**
 * Phase 16.2: Smoke Test Page
 * Runs lightweight in-browser tests against key engines.
 */

import { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { APP_VERSION, BUILD_DATE } from '../lib/version';
import { saveSmokeTestResult, getSmokeTestResult } from '../lib/storage';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

interface TestResult {
    name: string;
    status: 'pass' | 'fail' | 'running';
    detail?: string;
    ms?: number;
}

export default function SmokeTest() {
    const [results, setResults] = useState<TestResult[]>([]);
    const [running, setRunning] = useState(true);
    const [saved, setSaved] = useState(false);
    const lastSaved = getSmokeTestResult();

    useEffect(() => {
        runTests();
    }, []);

    async function runTests() {
        const tests: TestResult[] = [];

        const run = async (name: string, fn: () => void | Promise<void>) => {
            const t0 = performance.now();
            try {
                await fn();
                tests.push({ name, status: 'pass', ms: Math.round(performance.now() - t0) });
            } catch (e: any) {
                tests.push({ name, status: 'fail', detail: e?.message || 'Unknown', ms: Math.round(performance.now() - t0) });
            }
            setResults([...tests]);
        };

        // 1) programEngine
        await run('programEngine.generateDailyPlan', async () => {
            const { generateDailyPlan } = await import('../lib/programEngine');
            const { getWeeklyProgramConfig } = await import('../lib/storage');
            const cfg = getWeeklyProgramConfig() || { enabled: true, weeklyMinutes: 120, areaWeights: {} };
            const plan = generateDailyPlan({ now: Date.now(), cfg });
            if (plan && !plan.items) throw new Error('Plan has no items array');
        });

        // 2) cognitiveDriftEngine
        await run('cognitiveDriftEngine.analyzeDrift', async () => {
            const { analyzeDrift } = await import('../lib/cognitiveDriftEngine');
            const { getCognitiveSessions, getCognitiveProfile } = await import('../lib/storage');
            const result = analyzeDrift(getCognitiveSessions(), getCognitiveProfile());
            if (result === undefined) throw new Error('analyzeDrift returned undefined');
        });

        // 3) cognitivePressureEngine
        await run('cognitivePressureEngine.computePressureLevel', async () => {
            const { computePressureLevel } = await import('../lib/cognitivePressureEngine');
            const { getCognitiveProfile } = await import('../lib/storage');
            const level = computePressureLevel(getCognitiveProfile());
            if (!level) throw new Error('No pressure level');
        });

        // 4) mentalModelEngine
        await run('mentalModelEngine.getNextRequiredModel', async () => {
            const { getNextRequiredModel } = await import('../lib/mentalModelEngine');
            const { getCognitiveProfile } = await import('../lib/storage');
            getNextRequiredModel(getCognitiveProfile());
        });

        // 5) safetyPolicy
        await run('safetyPolicy.filterPrompt', async () => {
            const { filterPrompt } = await import('../lib/safetyPolicy');
            const result = filterPrompt('Test input', '9-11');
            if (typeof result !== 'string') throw new Error('filterPrompt did not return string');
        });

        // 6) cryptoPack
        await run('cryptoPack.isCryptoAvailable', async () => {
            const { isCryptoAvailable } = await import('../lib/cryptoPack');
            const avail = isCryptoAvailable();
            if (typeof avail !== 'boolean') throw new Error('Not boolean');
        });

        // 7) parentOps
        await run('parentOps.getOpsSummary', async () => {
            const { getOpsSummary } = await import('../lib/parentOps');
            const summary = getOpsSummary(7);
            if (!summary || !summary.metrics) throw new Error('Invalid summary');
        });

        // 8) debriefEngine
        await run('debriefEngine.buildDebrief', async () => {
            const { buildDebrief } = await import('../lib/debriefEngine');
            const { getActiveChildId } = await import('../lib/childStorage');
            const result = await buildDebrief(getActiveChildId(), Date.now());
            if (!result.md || result.md.length < 50) throw new Error('Debrief too short');
        });

        setRunning(false);
    }

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ padding: '0 20px 40px' }}>
            <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Link to="/debug" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}><ArrowLeft size={18} /></Link>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>🧪 Smoke Test</h1>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>v{APP_VERSION} · {BUILD_DATE}</span>
            </motion.div>

            <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {running ? <><Loader2 size={14} className="spin" style={{ display: 'inline', marginRight: 6 }} />Running...</> : `${passed} passed · ${failed} failed`}
                    </span>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: failed > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {running ? '⏳' : failed > 0 ? '❌' : '✅'}
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {results.map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: r.status === 'fail' ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.2)', borderRadius: 6, border: `1px solid ${r.status === 'fail' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {r.status === 'pass' ? <CheckCircle size={14} color="var(--success)" /> : r.status === 'fail' ? <XCircle size={14} color="var(--danger)" /> : <Loader2 size={14} className="spin" />}
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>{r.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {r.detail && <span style={{ fontSize: '0.7rem', color: 'var(--danger)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.detail}</span>}
                                {r.ms !== undefined && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.ms}ms</span>}
                            </div>
                        </div>
                    ))}
                </div>

                {!running && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
                        <button onClick={() => {
                            const timings: Record<string, number> = {};
                            results.forEach(r => { if (r.ms) timings[r.name] = r.ms; });
                            saveSmokeTestResult({ passed, total: results.length, timings, at: Date.now() });
                            setSaved(true);
                        }} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: saved ? 'rgba(16,185,129,0.15)' : 'var(--accent)', color: saved ? 'var(--success)' : '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                            {saved ? '✓ Saved' : 'Save Result'}
                        </button>
                        {lastSaved && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                Last: {lastSaved.passed}/{lastSaved.total} passed ({new Date(lastSaved.at).toLocaleDateString()})
                            </span>
                        )}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
