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

/** Same day -> unchanged; yesterday -> +1; otherwise restart at 1. A clock that went backwards never lowers anything. */
export function updateStreak(s: StreakState, today: string): StreakState {
    if (s.lastDay !== null && today <= s.lastDay) return s;
    const count = s.lastDay !== null && previousDay(today) === s.lastDay ? s.count + 1 : 1;
    return { count, best: Math.max(s.best, count), lastDay: today };
}

export function isMilestone(count: number): boolean {
    return STREAK_MILESTONES.includes(count);
}
