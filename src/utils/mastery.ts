import type { SkillStats } from '../store/useGameStore';
import { poolFor, type FactKey } from '../data/facts';
import type { Skill } from '../data/skills';
import { isAttempted, type FactStats } from './factProgress';
import type { Stars } from './stars';
import { isSkillUnlocked } from './stars';

export type Mastery = 'new' | 'learning' | 'mastered';

const DEFAULT_MASTERY_TIME_MS = 20000;

export function getMastery(stats?: SkillStats, maxAvgTimeMs: number = DEFAULT_MASTERY_TIME_MS): Mastery {
    if (!stats || stats.attempts < 5) return 'new';
    const last10 = stats.recent.slice(-10);
    if (last10.length >= 10 && last10.filter(Boolean).length >= 9 && stats.avgTimeMs <= maxAvgTimeMs) {
        return 'mastered';
    }
    return 'learning';
}

const MIN_ATTEMPTED_FACTS = 3;
const MASTERED_SHARE = 0.8;

/** Kinder skill badge from the facts in its pool: new (< 3 attempted), mastered (>= 80% at box 4+), else learning. */
export function getSkillMastery(skillId: string, facts: Record<FactKey, FactStats>): Mastery {
    const pool = poolFor(skillId);
    if (pool.length === 0) return 'new';
    const attempted = pool.filter((f) => isAttempted(facts[f.key])).length;
    if (attempted < MIN_ATTEMPTED_FACTS) return 'new';
    const mastered = pool.filter((f) => (facts[f.key]?.box ?? 0) >= 4 && isAttempted(facts[f.key])).length;
    return mastered / pool.length >= MASTERED_SHARE ? 'mastered' : 'learning';
}

/** First unlocked ladder skill that is not mastered yet (the "Start here" node), or null. */
export function recommendedSkillId(list: Skill[], stars: Record<string, Stars>, facts: Record<FactKey, FactStats>): string | null {
    for (let i = 0; i < list.length; i++) {
        if (getSkillMastery(list[i].id, facts) === 'mastered') continue;
        return isSkillUnlocked(list, stars, i) ? list[i].id : null;
    }
    return null;
}
