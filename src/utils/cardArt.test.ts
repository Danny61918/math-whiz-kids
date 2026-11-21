import { describe, expect, it } from 'vitest';
import { cards } from '../data/cards';
import { cardArtUrl } from './cardArt';
import { buildPromptRow, flourishFor, subjectFor, toCsv } from './cardPrompts';

describe('cardArtUrl', () => {
    it('builds the URL under the Vite base', () => {
        expect(cardArtUrl('dino_tyrannosaurus', '/math-whiz-kids/')).toBe('/math-whiz-kids/cards/dino_tyrannosaurus.webp');
        expect(cardArtUrl('car_taxi', '/')).toBe('/cards/car_taxi.webp');
    });
    it('tolerates a base without a trailing slash', () => {
        expect(cardArtUrl('car_taxi', '/math-whiz-kids')).toBe('/math-whiz-kids/cards/car_taxi.webp');
    });
    it('defaults to the current BASE_URL', () => {
        expect(cardArtUrl('car_taxi')).toBe(`${import.meta.env.BASE_URL}cards/car_taxi.webp`);
    });
});

describe('prompt rows', () => {
    const find = (id: string) => {
        const card = cards.find((c) => c.id === id);
        if (!card) throw new Error(id);
        return card;
    };

    it('builds a row per card with the expected columns', () => {
        const row = buildPromptRow(find('dino_tyrannosaurus'), 'STYLE', 'NEG');
        expect(row).toEqual({
            id: 'dino_tyrannosaurus', category: 'dino', rarity: 1, nameEn: 'Tyrannosaurus', nameZh: '暴龍',
            output_filename: 'dino_tyrannosaurus.webp',
            prompt: 'STYLE, a friendly cartoon Tyrannosaurus dinosaur', negative_prompt: 'NEG',
        });
    });

    it('describes subjects by category and adds flourishes for rare cards', () => {
        expect(subjectFor({ category: 'car', nameEn: 'Taxi' })).toBe('a cute cartoon Taxi');
        expect(subjectFor({ category: 'dino', nameEn: 'Pteranodon' })).toContain('pterosaur');
        expect(subjectFor({ category: 'dino', nameEn: 'Quetzalcoatlus' })).not.toContain('dinosaur');
        expect(subjectFor({ category: 'dino', nameEn: 'Stegosaurus' })).toContain('dinosaur');
        expect(subjectFor({ category: 'space', nameEn: 'Mars' })).toContain('outer space');
        expect(flourishFor(1)).toBe('');
        expect(flourishFor(2)).toBe('');
        expect(flourishFor(3)).toContain('sparkles');
        expect(flourishFor(4)).toContain('golden');
    });

    it('produces unique filenames and a quoted CSV', () => {
        const rows = cards.map((c) => buildPromptRow(c, 'a, b', 'n "x"'));
        expect(new Set(rows.map((r) => r.output_filename)).size).toBe(200);
        const csv = toCsv(rows.slice(0, 1));
        expect(csv.split('\n')[0]).toBe('id,category,rarity,nameEn,nameZh,output_filename,prompt,negative_prompt');
        expect(csv).toContain('"a, b, a friendly cartoon Tyrannosaurus dinosaur"');
        expect(csv).toContain('"n ""x"""');
    });
});
