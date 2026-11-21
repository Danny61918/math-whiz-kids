import { describe, expect, it } from 'vitest';
import { resolveSubmit, type SubmitInput } from './session';

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
