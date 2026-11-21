import { sessionBonus } from './rewards';

/** Questions per session (not counting kinder retries). */
export const QUESTION_COUNT = { kinder: 8, grade4: 10 } as const;

export interface SubmitInput {
    isRetry: boolean;
    ok: boolean;
    isKinder: boolean;
    index: number; // position in the queue
    queueLength: number;
    earned: number; // coins so far (before bonus)
    correct: number; // first-try correct so far
    total: number; // real questions in the session (without retries)
    questionCoins: number; // coins this answer is worth if it counts
}

export interface SubmitOutcome {
    countsForStats: boolean; // first attempts only
    appendRetry: boolean;
    nextCorrect: number;
    nextEarned: number;
    nextQueueLength: number;
    isLast: boolean;
    finalCoins: number; // total coins to award, only when isLast
}

/** Pure decision for one submitted answer: stats, retry queue and the end-of-session award. */
export function resolveSubmit(i: SubmitInput): SubmitOutcome {
    const countsForStats = !i.isRetry;
    const appendRetry = countsForStats && !i.ok && i.isKinder;
    const nextCorrect = countsForStats && i.ok ? i.correct + 1 : i.correct;
    const nextEarned = countsForStats && i.ok ? i.earned + i.questionCoins : i.earned;
    const nextQueueLength = i.queueLength + (appendRetry ? 1 : 0);
    const isLast = i.index + 1 >= nextQueueLength;
    return {
        countsForStats,
        appendRetry,
        nextCorrect,
        nextEarned,
        nextQueueLength,
        isLast,
        finalCoins: isLast ? sessionBonus(nextEarned, nextCorrect, i.total) : 0,
    };
}
