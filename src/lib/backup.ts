/**
 * BrainBro Backup/Restore — Phase 15.1: child-aware.
 * Exports/imports per-child namespaced data + registry.
 */

import { getRegistry, saveRegistry, getAllChildKeys, CHILD_SCOPED_KEYS, withChildKey } from './childStorage';
import type { ChildRegistry } from '../types';

export function listBrainBroKeys(): string[] {
    return [...CHILD_SCOPED_KEYS];
}

export function exportBrainBroState(): string {
    const registry = getRegistry();
    const childData = getAllChildKeys();
    return JSON.stringify({
        _brainbro_backup: true,
        _version: '15.1',
        _exportedAt: new Date().toISOString(),
        registry,
        childData,
    }, null, 2);
}

export function importBrainBroState(json: string): { ok: boolean; errors?: string[] } {
    const errors: string[] = [];
    let parsed: any;
    try { parsed = JSON.parse(json); } catch { return { ok: false, errors: ['Invalid JSON'] }; }
    if (!parsed || typeof parsed !== 'object') return { ok: false, errors: ['JSON is not an object'] };

    let restored = 0;

    // New v15.1 format with registry + childData
    if (parsed.registry && parsed.childData) {
        try {
            localStorage.setItem('brainbro_child_registry_v1', JSON.stringify(parsed.registry));
            restored++;
        } catch (e: any) { errors.push(`Registry: ${e?.message || 'unknown'}`); }

        const reg: ChildRegistry = parsed.registry;
        reg.children.forEach(child => {
            const data = parsed.childData[child.id];
            if (!data) return;
            Object.entries(data).forEach(([baseKey, value]) => {
                const key = withChildKey(baseKey, child.id);
                try {
                    if (value === null || value === undefined) {
                        localStorage.removeItem(key);
                    } else {
                        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                    }
                    restored++;
                } catch (e: any) {
                    errors.push(`${key}: ${e?.message || 'unknown'}`);
                }
            });
        });
    }
    // Legacy v14.x format: import into active child
    else {
        const keys = parsed.keys || parsed;
        if (typeof keys !== 'object') return { ok: false, errors: ['Missing data in backup'] };

        // Import into child_1 by default
        Object.entries(keys).forEach(([key, value]) => {
            if (!key.startsWith('brainbro_')) { errors.push(`Skipped: ${key}`); return; }
            const targetKey = CHILD_SCOPED_KEYS.includes(key) ? withChildKey(key, 'child_1') : key;
            try {
                if (value === null || value === undefined) { localStorage.removeItem(targetKey); }
                else { localStorage.setItem(targetKey, typeof value === 'string' ? value : JSON.stringify(value)); }
                restored++;
            } catch (e: any) { errors.push(`${key}: ${e?.message || 'unknown'}`); }
        });

        // Ensure registry exists
        if (!localStorage.getItem('brainbro_child_registry_v1')) {
            localStorage.setItem('brainbro_child_registry_v1', JSON.stringify({
                activeChildId: 'child_1',
                children: [{ id: 'child_1', name: 'Child 1', createdAt: Date.now() }],
            }));
        }
    }

    if (restored === 0 && errors.length > 0) return { ok: false, errors };
    return { ok: true, errors: errors.length > 0 ? errors : undefined };
}

function simpleHash(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
}

export function createSnapshot(): void {
    const payload = exportBrainBroState();
    const registry = getRegistry();
    const snapshotKey = withChildKey('brainbro_snapshots_v1', registry.activeChildId);
    const raw = localStorage.getItem(snapshotKey);
    let snapshots: any[] = [];
    try { if (raw) snapshots = JSON.parse(raw); } catch { snapshots = []; }
    if (!Array.isArray(snapshots)) snapshots = [];

    snapshots.unshift({
        createdAt: new Date().toISOString(),
        size: payload.length,
        hash: simpleHash(payload),
        payload,
    });
    if (snapshots.length > 20) snapshots = snapshots.slice(0, 20);
    localStorage.setItem(snapshotKey, JSON.stringify(snapshots));
}

