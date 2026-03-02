/**
 * Phase 15.1: Child Storage Namespace
 * Provides child-scoped localStorage access + registry management + migration.
 */

import type { ChildProfile, ChildRegistry, AgeBand } from '../types';

const REGISTRY_KEY = 'brainbro_child_registry_v1';
const DEFAULT_CHILD_ID = 'child_1';

// Keys that should be scoped per child
const CHILD_SCOPED_KEYS = [
    'brainbro_results',
    'brainbro_vocab',
    'brainbro_accent',
    'brainbro_rate',
    'brainbro_adaptive',
    'brainbro_onboarding_v1',
    'brainbro_profile_v1',
    'brainbro_missions_v1',
    'brainbro_xp_v1',
    'brainbro_badges_v1',
    'brainbro_streak_v1',
    'brainbro_mistakes_v1',
    'brainbro_pronunciation_v1',
    'brainbro_cognitive_sessions_v1',
    'brainbro_cognitive_profile_v1',
    'brainbro_math_mastery_v1',
    'brainbro_custom_sessions_v2',
    'brainbro_math_context_seen',
    'brainbro_snapshots_v1',
    'brainbro_pressure_log_v1',
    'brainbro_drift_log_v1',
    'brainbro_decision_labs_v1',
    'brainbro_vocab_v1',
    'brainbro_decision_lab_last_seen_week_v1',
    'brainbro_weekly_program_v1',
    'brainbro_daily_plan_v1',
];

export function getRegistry(): ChildRegistry {
    try {
        const raw = localStorage.getItem(REGISTRY_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* silent */ }
    return {
        activeChildId: DEFAULT_CHILD_ID,
        children: [{ id: DEFAULT_CHILD_ID, name: 'Child 1', createdAt: Date.now(), ageBand: '9-11' as const }],
    };
}

export function saveRegistry(reg: ChildRegistry): void {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
}

export function getActiveChildId(): string {
    return getRegistry().activeChildId;
}

export function setActiveChild(id: string): void {
    const reg = getRegistry();
    if (reg.children.some(c => c.id === id)) {
        reg.activeChildId = id;
        saveRegistry(reg);
    }
}

export function withChildKey(baseKey: string, childId?: string): string {
    const cid = childId || getActiveChildId();
    return `${baseKey}__child_${cid}`;
}

export function addChild(name: string, ageBand: AgeBand = '9-11'): ChildProfile {
    const reg = getRegistry();
    const id = `child_${Date.now().toString(36)}`;
    const child: ChildProfile = { id, name, createdAt: Date.now(), ageBand };
    reg.children.push(child);
    saveRegistry(reg);
    return child;
}

export function updateChildAgeBand(childId: string, ageBand: AgeBand): void {
    const reg = getRegistry();
    const child = reg.children.find(c => c.id === childId);
    if (child) {
        child.ageBand = ageBand;
        saveRegistry(reg);
    }
}

export function removeChild(childId: string): void {
    const reg = getRegistry();
    if (reg.children.length <= 1) return; // don't remove last child
    reg.children = reg.children.filter(c => c.id !== childId);
    // Clean up their keys
    CHILD_SCOPED_KEYS.forEach(base => {
        try { localStorage.removeItem(withChildKey(base, childId)); } catch { /* silent */ }
    });
    // If active was removed, switch to first
    if (reg.activeChildId === childId) {
        reg.activeChildId = reg.children[0].id;
    }
    saveRegistry(reg);
}

/**
 * Migration: runs once to convert single-profile data to child_1 namespace.
 * Idempotent: skips if registry already exists OR if child-scoped keys already present.
 */
export function ensureDefaultChildMigration(): void {
    const hasRegistry = localStorage.getItem(REGISTRY_KEY);
    if (hasRegistry) return; // already migrated

    // Create default registry
    const reg: ChildRegistry = {
        activeChildId: DEFAULT_CHILD_ID,
        children: [{ id: DEFAULT_CHILD_ID, name: 'Child 1', createdAt: Date.now(), ageBand: '9-11' as const }],
    };
    saveRegistry(reg);

    // Migrate each key: copy old key -> child-scoped key, then remove old key
    CHILD_SCOPED_KEYS.forEach(baseKey => {
        const childKey = withChildKey(baseKey, DEFAULT_CHILD_ID);
        // Only migrate if child-scoped key doesn't exist yet
        if (localStorage.getItem(childKey) !== null) return;
        const oldVal = localStorage.getItem(baseKey);
        if (oldVal !== null) {
            localStorage.setItem(childKey, oldVal);
            localStorage.removeItem(baseKey);
        }
    });
}

/**
 * childLS: drop-in replacement for localStorage that auto-namespaces keys.
 * Use this in storage.ts instead of raw localStorage.
 */
export const childLS = {
    getItem(key: string): string | null {
        if (CHILD_SCOPED_KEYS.includes(key)) {
            return localStorage.getItem(withChildKey(key));
        }
        return localStorage.getItem(key);
    },
    setItem(key: string, value: string): void {
        if (CHILD_SCOPED_KEYS.includes(key)) {
            localStorage.setItem(withChildKey(key), value);
        } else {
            localStorage.setItem(key, value);
        }
    },
    removeItem(key: string): void {
        if (CHILD_SCOPED_KEYS.includes(key)) {
            localStorage.removeItem(withChildKey(key));
        } else {
            localStorage.removeItem(key);
        }
    },
};

/** Get all child-scoped keys for export/backup */
export function getAllChildKeys(): Record<string, Record<string, any>> {
    const reg = getRegistry();
    const result: Record<string, Record<string, any>> = {};
    reg.children.forEach(child => {
        const data: Record<string, any> = {};
        CHILD_SCOPED_KEYS.forEach(base => {
            const key = withChildKey(base, child.id);
            const raw = localStorage.getItem(key);
            if (raw !== null) {
                try { data[base] = JSON.parse(raw); } catch { data[base] = raw; }
            }
        });
        result[child.id] = data;
    });
    return result;
}

export { CHILD_SCOPED_KEYS };
