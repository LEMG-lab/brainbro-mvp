/**
 * Phase 17.0: Release Engine
 * Generates release notes, child summary, and global pack as Markdown.
 */

import { APP_VERSION, BUILD_DATE } from './version';
import { getLedgerRange, getSmokeTestResult, getGoalContracts, getOutcomeSurveys, getExperimentResults } from './storage';
import { detectEarlyWarnings } from './trendEngine';
import { buildDebrief } from './debriefEngine';

// ─── Module Manifest ───

const MODULES = [
    { key: 'awp', label: 'Autopilot Weekly Program (AWP)' },
    { key: 'integrity', label: 'Completion Integrity' },
    { key: 'r2a', label: 'Reflection-to-Action Loop' },
    { key: 'writing', label: 'Writing & Argumentation Track' },
    { key: 'reading', label: 'Reading Comprehension Track' },
    { key: 'sel', label: 'Social-Emotional & Ethics Track' },
    { key: 'debrief', label: 'Coach Debrief Calls' },
    { key: 'outcomes', label: 'Behavioral Outcomes Survey' },
    { key: 'experiments', label: 'Experiment Mode (A/B)' },
    { key: 'ledger', label: 'Unified Metrics Ledger' },
    { key: 'sparklines', label: 'Visual Trend Sparklines' },
    { key: 'playbooks', label: 'Intervention Playbooks' },
    { key: 'timeline', label: 'Evidence Timeline' },
    { key: 'contracts', label: 'Goal Contracts' },
    { key: 'teacher', label: 'Teacher Mode' },
    { key: 'release', label: 'Release Packaging' },
];

// ─── Release Notes ───

export function buildReleaseNotesMd(now: number = Date.now()): string {
    const ledger7 = getLedgerRange(7);
    const warnings = detectEarlyWarnings(ledger7);
    const smokeResult = getSmokeTestResult();

    const avgIntegrity = ledger7.length > 0
        ? Math.round(ledger7.reduce((s: number, e: any) => s + e.metrics.planIntegrity, 0) / ledger7.length)
        : 0;

    let md = `# BrainBro Release Notes — v${APP_VERSION}\n\n`;
    md += `**Build Date:** ${BUILD_DATE}\n`;
    md += `**Generated:** ${new Date(now).toISOString()}\n\n`;

    md += `## Active Modules (${MODULES.length})\n\n`;
    for (const m of MODULES) {
        md += `- ✅ ${m.label}\n`;
    }

    md += `\n## 7-Day System Health\n\n`;
    md += `| Metric | Value |\n|---|---|\n`;
    md += `| Ledger entries | ${ledger7.length} |\n`;
    md += `| Avg plan integrity | ${avgIntegrity}% |\n`;
    md += `| Early warnings | ${warnings.length} |\n`;
    if (smokeResult) {
        md += `| Smoke test | ${smokeResult.passed}/${smokeResult.total} passed (${new Date(smokeResult.at).toLocaleDateString()}) |\n`;
    } else {
        md += `| Smoke test | Not run |\n`;
    }

    md += `\n## Known Limitations\n\n`;
    md += `- Client-only, no backend\n`;
    md += `- Data in localStorage (per browser)\n`;
    md += `- Sync via encrypted JSON file export/import\n`;
    md += `- No real-time multi-device sync\n`;
    md += `- AI features require Gemini API key (optional)\n`;

    return md;
}

// ─── Child Summary Pack ───

