export const BLITZ_SECONDS = 60;

export interface BlitzOutcome {
    best: number;
    bestDay: string | null;
    newRecord: boolean;
    ticket: boolean;
}

/**
 * Pure blitz scoring: a record needs a score above the personal best; the record ticket is
 * granted at most once per calendar day (bestDay = the day a record last paid out).
 */
export function evaluateBlitz(score: number, best: number, bestDay: string | null, today: string): BlitzOutcome {
    const safe = Math.max(0, Math.floor(score));
    if (safe <= best) return { best, bestDay, newRecord: false, ticket: false };
    return { best: safe, bestDay: today, newRecord: true, ticket: bestDay !== today };
}
