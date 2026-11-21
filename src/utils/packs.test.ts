import { describe, expect, it } from 'vitest';
import { cards } from '../data/cards';
import { DUPLICATE_REFUND, drawCard, PACK_PRICE, PITY_LIMIT, RARITY_WEIGHTS } from './packs';
import type { Rng } from './mathEngine';

function mulberry32(seed: number): Rng {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

describe('constants', () => {
    it('match the spec', () => {
        expect(PACK_PRICE).toEqual({ kinder: 60, grade4: 150 });
        expect(PITY_LIMIT).toBe(10);
        expect(DUPLICATE_REFUND).toEqual({ 1: 15, 2: 30, 3: 60, 4: 120 });
    });
});

describe('drawCard', () => {
    it('rarity frequencies approximate the weights over 10,000 draws', () => {
        const rng = mulberry32(1);
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
        for (let i = 0; i < 10000; i++) counts[drawCard(rng, 0, {}).card.rarity]++;
        // weights sum to 100, so weight == expected percent; counts / 100 == observed percent
        expect(Math.abs(counts[1] / 100 - RARITY_WEIGHTS[1])).toBeLessThan(3);
        expect(Math.abs(counts[2] / 100 - RARITY_WEIGHTS[2])).toBeLessThan(3);
        expect(Math.abs(counts[3] / 100 - RARITY_WEIGHTS[3])).toBeLessThan(2);
        expect(Math.abs(counts[4] / 100 - RARITY_WEIGHTS[4])).toBeLessThan(1.5);
    });

    it('pity: rarity >= 3 is guaranteed by the PITY_LIMIT-th pull', () => {
        for (let seed = 1; seed <= 200; seed++) {
            const rng = mulberry32(seed);
            let pity = 0;
            let pulls = 0;
            for (;;) {
                const r = drawCard(rng, pity, {});
                pulls++;
                pity = r.nextPity;
                if (r.card.rarity >= 3) break;
                expect(pulls).toBeLessThan(PITY_LIMIT);
            }
            expect(pulls).toBeLessThanOrEqual(PITY_LIMIT);
        }
    });

    it('nextPity resets on rarity >= 3 and increments otherwise', () => {
        const rng = mulberry32(5);
        for (let i = 0; i < 500; i++) {
            const r = drawCard(rng, 3, {});
            expect(r.nextPity).toBe(r.card.rarity >= 3 ? 0 : 4);
        }
    });

    it('prefers unowned cards and flags isNew', () => {
        const owned: Record<string, number> = {};
        for (const c of cards) if (c.rarity === 1) owned[c.id] = 1;
        const keep = cards.find((c) => c.rarity === 1);
        if (!keep) throw new Error('no r1 card');
        owned[keep.id] = 0;
        const rng = mulberry32(9);
        let hit = 0;
        let r1 = 0;
        for (let i = 0; i < 6000; i++) {
            const r = drawCard(rng, 0, owned);
            if (r.card.rarity !== 1) continue;
            r1++;
            if (r.card.id === keep.id) {
                hit++;
                expect(r.isNew).toBe(true);
            } else {
                expect(r.isNew).toBe(false);
            }
        }
        expect(hit / r1).toBeGreaterThan(0.65);
    });

    it('still draws when everything is owned (duplicates)', () => {
        const owned = Object.fromEntries(cards.map((c) => [c.id, 2]));
        const rng = mulberry32(11);
        for (let i = 0; i < 100; i++) {
            const r = drawCard(rng, 0, owned);
            expect(r.isNew).toBe(false);
            expect(r.card).toBeDefined();
        }
    });
});
