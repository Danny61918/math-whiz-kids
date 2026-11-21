export interface StreakState {
    count: number;
    best: number;
    lastDay: string | null; // local 'YYYY-MM-DD'
}

export const STREAK_MILESTONES = [3, 7, 14, 30];

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day key, 'YYYY-MM-DD'. */
export function dayKey(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Calendar day before a 'YYYY-MM-DD' key (pure calendar arithmetic, so DST cannot interfere). */
function previousDay(key: string): string {
    const [y, m, d] = key.split('-').map(Number);
    const prev = new Date(Date.UTC(y, m - 1, d - 1));
    return `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}-${pad(prev.getUTCDate())}`;
}

/** True for a real calendar date written as 'YYYY-MM-DD'. */
export function isValidDayKey(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Same day -> unchanged; yesterday -> +1; otherwise restart at 1.
 * If the stored day is in the future (clock was wrong), keep the count and just move lastDay back to today.
 */
export function updateStreak(s: StreakState, today: string): StreakState {
    if (s.lastDay === today) return s;
    if (s.lastDay !== null && today < s.lastDay) return { ...s, lastDay: today };
    const count = s.lastDay !== null && previousDay(today) === s.lastDay ? s.count + 1 : 1;
    return { count, best: Math.max(s.best, count), lastDay: today };
}

/** Streak to display: the stored count only while it is still alive (last session today or yesterday). */
export function displayStreak(s: StreakState, today: string): number {
    return s.lastDay !== null && (s.lastDay === today || s.lastDay === previousDay(today)) ? s.count : 0;
}

export function isMilestone(count: number): boolean {
    return STREAK_MILESTONES.includes(count);
}
