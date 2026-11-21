import { describe, expect, it } from 'vitest';
import { aidModeFor, insertRetry, resolveSubmit, type SubmitInput } from './session';
import type { FactStats } from './factProgress';

const base: SubmitInput = {
    isRetry: false, ok: true, isKinder: false, index: 0, queueLength: 5,
    earned: 0, correct: 0, total: 5, questionCoins: 20,
};

describe('resolveSubmit', () => {
    it('counts a first-try correct answer', () => {
        const o = resolveSubmit(base);
        expect(o).toMatchObject({ countsForStats: true, nextCorrect: 1, nextEarned: 20, isLast: false, finalCoins: 0 });
    });

    it('last question right: awards, with perfect bonus', () => {
        const o = resolveSubmit({ ...base, index: 4, earned: 80, correct: 4 });
        expect(o).toMatchObject({ isLast: true, nextCorrect: 5, nextEarned: 100, finalCoins: 120 });
    });

    it('last question wrong (grade4): no bonus, no retry', () => {
        const o = resolveSubmit({ ...base, index: 4, ok: false, earned: 80, correct: 4 });
        expect(o).toMatchObject({ isLast: true, appendRetry: false, finalCoins: 80 });
    });

    it('kinder wrong on the final question appends a retry and is not last', () => {
        const o = resolveSubmit({ ...base, isKinder: true, index: 4, ok: false, earned: 80, correct: 4 });
        expect(o).toMatchObject({ appendRetry: true, nextQueueLength: 6, isLast: false, finalCoins: 0 });
    });

    it('a retry is never re-appended and never counts', () => {
        const wrong = resolveSubmit({ ...base, isKinder: true, isRetry: true, ok: false, index: 5, queueLength: 6, earned: 80, correct: 4 });
        expect(wrong).toMatchObject({ countsForStats: false, appendRetry: false, isLast: true, finalCoins: 80 });
        const right = resolveSubmit({ ...base, isKinder: true, isRetry: true, ok: true, index: 5, queueLength: 6, earned: 80, correct: 4 });
        expect(right).toMatchObject({ nextCorrect: 4, nextEarned: 80, finalCoins: 80 });
    });

    it('perfect bonus only when every first try was right', () => {
        const retryEnd = resolveSubmit({ ...base, isKinder: true, isRetry: true, index: 5, queueLength: 6, earned: 100, correct: 4 });
        expect(retryEnd.finalCoins).toBe(100);
    });
});

describe('resolveSubmit retry insertion (kinder)', () => {
    const kinder: SubmitInput = { ...base, isKinder: true, queueLength: 8, total: 8 };

    it('inserts the retry 3 questions later', () => {
        const o = resolveSubmit({ ...kinder, ok: false, index: 1 });
        expect(o).toMatchObject({ appendRetry: true, insertAt: 4, nextQueueLength: 9, isLast: false });
    });

    it('clamps to the end of the queue when fewer than 3 questions remain', () => {
        expect(resolveSubmit({ ...kinder, ok: false, index: 6 }).insertAt).toBe(8);
        expect(resolveSubmit({ ...kinder, ok: false, index: 7 })).toMatchObject({ insertAt: 8, isLast: false, finalCoins: 0 });
        expect(resolveSubmit({ ...kinder, ok: false, index: 5 }).insertAt).toBe(8);
    });

    it('the award happens only at the real final submit, exactly once', () => {
        // 8 questions, the 2nd one wrong -> queue grows to 9; only index 8 is last.
        let queueLength = 8;
        let earned = 0;
        let correct = 0;
        const finals: number[] = [];
        for (let index = 0; index < 9; index++) {
            const isRetry = index === 4;
            const ok = !(index === 1);
            const o = resolveSubmit({ ...kinder, index, queueLength, isRetry, ok, earned, correct, questionCoins: 10 });
            queueLength = o.nextQueueLength;
            earned = o.nextEarned;
            correct = o.nextCorrect;
            if (o.isLast) finals.push(o.finalCoins);
            else expect(o.finalCoins).toBe(0);
        }
        expect(finals).toEqual([70]); // 7 first-try correct x 10, no perfect bonus
        expect(queueLength).toBe(9);
    });

    it('keeps perfect-bonus accounting: bonus coins are added after the 1.2 multiplier', () => {
        const o = resolveSubmit({ ...kinder, index: 7, correct: 7, earned: 70, total: 8, extra: 20, bonusCoins: 20, questionCoins: 10 });
        expect(o).toMatchObject({ isLast: true, nextExtra: 40, finalCoins: 96 + 40 });
        const noPerfect = resolveSubmit({ ...kinder, index: 7, ok: false, correct: 7, earned: 70, total: 8, extra: 20 });
        expect(noPerfect.isLast).toBe(false); // wrong on the last: retry appended
    });

    it('does not count bonus coins from wrong answers or retries', () => {
        expect(resolveSubmit({ ...kinder, ok: false, bonusCoins: 20 }).nextExtra).toBe(0);
        expect(resolveSubmit({ ...kinder, isRetry: true, bonusCoins: 20 }).nextExtra).toBe(0);
    });
});

describe('insertRetry', () => {
    it('inserts without mutating and clamps the position', () => {
        const q = [1, 2, 3, 4];
        expect(insertRetry(q, 9, 2)).toEqual([1, 2, 9, 3, 4]);
        expect(insertRetry(q, 9, 99)).toEqual([1, 2, 3, 4, 9]);
        expect(insertRetry(q, 9, -3)).toEqual([9, 1, 2, 3, 4]);
        expect(q).toEqual([1, 2, 3, 4]);
    });
});

describe('aidModeFor', () => {
    const stat = (box: FactStats['box']): FactStats => ({ box, attempts: 2, correct: 2, lastSeenDay: null, lastUpDay: null, bestMs: null });
    it('fades the aid with the box', () => {
        expect(aidModeFor('k_add_5', undefined)).toBe('visible');
        expect([0, 1, 2, 3, 4, 5].map((b) => aidModeFor('k_add_5', stat(b as FactStats['box'])))).toEqual([
            'visible', 'visible', 'help', 'help', 'none', 'none',
        ]);
    });
    it('mixed and review never show an aid', () => {
        expect(aidModeFor('k_mixed', undefined)).toBe('none');
        expect(aidModeFor('k_review', stat(0))).toBe('none');
    });
});
