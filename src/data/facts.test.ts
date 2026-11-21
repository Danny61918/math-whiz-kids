import { describe, expect, it } from 'vitest';
import { LADDER_POOL_IDS, allFacts, factKey, parseFactKey, poolFor } from './facts';

describe('facts', () => {
    it('has 81 addition and 81 subtraction facts with unique keys', () => {
        expect(allFacts).toHaveLength(162);
        expect(allFacts.filter((f) => f.op === '+')).toHaveLength(81);
        expect(allFacts.filter((f) => f.op === '-')).toHaveLength(81);
        expect(new Set(allFacts.map((f) => f.key)).size).toBe(162);
    });

    it('keeps operands in 1..9, no zero, sums <= 18', () => {
        for (const f of allFacts) {
            expect(f.a).toBeGreaterThanOrEqual(1);
            expect(f.a).toBeLessThanOrEqual(9);
            expect(f.b).toBeGreaterThanOrEqual(1);
            expect(f.b).toBeLessThanOrEqual(9);
            expect(f.sum).toBe(f.a + f.b);
            expect(f.sum).toBeLessThanOrEqual(18);
            if (f.op === '-') expect(f.sum).toBeGreaterThanOrEqual(2);
        }
    });

    it('builds keys as specified and round-trips through parseFactKey', () => {
        expect(factKey('+', 7, 8)).toBe('7+8');
        expect(factKey('-', 7, 8)).toBe('15-7'); // minuend 15, subtrahend 7, answer 8
        for (const f of allFacts) expect(parseFactKey(f.key)).toEqual(f);
    });

    it('rejects bad keys', () => {
        for (const k of ['', 'x', '0+3', '3+0', '10+1', '5-5', '19-9', '3-4', '1+2+3', '03+4', '7*8']) {
            expect(parseFactKey(k), k).toBeNull();
        }
    });

    it('subtraction facts are the family partners of addition facts', () => {
        expect(parseFactKey('15-7')).toMatchObject({ op: '-', a: 7, b: 8, sum: 15 });
    });
});

describe('poolFor', () => {
    it('every pool is non-empty and only holds valid facts', () => {
        for (const id of [...LADDER_POOL_IDS, 'k_review']) {
            const pool = poolFor(id);
            expect(pool.length, id).toBeGreaterThan(0);
            expect(new Set(pool.map((f) => f.key)).size, id).toBe(pool.length);
            for (const f of pool) expect(parseFactKey(f.key)).toEqual(f);
        }
        expect(poolFor('nope')).toEqual([]);
    });

    it('pools obey their constraints', () => {
        expect(poolFor('k_add_5').every((f) => f.op === '+' && f.sum <= 5)).toBe(true);
        expect(poolFor('k_sub_5').every((f) => f.op === '-' && f.sum <= 5)).toBe(true);
        expect(poolFor('k_plus12').every((f) => f.op === '+' && (f.a <= 2 || f.b <= 2) && f.sum <= 11)).toBe(true);
        expect(poolFor('k_doubles').map((f) => f.key)).toEqual(['1+1', '2+2', '3+3', '4+4', '5+5', '6+6', '7+7', '8+8', '9+9']);
        const make10 = poolFor('k_make10');
        expect(make10).toHaveLength(9);
        expect(make10.every((f) => f.op === '+' && f.sum === 10)).toBe(true);
        expect(poolFor('k_add_10').every((f) => f.op === '+' && f.sum <= 10)).toBe(true);
        expect(poolFor('k_sub_10').every((f) => f.op === '-' && f.sum <= 10)).toBe(true);
        const family = poolFor('k_family_10');
        expect(family.every((f) => f.sum <= 10)).toBe(true);
        expect(new Set(family.map((f) => f.op))).toEqual(new Set(['+', '-']));
        const near = poolFor('k_near_doubles');
        expect(near).toHaveLength(12);
        expect(near.every((f) => f.op === '+' && Math.abs(f.a - f.b) === 1 && f.sum >= 7 && f.sum <= 17)).toBe(true);
        expect(poolFor('k_plus89').every((f) => f.op === '+' && f.sum >= 10 && (f.a >= 8 || f.b >= 8) && f.a >= 2 && f.b >= 2)).toBe(true);
        expect(poolFor('k_add_11_18').every((f) => f.op === '+' && f.sum >= 11)).toBe(true);
        expect(poolFor('k_sub_11_18').every((f) => f.op === '-' && f.sum >= 11)).toBe(true);
        expect(poolFor('k_mixed')).toHaveLength(162);
    });

    it('the ladder pools together cover all 162 facts', () => {
        const covered = new Set(LADDER_POOL_IDS.flatMap((id) => poolFor(id).map((f) => f.key)));
        expect(covered.size).toBe(162);
    });
});
