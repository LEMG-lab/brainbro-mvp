/**
 * Phase 16.9: Contract Engine
 * Suggests default goal contracts based on ledger + outcomes,
 * and computes weekly compliance.
 */

import type { GoalContract } from '../types';
import { getLedgerRange, getOutcomeSurveys } from './storage';
import { computeTrendLabel } from './trendEngine';

// ─── Week Key ───

export function getContractWeekKey(now: number = Date.now()): string {
    const d = new Date(now);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
    const week = Math.ceil((days + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ─── Default Suggestions ───

export function suggestDefaultContract(childId: string): GoalContract {
    const ledger7 = getLedgerRange(7).reverse();
    const weekKey = getContractWeekKey();

    // Academic goal
    let academicGoal = '4 sesiones completas con reflexión';
    const vocabDays = ledger7.filter((e: any) => (e.metrics.vocabReviewed ?? 0) > 0).length;
    if (vocabDays < 2) {
        academicGoal = 'Revisar vocabulario al menos 5 días esta semana';
    }

    const writingDays = ledger7.filter((e: any) => e.metrics.writingDone === 1).length;
    if (writingDays < 1) {
        academicGoal = '2 writing labs esta semana';
    }

    // Behavior goal: lowest outcome item
    let behaviorGoal = 'Practicar autocontrol con pantallas 3 veces esta semana';
    const surveys = getOutcomeSurveys();
    if (surveys.length > 0) {
        const latest = surveys[0];
        const ratings = latest.ratings as Record<string, number>;
        const labels: Record<string, string> = {
            focus_homework: 'Mantener enfoque en tareas sin recordatorios',
            handles_frustration: 'Manejar frustración sin enojarse 3 veces',
            honesty_effort: 'Ser honesto sobre el esfuerzo en sus actividades',
            initiative: 'Iniciar una actividad sin que se lo pidan',
            kindness: 'Hacer un acto amable por día',
            sleep_routine: 'Seguir la rutina de dormir 5 de 7 noches',
            screen_self_control: 'Limitar pantallas voluntariamente 3 veces',
        };
        let lowestKey = Object.keys(ratings)[0];
        let lowestVal = 5;
        for (const [k, v] of Object.entries(ratings)) {
            if (v < lowestVal) { lowestVal = v; lowestKey = k; }
        }
        if (labels[lowestKey]) behaviorGoal = labels[lowestKey];
    }

    // Integrity goal
    let integrityGoal = 75;
    const integrityVals = ledger7.map((e: any) => e.metrics.planIntegrity);
    const trend = computeTrendLabel(integrityVals);
    if (trend === 'down') integrityGoal = 80;

    return {
        id: `gc-${weekKey}-${childId}`,
        weekKey,
        childId,
        createdAt: Date.now(),
        academicGoal,
        behaviorGoal,
        integrityGoal,
        parentName: '',
        childName: '',
        parentSigned: false,
        childSigned: false,
    };
}

// ─── Compliance ───

export function computeContractCompliance(contract: GoalContract): {
    integrityMetDays: number;
    totalDays: number;
    avgIntegrity: number;
    behaviorTracked: boolean;
} {
    const ledger7 = getLedgerRange(7).reverse();
    const integrityMetDays = ledger7.filter((e: any) => e.metrics.planIntegrity >= contract.integrityGoal).length;
    const intVals = ledger7.map((e: any) => e.metrics.planIntegrity);
    const avgIntegrity = intVals.length > 0 ? intVals.reduce((a: number, b: number) => a + b, 0) / intVals.length : 0;

    const surveys = getOutcomeSurveys();
    const behaviorTracked = surveys.some((s: any) => s.childId === contract.childId);

    return {
        integrityMetDays,
        totalDays: ledger7.length,
        avgIntegrity: Math.round(avgIntegrity),
        behaviorTracked,
    };
}

// ─── Export Markdown ───

export function exportContractMarkdown(c: GoalContract): void {
    let md = `# Weekly Goal Contract\n`;
    md += `**Week:** ${c.weekKey}\n\n`;
    md += `## Goals\n`;
    md += `1. **Academic:** ${c.academicGoal}\n`;
    md += `2. **Behavior:** ${c.behaviorGoal}\n`;
    md += `3. **Integrity:** Plan integrity >= ${c.integrityGoal}%\n\n`;
    md += `## Signatures\n`;
    md += `- Parent: ${c.parentSigned ? c.parentName + ' ✓' : '(not signed)'}\n`;
    md += `- Child: ${c.childSigned ? c.childName + ' ✓' : '(not signed)'}\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-${c.weekKey}.md`;
    a.click();
    URL.revokeObjectURL(url);
}
