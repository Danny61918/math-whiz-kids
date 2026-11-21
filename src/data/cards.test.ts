import { describe, expect, it } from 'vitest';
import planRaw from '../../scripts/card_batch_plan.json?raw';
import { CATEGORIES, cards, cardsById, type CardCategory } from './cards';

const EXPECTED: Record<CardCategory, number> = { dino: 40, car: 40, plane: 30, ship_train: 25, space: 25, rescue: 40 };

describe('cards data', () => {
    it('has 200 cards and exact category counts', () => {
        expect(cards).toHaveLength(200);
        for (const cat of CATEGORIES) {
            expect(cards.filter((c) => c.category === cat)).toHaveLength(EXPECTED[cat]);
        }
    });

    it('has unique snake_case ids prefixed by category, matching cardsById', () => {
        expect(new Set(cards.map((c) => c.id)).size).toBe(200);
        for (const c of cards) {
            expect(c.id).toMatch(/^[a-z0-9]+(_[a-z0-9]+)+$/);
            expect(c.id.startsWith(`${c.category}_`)).toBe(true);
            expect(cardsById[c.id]).toBe(c);
        }
    });

    it('has unique non-empty names per category', () => {
        for (const cat of CATEGORIES) {
            const list = cards.filter((c) => c.category === cat);
            expect(new Set(list.map((c) => c.nameEn)).size).toBe(list.length);
            expect(new Set(list.map((c) => c.nameZh)).size).toBe(list.length);
        }
        for (const c of cards) {
            expect(c.nameEn.trim().length).toBeGreaterThan(0);
            expect(c.nameZh.trim().length).toBeGreaterThan(0);
            expect(c.emoji.length).toBeGreaterThan(0);
        }
    });

    it('has valid hues and rarities', () => {
        for (const c of cards) {
            expect(c.hue).toBeGreaterThanOrEqual(0);
            expect(c.hue).toBeLessThan(360);
            expect([1, 2, 3, 4]).toContain(c.rarity);
        }
    });

    it('rarity distribution is about 50/30/14/6 percent (+-3 cards)', () => {
        const count = (r: number) => cards.filter((c) => c.rarity === r).length;
        const target = { 1: 100, 2: 60, 3: 28, 4: 12 };
        for (const r of [1, 2, 3, 4] as const) expect(Math.abs(count(r) - target[r])).toBeLessThanOrEqual(3);
    });

    it('every category has every rarity', () => {
        for (const cat of CATEGORIES) {
            const rarities = new Set(cards.filter((c) => c.category === cat).map((c) => c.rarity));
            expect(rarities.size).toBe(4);
        }
    });

    it('keeps scripts/card_batch_plan.json in sync with the cards (same ids, same order)', () => {
        const plan = JSON.parse(planRaw) as { cards: { key: string; category: string; rarity: number }[] };
        expect(plan.cards.map((c) => c.key)).toEqual(cards.map((c) => c.id));
        expect(plan.cards.map((c) => [c.category, c.rarity])).toEqual(cards.map((c) => [c.category, c.rarity]));
    });
});
