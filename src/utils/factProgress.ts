import { daysBetween } from './streak';

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

export function updateFact(s: FactStats | undefined, r: FactResult, today: string): FactStats {
    const prev = s ?? EMPTY;
    let box = prev.box;
    let lastUpDay = prev.lastUpDay;
    if (r.correct) {
        if (!r.helped && r.retrievalMs <= FAST_MS && prev.lastUpDay !== today && box < 5) {
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
    if (!isAttempted(s) || s.lastSeenDay === null) return true;
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
