#!/usr/bin/env node
/**
 * Phase 16.2: Codefence Guard
 * Scans src/**\/*.tsx for accidental markdown code fences (``` or ~~~).
 * Exits with code 1 if found.
 */

const fs = require('fs');
const path = require('path');

function walk(dir, ext, results = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
            walk(full, ext, results);
        } else if (entry.isFile() && entry.name.endsWith(ext)) {
            results.push(full);
        }
    }
    return results;
}

function main() {
    const srcDir = path.join(__dirname, '..', 'src');
    const files = walk(srcDir, '.tsx');
    let found = 0;

    for (const file of files) {
        const lines = fs.readFileSync(file, 'utf-8').split('\n');
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trimStart();
            if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
                const rel = path.relative(path.join(__dirname, '..'), file);
                console.error(`❌ CODEFENCE at ${rel}:${i + 1} → ${lines[i].trim()}`);
                found++;
            }
        }
    }

    if (found > 0) {
        console.error(`\n⛔ Found ${found} codefence(s) in TSX files. Fix them before building.`);
        process.exit(1);
    } else {
        console.log('✅ No codefences found in TSX files.');
    }
}

main();
