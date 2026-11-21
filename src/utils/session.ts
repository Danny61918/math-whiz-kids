import type { FactStats } from './factProgress';
import { sessionBonus } from './rewards';

/** Questions per session (not counting kinder retries). */
export const QUESTION_COUNT = { kinder: 8, grade4: 10 } as const;

/** A wrongly answered kinder question comes back this many questions later. */
export const RETRY_GAP = 3;

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
    extra?: number; // one-time bonus coins collected so far (not multiplied by the perfect bonus)
    bonusCoins?: number; // one-time bonus coins this answer earned if it counts
}

export interface SubmitOutcome {
    countsForStats: boolean; // first attempts only
    appendRetry: boolean; // a retry must be inserted at `insertAt`
    insertAt: number; // queue position of the retry (index + RETRY_GAP, or the end)
    nextCorrect: number;
    nextEarned: number;
    nextExtra: number;
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
    const nextExtra = (i.extra ?? 0) + (countsForStats && i.ok ? (i.bonusCoins ?? 0) : 0);
    const nextQueueLength = i.queueLength + (appendRetry ? 1 : 0);
    const isLast = i.index + 1 >= nextQueueLength;
    return {
        countsForStats,
        appendRetry,
        insertAt: Math.min(i.index + RETRY_GAP, i.queueLength),
        nextCorrect,
        nextEarned,
        nextExtra,
        nextQueueLength,
        isLast,
        finalCoins: isLast ? sessionBonus(nextEarned, nextCorrect, i.total) + nextExtra : 0,
    };
}

/** Inserts a retry at `insertAt` without mutating the queue. */
export function insertRetry<T>(queue: T[], item: T, insertAt: number): T[] {
    const at = Math.max(0, Math.min(insertAt, queue.length));
    return [...queue.slice(0, at), item, ...queue.slice(at)];
}

/** Number of real (non-retry) questions up to and including the current queue position. */
export function realQuestionNumber(queue: { isRetry: boolean }[], index: number): number {
    return queue.slice(0, index + 1).filter((q) => !q.isRetry).length;
}

export type AidMode = 'visible' | 'help' | 'none';

/** Skills that never show the ten-frame (mixed practice). */
const NO_AID_SKILLS = ['k_mixed', 'k_review'];

/** Ten-frame visibility from the fact's box: 0-1 visible, 2-3 behind the Help button, 4-5 none. */
export function aidModeFor(skillId: string, stats: FactStats | undefined): AidMode {
    if (NO_AID_SKILLS.includes(skillId)) return 'none';
    const box = stats && stats.attempts > 0 ? stats.box : 0;
    if (box <= 1) return 'visible';
    if (box <= 3) return 'help';
    return 'none';
}
