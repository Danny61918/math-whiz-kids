// Exports one image-generation prompt per card to docs/card-prompts.csv and docs/card-prompts.json.
// Run: npm run cards:prompts   (needs Node 22+, TypeScript sources are loaded with type stripping)
import { mkdirSync, writeFileSync } from 'node:fs';
import { cards } from '../src/data/cards.ts';
import { buildPromptRow, toCsv } from '../src/utils/cardPrompts.ts';

// ---- EDIT THESE to change the look of every card ----
const STYLE =
    'cute kid-friendly flat sticker-style illustration, bold clean outlines, bright cheerful colors, plain light background, centered, no text';
const NEGATIVE_PROMPT =
    'text, letters, watermark, logo, photo, realistic, scary, gore, blood, dark, cluttered background, cropped, deformed';
// ------------------------------------------------------

const rows = cards.map((card) => buildPromptRow(card, STYLE, NEGATIVE_PROMPT));
mkdirSync('docs', { recursive: true });
writeFileSync('docs/card-prompts.csv', toCsv(rows), 'utf8');
writeFileSync('docs/card-prompts.json', `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
console.log(`Wrote ${rows.length} prompts to docs/card-prompts.csv and docs/card-prompts.json`);