export async function buildChildSummaryMd(childId: string, childName: string, now: number = Date.now()): Promise<string> {
    const ledger7 = getLedgerRange(7);
    const contracts = getGoalContracts();
    const latestContract = contracts.find((c: any) => c.childId === childId);
    const outcomes = getOutcomeSurveys();
    const latestOutcome = outcomes.find((o: any) => o.childId === childId);
    const expResults = getExperimentResults();
    const latestExp = expResults.find((r: any) => r.childId === childId);

    let md = `# Child Summary: ${childName}\n`;
    md += `**Generated:** ${new Date(now).toISOString()}\n\n`;

    // Debrief
    try {
        const result = await buildDebrief(childId, now);
        const debrief = result.data;
        md += `## Weekly Debrief\n\n`;
        md += `### Wins\n`;
        debrief.wins.forEach((w: string) => { md += `- ${w}\n`; });
        md += `\n### Concerns\n`;
        debrief.concerns.forEach((c: string) => { md += `- ${c}\n`; });
        md += `\n**Focus:** ${debrief.focus}\n\n`;
        md += `### Questions to Ask\n`;
        debrief.questions.forEach((q: string) => { md += `- ${q}\n`; });
        md += `\n**Exercise:** ${debrief.exercise}\n\n`;
    } catch { /* silent */ }

    // Contract
    if (latestContract) {
        md += `## Goal Contract (${latestContract.weekKey})\n\n`;
        md += `1. Academic: ${latestContract.academicGoal}\n`;
        md += `2. Behavior: ${latestContract.behaviorGoal}\n`;
        md += `3. Integrity: >=${latestContract.integrityGoal}%\n`;
        md += `- Parent: ${latestContract.parentSigned ? latestContract.parentName + ' ✓' : '(unsigned)'}\n`;
        md += `- Child: ${latestContract.childSigned ? latestContract.childName + ' ✓' : '(unsigned)'}\n\n`;
    }

    // Ledger 7d table
    md += `## Last 7 Days\n\n`;
    md += `| Date | Min | Integrity | Cal | OC | FT | Meta | Flags |\n`;
    md += `|------|-----|-----------|-----|-----|-----|------|-------|\n`;
    for (const e of ledger7) {
        const m = (e as any).metrics;
        md += `| ${(e as any).dateKey} | ${m.minutesCompleted}/${m.minutesPlanned} | ${m.planIntegrity}% | ${m.calibration.toFixed(0)} | ${(m.overconfidence * 100).toFixed(0)}% | ${(m.followThrough * 100).toFixed(0)}% | ${m.meta.toFixed(1)} | ${(e as any).flags?.join(', ') || '-'} |\n`;
    }

    // Outcomes
    if (latestOutcome) {
        md += `\n## Latest Outcomes Survey\n\n`;
        const r = latestOutcome.ratings as Record<string, number>;
        for (const [k, v] of Object.entries(r)) {
            md += `- ${k.replace(/_/g, ' ')}: ${v}/5\n`;
        }
    }

    // Experiment
    if (latestExp) {
        md += `\n## Latest Experiment\n\n`;
        md += `- Variant: ${latestExp.variant}\n`;
        md += `- Verdict: ${latestExp.verdict}\n`;
    }

    return md;
}

// ─── Global Pack ───

export function buildGlobalPackMd(children: { id: string; name: string }[], now: number = Date.now()): string {
    let md = buildReleaseNotesMd(now);
    md += `\n---\n\n# Children Overview\n\n`;

    const ledger7 = getLedgerRange(7);

    for (const child of children) {
        md += `## ${child.name}\n\n`;
        const childEntries = ledger7.filter((e: any) => e.childId === child.id);
        if (childEntries.length > 0) {
            const avgInt = Math.round(childEntries.reduce((s: number, e: any) => s + e.metrics.planIntegrity, 0) / childEntries.length);
            const avgCal = Math.round(childEntries.reduce((s: number, e: any) => s + e.metrics.calibration, 0) / childEntries.length);
            const totalMin = childEntries.reduce((s: number, e: any) => s + e.metrics.minutesCompleted, 0);
            md += `| KPI | Value |\n|---|---|\n`;
            md += `| Days active | ${childEntries.length} |\n`;
            md += `| Total minutes | ${totalMin} |\n`;
            md += `| Avg integrity | ${avgInt}% |\n`;
            md += `| Avg calibration | ${avgCal} |\n\n`;
        } else {
            md += `No data in last 7 days.\n\n`;
        }
    }

    return md;
}

// ─── Download Helper ───

export function downloadMd(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
