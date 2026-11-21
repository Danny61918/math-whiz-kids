import { describe, expect, it } from 'vitest';
import { FAST_MS, factLevel, isDue, updateFact, type FactStats } from './factProgress';

const D1 = '2026-05-01';
const D2 = '2026-05-02';
const fast = { correct: true, retrievalMs: 1500 };
const stats = (over: Partial<FactStats>): FactStats => ({
    box: 0, attempts: 1, correct: 1, lastSeenDay: D1, lastUpDay: null, bestMs: 2000, ...over,
});

describe('updateFact', () => {
    it('creates stats from nothing', () => {
        expect(updateFact(undefined, fast, D1)).toMatchObject({
            box: 1, attempts: 1, correct: 1, lastSeenDay: D1, lastUpDay: D1, bestMs: 1500,
        });
    });

    it('fast correct raises the box, capped at 5', () => {
        expect(updateFact(stats({ box: 2 }), fast, D2).box).toBe(3);
        expect(updateFact(stats({ box: 5 }), fast, D2).box).toBe(5);
    });

    it('accepts the FAST_MS boundary, rejects one ms over', () => {
        expect(updateFact(stats({ box: 1 }), { correct: true, retrievalMs: FAST_MS }, D2).box).toBe(2);
        expect(updateFact(stats({ box: 1 }), { correct: true, retrievalMs: FAST_MS + 1 }, D2).box).toBe(1);
    });

    it('rises at most once per calendar day', () => {
        const first = updateFact(stats({ box: 1 }), fast, D2);
        expect(first.box).toBe(2);
        const second = updateFact(first, fast, D2);
        expect(second.box).toBe(2);
        expect(second.attempts).toBe(first.attempts + 1);
        expect(updateFact(second, fast, '2026-05-03').box).toBe(3);
    });

    it('slow correct keeps the box without penalty', () => {
        const out = updateFact(stats({ box: 3 }), { correct: true, retrievalMs: 9000 }, D2);
        expect(out).toMatchObject({ box: 3, correct: 2, attempts: 2, lastSeenDay: D2, lastUpDay: null });
    });

    it('wrong drops two boxes, never below 0', () => {
        expect(updateFact(stats({ box: 5 }), { correct: false, retrievalMs: 1000 }, D2).box).toBe(3);
        expect(updateFact(stats({ box: 1 }), { correct: false, retrievalMs: 1000 }, D2).box).toBe(0);
        const out = updateFact(stats({ box: 4 }), { correct: false, retrievalMs: 1000 }, D2);
        expect(out).toMatchObject({ box: 2, correct: 1, attempts: 2, lastWrong: true });
    });

    it('keeps the best time of correct, unhelped answers only', () => {
        expect(updateFact(stats({ bestMs: 2000 }), { correct: true, retrievalMs: 1200 }, D2).bestMs).toBe(1200);
        expect(updateFact(stats({ bestMs: 2000 }), { correct: true, retrievalMs: 3000 }, D2).bestMs).toBe(2000);
        expect(updateFact(stats({ bestMs: 2000 }), { correct: false, retrievalMs: 100 }, D2).bestMs).toBe(2000);
        expect(updateFact(stats({ bestMs: 2000 }), { correct: true, retrievalMs: 100, helped: true }, D2).bestMs).toBe(2000);
    });

    it('a helped correct answer counts as correct but never raises the box', () => {
        const out = updateFact(stats({ box: 2 }), { ...fast, helped: true }, D2);
        expect(out).toMatchObject({ box: 2, correct: 2, attempts: 2, lastUpDay: null });
    });

    it('does not mutate its input and keeps the extra flags', () => {
        const s = stats({ box: 2, paid5: true });
        const copy = structuredClone(s);
        const out = updateFact(s, fast, D2);
        expect(s).toEqual(copy);
        expect(out.paid5).toBe(true);
    });
});

describe('isDue', () => {
    it('unseen is due', () => {
        expect(isDue(undefined, D1)).toBe(true);
        expect(isDue(stats({ attempts: 0 }), D1)).toBe(true);
    });
    it('box 0 is always due', () => {
        expect(isDue(stats({ box: 0 }), D1)).toBe(true);
    });
    it('follows the interval per box', () => {
        const intervals = [0, 1, 2, 4, 7, 14];
        for (const box of [1, 2, 3, 4, 5] as const) {
            const s = stats({ box, lastSeenDay: '2026-05-01' });
            const gap = intervals[box];
            const before = new Date(Date.UTC(2026, 4, 1 + gap - 1)).toISOString().slice(0, 10);
            const at = new Date(Date.UTC(2026, 4, 1 + gap)).toISOString().slice(0, 10);
            expect(isDue(s, before), `box ${box} before`).toBe(false);
            expect(isDue(s, at), `box ${box} at`).toBe(true);
        }
    });
    it('is not due when the clock went backwards, and never throws', () => {
        expect(isDue(stats({ box: 3, lastSeenDay: '2026-05-10' }), '2026-05-01')).toBe(false);
        expect(isDue(stats({ box: 0, lastSeenDay: '2026-05-10' }), '2026-05-01')).toBe(false);
        expect(() => isDue(stats({ lastSeenDay: 'garbage' }), D1)).not.toThrow();
        expect(isDue(stats({ lastSeenDay: null }), D1)).toBe(true);
    });
    it('updateFact repairs a future lastSeenDay', () => {
        expect(updateFact(stats({ lastSeenDay: '2026-09-01' }), fast, D1).lastSeenDay).toBe(D1);
    });
});

describe('factLevel', () => {
    it('maps boxes to levels', () => {
        expect(factLevel(undefined)).toBe('unseen');
        expect(factLevel(stats({ attempts: 0 }))).toBe('unseen');
        expect([0, 1, 2, 3, 4, 5].map((box) => factLevel(stats({ box: box as FactStats['box'] })))).toEqual([
            'learning', 'learning', 'solid', 'solid', 'mastered', 'mastered',
        ]);
    });
});