export function getSnapshots(): { createdAt: string; size: number; hash: string }[] {
    const registry = getRegistry();
    const snapshotKey = withChildKey('brainbro_snapshots_v1', registry.activeChildId);
    const raw = localStorage.getItem(snapshotKey);
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        return arr.map((s: any) => ({ createdAt: s.createdAt, size: s.size, hash: s.hash }));
    } catch { return []; }
}

// ─── Phase 15.2: Sync Package ───

import { encryptJson, decryptJson } from './cryptoPack';

const EXCLUDED_SYNC_KEYS = ['brainbro_parent_gate_v1'];

export type SyncScope = 'active_child' | 'all_children';

export interface SyncPackage {
    version: 'brainbro-sync-v1';
    createdAt: number;
    scope: SyncScope;
    registry: import('../types').ChildRegistry;
    data: Record<string, Record<string, any>>;
}

export function exportSyncPackage(scope: SyncScope): SyncPackage {
    const registry = getRegistry();
    const allData = getAllChildKeys();
    const data: Record<string, Record<string, any>> = {};

    if (scope === 'active_child') {
        const cid = registry.activeChildId;
        data[cid] = allData[cid] || {};
    } else {
        Object.assign(data, allData);
    }

    // Remove excluded keys from each child's data
    Object.values(data).forEach(childData => {
        EXCLUDED_SYNC_KEYS.forEach(k => delete childData[k]);
    });

    return {
        version: 'brainbro-sync-v1',
        createdAt: Date.now(),
        scope,
        registry: scope === 'active_child'
            ? { ...registry, children: registry.children.filter(c => c.id === registry.activeChildId) }
            : registry,
        data,
    };
}

export async function exportEncryptedSyncPackage(scope: SyncScope, pass: string): Promise<string> {
    const pkg = exportSyncPackage(scope);
    const encrypted = await encryptJson(pass, pkg);
    return JSON.stringify({ _brainbro_sync: true, ...encrypted }, null, 2);
}

export async function importEncryptedSyncPackage(pass: string, jsonString: string): Promise<{ ok: boolean; childrenCount: number; errors?: string[] }> {
    const errors: string[] = [];
    let wrapper: any;
    try { wrapper = JSON.parse(jsonString); } catch { return { ok: false, childrenCount: 0, errors: ['Invalid JSON file.'] }; }

    if (!wrapper?._brainbro_sync || !wrapper.version) {
        return { ok: false, childrenCount: 0, errors: ['Not a valid BrainBro sync package.'] };
    }

    let pkg: SyncPackage;
    try {
        pkg = await decryptJson(pass, { version: wrapper.version, salt: wrapper.salt, iv: wrapper.iv, ct: wrapper.ct });
    } catch {
        return { ok: false, childrenCount: 0, errors: ['Decryption failed. Wrong passphrase?'] };
    }

    if (pkg.version !== 'brainbro-sync-v1') {
        return { ok: false, childrenCount: 0, errors: [`Unknown sync version: ${pkg.version}`] };
    }

    // Merge registry: add missing children, don't overwrite existing
    const localReg = getRegistry();
    let imported = 0;
    pkg.registry.children.forEach(child => {
        if (!localReg.children.find(c => c.id === child.id)) {
            localReg.children.push(child);
        }
        // Import child data
        const childData = pkg.data[child.id];
        if (!childData) return;
        Object.entries(childData).forEach(([baseKey, value]) => {
            if (EXCLUDED_SYNC_KEYS.includes(baseKey)) return;
            const key = withChildKey(baseKey, child.id);
            try {
                if (value === null || value === undefined) {
                    localStorage.removeItem(key);
                } else {
                    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                }
            } catch (e: any) {
                errors.push(`${key}: ${e?.message || 'unknown'}`);
            }
        });
        imported++;
    });

    saveRegistry(localReg);
    return { ok: true, childrenCount: imported, errors: errors.length > 0 ? errors : undefined };
}
