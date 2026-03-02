/**
 * Phase 15.3: Child Safety & Content Boundaries (CSCB)
 * Local policy engine — keyword + regex based content filtering.
 * No external API. Deterministic.
 */

import type { AgeBand } from '../types';
import { getRegistry } from './childStorage';

// ─── PII Patterns ───
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{2,4}/g;
const ADDRESS_RE = /\b(calle|av\.|avenida|colonia|col\.|c\.p\.|código postal|zip)\b\s*[\w\d\s,#.-]{5,}/gi;

// ─── Disallowed Content Keywords ───
const SEXUAL_KW = ['sexo', 'sexual', 'pornografía', 'porno', 'desnud', 'xxx', 'orgasm', 'genital', 'erotic', 'masturb', 'coito'];
const SELF_HARM_KW = ['suicid', 'cortarme', 'autolesion', 'self-harm', 'quiero morir', 'hacerme daño', 'cortarse las venas'];
const VIOLENCE_KW = ['tortura', 'decapitar', 'mutilación', 'descuartizar', 'asesinar brutalmente', 'gore', 'masacre'];
const DRUGS_KW = ['cocaína', 'heroína', 'metanfetamina', 'crack', 'drogas ilegales', 'narcotráfico', 'traficar'];
const HATE_KW = ['odio racial', 'supremacía', 'exterminio', 'genocidio', 'limpieza étnica', 'inferioridad racial'];

// Age-gated topics: allowed only for 12+ or 15+
const MILD_MATURE_KW = ['alcohol', 'cerveza', 'cigarro', 'fumar', 'apuesta', 'apostar'];

function containsAny(text: string, keywords: string[]): boolean {
    const lower = text.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
}

// ─── Public API ───

/** Remove PII (emails, phones, addresses) from user text */
export function sanitizeUserText(input: string): string {
    return input
        .replace(EMAIL_RE, '[EMAIL]')
        .replace(PHONE_RE, (match) => {
            // Avoid replacing short numbers that are likely math
            if (match.replace(/\D/g, '').length >= 7) return '[PHONE]';
            return match;
        })
        .replace(ADDRESS_RE, '[ADDRESS]');
}

/** Check if text contains disallowed topics for a given age band */
export function isDisallowedTopic(text: string, ageBand?: AgeBand): boolean {
    if (containsAny(text, SEXUAL_KW)) return true;
    if (containsAny(text, SELF_HARM_KW)) return true;
    if (containsAny(text, VIOLENCE_KW)) return true;
    if (containsAny(text, DRUGS_KW)) return true;
    if (containsAny(text, HATE_KW)) return true;
    // Age-gated mild mature content
    const band = ageBand || '9-11';
    if ((band === '6-8' || band === '9-11') && containsAny(text, MILD_MATURE_KW)) return true;
    return false;
}

/** Safe fallback prompt when content is filtered */
export const SAFE_FALLBACK_PROMPT = 'Toma una decisión sobre cómo organizar tu tiempo entre tareas escolares y descanso. ¿Qué harías y por qué?';

/** Filter a prompt: if it contains disallowed content, replace entirely */
export function filterPrompt(prompt: string, ageBand?: AgeBand): string {
    if (isDisallowedTopic(prompt, ageBand)) {
        return SAFE_FALLBACK_PROMPT;
    }
    return sanitizeUserText(prompt);
}

/** Get the active child's age band from registry */
export function getActiveAgeBand(): AgeBand {
    const reg = getRegistry();
    const child = reg.children.find(c => c.id === reg.activeChildId);
    return child?.ageBand || '9-11';
}

/** Safety preamble to inject into all AI scoring prompts */
export const AI_SAFETY_PREAMBLE = 'IMPORTANT: Do not generate or mention sexual, violent, self-harm, illegal, hate content. Do not request or include personal data (emails, phone numbers, addresses). This is for a child user.';
