import { describe, expect, it } from 'vitest';
import { dayKey, isMilestone, STREAK_MILESTONES, updateStreak } from './streak';

const fresh = { count: 0, best: 0, lastDay: null };

describe('dayKey', () => {
    it('is local YYYY-MM-DD', () => {
        expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
        expect(dayKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
    });
});

describe('updateStreak', () => {
    it('first ever session starts at 1', () => {
        expect(updateStreak(fresh, '2026-03-10')).toEqual({ count: 1, best: 1, lastDay: '2026-03-10' });
    });
    it('same day is unchanged', () => {
        const s = { count: 4, best: 6, lastDay: '2026-03-10' };
        expect(updateStreak(s, '2026-03-10')).toBe(s);
    });
    it('consecutive day increments and tracks best', () => {
        const s = { count: 4, best: 4, lastDay: '2026-03-10' };
        expect(updateStreak(s, '2026-03-11')).toEqual({ count: 5, best: 5, lastDay: '2026-03-11' });
    });
    it('gap resets to 1 but keeps best', () => {
        const s = { count: 4, best: 9, lastDay: '2026-03-10' };
        expect(updateStreak(s, '2026-03-12')).toEqual({ count: 1, best: 9, lastDay: '2026-03-12' });
    });
    it('month, year and leap-day boundaries', () => {
        expect(updateStreak({ count: 1, best: 1, lastDay: '2026-01-31' }, '2026-02-01').count).toBe(2);
        expect(updateStreak({ count: 1, best: 1, lastDay: '2025-12-31' }, '2026-01-01').count).toBe(2);
        expect(updateStreak({ count: 1, best: 1, lastDay: '2024-02-29' }, '2024-03-01').count).toBe(2);
        expect(updateStreak({ count: 1, best: 1, lastDay: '2025-02-28' }, '2025-03-01').count).toBe(2);
    });
    it('DST days use calendar days, not 24h math', () => {
        expect(updateStreak({ count: 2, best: 2, lastDay: '2026-03-07' }, '2026-03-08').count).toBe(3);
        expect(updateStreak({ count: 2, best: 2, lastDay: '2026-10-24' }, '2026-10-25').count).toBe(3);
        expect(updateStreak({ count: 2, best: 2, lastDay: '2026-10-25' }, '2026-10-26').count).toBe(3);
    });
    it('clock going backwards never decreases or changes anything', () => {
        const s = { count: 5, best: 5, lastDay: '2026-03-10' };
        expect(updateStreak(s, '2026-03-01')).toBe(s);
    });
});

describe('milestones', () => {
    it('are 3, 7, 14, 30', () => {
        expect(STREAK_MILESTONES).toEqual([3, 7, 14, 30]);
        expect(isMilestone(7)).toBe(true);
        expect(isMilestone(8)).toBe(false);
    });
});
