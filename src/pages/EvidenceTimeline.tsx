import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { ArrowLeft, Download, Calendar, Filter } from 'lucide-react';
import { getLedgerRange } from '../lib/storage';
import { getPlaybook, type PlaybookTrigger } from '../lib/playbookEngine';
import { isParentUnlocked } from '../lib/parentGate';

const containerV: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };
const itemV: Variants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

// Map ledger flags to playbook triggers
const FLAG_TO_TRIGGER: Record<string, PlaybookTrigger> = {
    LOW_CALIBRATION: 'LOW_CALIBRATION',
    HIGH_OVERCONFIDENCE: 'HIGH_OVERCONFIDENCE',
    LOW_INTEGRITY: 'LOW_INTEGRITY',
    LOW_FOLLOW_THROUGH: 'LOW_FOLLOW_THROUGH',
    GAMING: 'LOW_INTEGRITY',
};

function exportMarkdown(entries: any[]): void {
    let md = '# BrainBro Evidence Timeline\n\n';
    md += '| Date | Min | Integrity | Cal | OC | Meta | FT | Flags |\n';
    md += '|------|-----|-----------|-----|-----|------|-----|-------|\n';
    for (const e of entries) {
        const m = e.metrics;
        md += `| ${e.dateKey} | ${m.minutesCompleted}/${m.minutesPlanned} | ${m.planIntegrity}% | ${m.calibration.toFixed(0)} | ${(m.overconfidence * 100).toFixed(0)}% | ${m.meta.toFixed(1)} | ${(m.followThrough * 100).toFixed(0)}% | ${e.flags.join(', ') || '-'} |\n`;
    }
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brainbro-timeline-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function EvidenceTimeline() {
    const [parentOk] = useState(() => isParentUnlocked());
    const [range, setRange] = useState<14 | 30>(14);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [flagFilter, setFlagFilter] = useState<string | null>(null);

    const entries = useMemo(() => getLedgerRange(range), [range]);

    // Collect all unique flags in range
    const allFlags = useMemo(() => {
        const s = new Set<string>();
        entries.forEach((e: any) => e.flags?.forEach((f: string) => s.add(f)));
        return Array.from(s).sort();
    }, [entries]);

    const filtered = flagFilter ? entries.filter((e: any) => e.flags?.includes(flagFilter)) : entries;

    if (!parentOk) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
                <p style={{ color: 'var(--text-muted)' }}>Parent gate required.</p>
                <Link to="/parent" style={{ color: 'var(--accent)' }}>Go to Parent Dashboard</Link>
            </div>
        );
    }

    return (
        <motion.div variants={containerV} initial="hidden" animate="show" style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
            {/* Header */}
            <motion.div variants={itemV} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Link to="/parent" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}><ArrowLeft size={20} /></Link>
                    <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                        <Calendar size={20} style={{ verticalAlign: 'middle', marginRight: 6, color: 'rgb(59,130,246)' }} />
                        Evidence Timeline
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {([14, 30] as const).map(r => (
                        <button key={r} onClick={() => setRange(r)} style={{
                            padding: '4px 12px', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                            border: range === r ? '2px solid rgb(59,130,246)' : '1px solid var(--border)',
                            background: range === r ? 'rgba(59,130,246,0.12)' : 'transparent',
                            color: range === r ? 'rgb(59,130,246)' : 'var(--text-muted)',
                        }}>{r}d</button>
                    ))}
                    <button onClick={() => exportMarkdown(filtered)} style={{
                        padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    }}><Download size={12} /> .md</button>
                </div>
            </motion.div>

            {/* Flag Filters */}
            {allFlags.length > 0 && (
                <motion.div variants={itemV} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    <Filter size={14} style={{ color: 'var(--text-muted)', marginTop: 3 }} />
                    <button onClick={() => setFlagFilter(null)} style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                        border: !flagFilter ? '2px solid rgb(59,130,246)' : '1px solid var(--border)',
                        background: !flagFilter ? 'rgba(59,130,246,0.1)' : 'transparent',
                        color: !flagFilter ? 'rgb(59,130,246)' : 'var(--text-muted)',
                    }}>All</button>
                    {allFlags.map(f => (
                        <button key={f} onClick={() => setFlagFilter(f === flagFilter ? null : f)} style={{
                            padding: '3px 10px', borderRadius: 12, fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                            border: flagFilter === f ? '2px solid var(--danger)' : '1px solid var(--border)',
                            background: flagFilter === f ? 'rgba(244,63,94,0.1)' : 'transparent',
                            color: flagFilter === f ? 'var(--danger)' : 'var(--text-muted)',
                        }}>{f.replace(/_/g, ' ')}</button>
                    ))}
                </motion.div>
            )}

            {/* Day Cards */}
            {filtered.length === 0 && (
                <motion.div variants={itemV} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No ledger entries found for this range.
                </motion.div>
            )}

            {filtered.map((entry: any) => {
                const m = entry.metrics;
                const isExpanded = expanded === entry.id;

                return (
                    <motion.div key={entry.id} variants={itemV}
                        onClick={() => setExpanded(isExpanded ? null : entry.id)}
                        style={{
                            background: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: 14, marginBottom: 8, cursor: 'pointer',
                            border: entry.flags.length > 0 ? '1px solid rgba(244,63,94,0.2)' : '1px solid var(--border)',
                            transition: 'all 0.2s',
                        }}
                    >
                        {/* Summary Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>{entry.dateKey}</span>
                                <span style={{ fontSize: '0.7rem', color: m.planIntegrity >= 70 ? 'var(--success)' : m.planIntegrity >= 40 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>
                                    {m.minutesCompleted}/{m.minutesPlanned}min ({m.planIntegrity}%)
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {m.writingDone === 1 && <span style={{ fontSize: '0.55rem', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>W</span>}
                                {m.readingDone === 1 && <span style={{ fontSize: '0.55rem', background: 'rgba(59,130,246,0.15)', color: 'rgb(59,130,246)', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>R</span>}
                                {m.selDone === 1 && <span style={{ fontSize: '0.55rem', background: 'rgba(168,85,247,0.15)', color: 'rgb(168,85,247)', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>S</span>}
                                {m.decisionLabDone === 1 && <span style={{ fontSize: '0.55rem', background: 'rgba(251,146,60,0.15)', color: 'rgb(251,146,60)', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>D</span>}
                            </div>
                        </div>

                        {/* Quick Scores */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            {[
                                { label: 'Cal', val: m.calibration.toFixed(0), color: m.calibration >= 60 ? 'var(--success)' : m.calibration >= 40 ? 'var(--warning)' : 'var(--danger)' },
                                { label: 'OC', val: (m.overconfidence * 100).toFixed(0) + '%', color: m.overconfidence <= 0.15 ? 'var(--success)' : m.overconfidence <= 0.3 ? 'var(--warning)' : 'var(--danger)' },
                                { label: 'FT', val: (m.followThrough * 100).toFixed(0) + '%', color: m.followThrough >= 0.5 ? 'var(--success)' : m.followThrough >= 0.3 ? 'var(--warning)' : 'var(--danger)' },
                                { label: 'Meta', val: m.meta.toFixed(1), color: m.meta >= 3 ? 'var(--success)' : m.meta >= 2 ? 'var(--warning)' : 'var(--danger)' },
                            ].map(s => (
                                <div key={s.label} style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                    {s.label}: <span style={{ fontWeight: 800, color: s.color }}>{s.val}</span>
                                </div>
                            ))}
                            {m.sessionsCompleted > 0 && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Sessions: <span style={{ fontWeight: 700 }}>{m.sessionsCompleted}</span></div>}
                        </div>

                        {/* Flags */}
                        {entry.flags.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                                {entry.flags.map((f: string) => (
                                    <span key={f} style={{ fontSize: '0.55rem', background: 'rgba(244,63,94,0.12)', color: 'var(--danger)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                        {f.replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Expanded Detail */}
                        {isExpanded && (
                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: '0.6rem', marginBottom: 10 }}>
                                    {Object.entries(m).map(([k, v]) => (
                                        <div key={k} style={{ background: 'rgba(0,0,0,0.1)', padding: '4px 6px', borderRadius: 4 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>{k.replace(/([A-Z])/g, ' $1').trim()}: </span>
                                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{typeof v === 'number' ? (v < 2 && k !== 'sessionsCompleted' && k !== 'minutesPlanned' && k !== 'minutesCompleted' && k !== 'vocabReviewed' ? (v * 100).toFixed(0) + '%' : v.toFixed(1)) : String(v ?? '-')}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Suggested action from playbook */}
                                {entry.flags.length > 0 && (() => {
                                    const trigger = entry.flags.find((f: string) => FLAG_TO_TRIGGER[f]);
                                    if (!trigger) return null;
                                    const pb = getPlaybook(FLAG_TO_TRIGGER[trigger]);
                                    return (
                                        <div style={{ background: 'rgba(251,146,60,0.06)', padding: 8, borderRadius: 6, border: '1px solid rgba(251,146,60,0.15)' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgb(251,146,60)', marginBottom: 3 }}>{pb.title}</div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{pb.next24h[0]}</div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </motion.div>
    );
}
