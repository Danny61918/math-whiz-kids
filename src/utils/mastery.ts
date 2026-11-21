import type { SkillStats } from '../store/useGameStore';

export type Mastery = 'new' | 'learning' | 'mastered';

export const DEFAULT_MASTERY_TIME_MS = 20000;

export function getMastery(stats?: SkillStats, maxAvgTimeMs: number = DEFAULT_MASTERY_TIME_MS): Mastery {
    if (!stats || stats.attempts < 5) return 'new';
    const last10 = stats.recent.slice(-10);
    if (last10.length >= 10 && last10.filter(Boolean).length >= 9 && stats.avgTimeMs <= maxAvgTimeMs) {
        return 'mastered';
    }
    return 'learning';
}
