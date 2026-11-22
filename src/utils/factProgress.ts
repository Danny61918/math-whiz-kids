import { daysBetween, isValidDayKey } from './streak';

export interface FactStats {
    box: 0 | 1 | 2 | 3 | 4 | 5;
    attempts: number;
    correct: number;
    lastSeenDay: string | null;
    lastUpDay: string | null;
    bestMs: number | null;
    /** Optional extras: last first-attempt was wrong; the box-5 coin bonus was already paid. */
    lastWrong?: boolean;
    paid5?: boolean;
}

export const BOX_INTERVAL_DAYS = [0, 1, 2, 4, 7, 14];
export const FAST_MS = 4000;

export type FactLevel = 'unseen' | 'learning' | 'solid' | 'mastered';

export interface FactResult {
    correct: boolean;
    retrievalMs: number;
    /** Child used the Help button: a correct answer counts but never raises the box. */
    helped?: boolean;
}

const EMPTY: FactStats = { box: 0, attempts: 0, correct: 0, lastSeenDay: null, lastUpDay: null, bestMs: null };

export function updateFact(s: FactStats | undefined, r: FactResult, today: string, fastMs: number = FAST_MS): FactStats {
    const prev = s ?? EMPTY;
    let box = prev.box;
    let lastUpDay = prev.lastUpDay;
    if (r.correct) {
        // Boxes 0-1 rise on any unhelped correct answer; from box 2 up the answer must also be fast.
        const fastEnough = box <= 1 || r.retrievalMs <= fastMs;
        if (!r.helped && fastEnough && prev.lastUpDay !== today && box < 5) {
            box = (box + 1) as FactStats['box'];
            lastUpDay = today;
        }
    } else {
        box = Math.max(0, box - 2) as FactStats['box'];
    }
    const counts = r.correct && !r.helped;
    return {
        ...prev,
        box,
        attempts: prev.attempts + 1,
        correct: prev.correct + (r.correct ? 1 : 0),
        lastSeenDay: today,
        lastUpDay,
        bestMs: counts ? (prev.bestMs === null ? r.retrievalMs : Math.min(prev.bestMs, r.retrievalMs)) : prev.bestMs,
        lastWrong: !r.correct,
    };
}

export function isAttempted(s: FactStats | undefined): s is FactStats {
    return s !== undefined && s.attempts > 0;
}

export function isDue(s: FactStats | undefined, today: string): boolean {
    if (!isAttempted(s) || !isValidDayKey(s.lastSeenDay)) return true;
    const gap = daysBetween(s.lastSeenDay, today);
    if (gap < 0) return false; // clock went backwards
    return gap >= BOX_INTERVAL_DAYS[s.box];
}

export function factLevel(s?: FactStats): FactLevel {
    if (!isAttempted(s)) return 'unseen';
    if (s.box >= 4) return 'mastered';
    if (s.box >= 2) return 'solid';
    return 'learning';
}

/** Highest box a diagnostic can seed: real mastery needs multi-day review. */
export const DIAGNOSTIC_MAX_BOX = 2;

/**
 * Seeds a fact from the times-table check: correct and fast -> box max(current, 2); correct but slow ->
 * max(current, 1); wrong -> box 0 with lastWrong. Never above box 2 (a higher existing box is kept on a
 * correct answer). Counts as an attempt; leaves lastUpDay alone.
 */
export function seedDiagnosticFact(s: FactStats | undefined, r: Pick<FactResult, 'correct' | 'retrievalMs'>, today: string, fastMs: number = FAST_MS): FactStats {
    const prev = s ?? EMPTY;
    const box = r.correct ? (Math.max(prev.box, r.retrievalMs <= fastMs ? DIAGNOSTIC_MAX_BOX : 1) as FactStats['box']) : 0;
    return {
        ...prev,
        box,
        attempts: prev.attempts + 1,
        correct: prev.correct + (r.correct ? 1 : 0),
        lastSeenDay: today,
        bestMs: r.correct ? (prev.bestMs === null ? r.retrievalMs : Math.min(prev.bestMs, r.retrievalMs)) : prev.bestMs,
        lastWrong: !r.correct,
    };
}
