/**
 * Phase 15.2: Web Crypto encryption for sync packages.
 * AES-GCM 256 + PBKDF2 key derivation.
 */

const PBKDF2_ITERATIONS = 100_000;

function toBase64(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    return btoa(String.fromCharCode(...bytes));
}

function fromBase64(b64: string): Uint8Array {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf;
}

export function isCryptoAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.crypto?.subtle;
}

async function deriveKey(pass: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

export interface EncryptedPack {
    version: 'v1';
    salt: string;
    iv: string;
    ct: string;
}

export async function encryptJson(pass: string, data: any): Promise<EncryptedPack> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pass, salt);
    const enc = new TextEncoder();
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, enc.encode(JSON.stringify(data)));
    return {
        version: 'v1',
        salt: toBase64(salt),
        iv: toBase64(iv),
        ct: toBase64(ct),
    };
}

export async function decryptJson(pass: string, pack: EncryptedPack): Promise<any> {
    const salt = fromBase64(pack.salt);
    const iv = fromBase64(pack.iv);
    const ct = fromBase64(pack.ct);
    const key = await deriveKey(pass, salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, ct.buffer as ArrayBuffer);
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(plain));
}
