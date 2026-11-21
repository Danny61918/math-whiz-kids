// Report which cards have art in public/cards/<id>.webp. Always exits 0 (it is a report).
// Run: npm run cards:check
import { existsSync, readdirSync, statSync } from 'node:fs';
import { cards } from '../src/data/cards.ts';

const DIR = 'public/cards';
const WARN_BYTES = 150 * 1024;

const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.webp')) : [];
const have = new Set(files.map((f) => f.slice(0, -'.webp'.length)));
const ids = new Set(cards.map((c) => c.id));

const perCategory = new Map();
const missing = [];
for (const card of cards) {
    const row = perCategory.get(card.category) ?? { have: 0, total: 0 };
    row.total += 1;
    if (have.has(card.id)) row.have += 1;
    else missing.push(card.id);
    perCategory.set(card.category, row);
}

console.log('Card art report (public/cards/<id>.webp)\n');
for (const [category, { have: h, total }] of perCategory) {
    console.log(`  ${category.padEnd(12)} ${String(h).padStart(3)} / ${total}`);
}
console.log(`  ${'TOTAL'.padEnd(12)} ${String(cards.length - missing.length).padStart(3)} / ${cards.length}\n`);

if (missing.length > 0) {
    console.log(`Missing (${missing.length}):`);
    for (const id of missing) console.log(`  ${id}.webp`);
    console.log('');
}

const unknown = files.filter((f) => !ids.has(f.slice(0, -'.webp'.length)));
for (const f of unknown) console.warn(`WARNING: ${f} matches no card id`);
for (const f of files) {
    const size = statSync(`${DIR}/${f}`).size;
    if (size > WARN_BYTES) console.warn(`WARNING: ${f} is ${(size / 1024).toFixed(0)} KB (over ~150 KB)`);
}
