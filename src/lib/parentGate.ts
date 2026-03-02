/**
 * Phase 15.0: Parent Gate — simple passcode protection for parent dashboard.
 * Uses simpleHash from backup.ts for hashing (no crypto dependency).
 */

const GATE_KEY = 'brainbro_parent_gate_v1';
const SESSION_KEY = 'brainbro_parent_unlocked';

function simpleHash(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
}

interface GateData {
    hash: string;
    createdAt: string;
}

export function isPasscodeSet(): boolean {
    try {
        const raw = localStorage.getItem(GATE_KEY);
        if (!raw) return false;
        const data: GateData = JSON.parse(raw);
        return !!data.hash;
    } catch { return false; }
}

export function setPasscode(passcode: string): void {
    const data: GateData = {
        hash: simpleHash(passcode),
        createdAt: new Date().toISOString(),
    };
    localStorage.setItem(GATE_KEY, JSON.stringify(data));
    sessionStorage.setItem(SESSION_KEY, 'true');
}

export function unlockParentGate(input: string): boolean {
    try {
        const raw = localStorage.getItem(GATE_KEY);
        if (!raw) return false;
        const data: GateData = JSON.parse(raw);
        if (simpleHash(input) === data.hash) {
            sessionStorage.setItem(SESSION_KEY, 'true');
            return true;
        }
        return false;
    } catch { return false; }
}

export function isParentUnlocked(): boolean {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function lockParentGate(): void {
    sessionStorage.removeItem(SESSION_KEY);
}
