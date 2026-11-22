import type { SkillStats } from '../store/useGameStore';
import { poolFor, type FactKey } from '../data/facts';
import { tablePoolFor } from '../data/tableFacts';
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
const SKILL_MASTERED_BOX = 3;

/** Kinder / times-table skill badge from the facts in its pool: new (< 3 attempted), mastered (>= floor(80%) at box 3+), else learning. */
export function getSkillMastery(skillId: string, facts: Record<FactKey, FactStats>): Mastery {
    const tablePool = tablePoolFor(skillId);
    const pool: { key: string }[] = tablePool.length > 0 ? tablePool : poolFor(skillId);
    if (pool.length === 0) return 'new';
    const attempted = pool.filter((f) => isAttempted(facts[f.key])).length;
    if (attempted < MIN_ATTEMPTED_FACTS) return 'new';
    const solid = pool.filter((f) => isAttempted(facts[f.key]) && (facts[f.key]?.box ?? 0) >= SKILL_MASTERED_BOX).length;
    return solid >= Math.floor(pool.length * MASTERED_SHARE) ? 'mastered' : 'learning';
}

/**
 * The "Start here" node: the first unlocked ladder skill that is not (mastered and starred).
 * When the whole ladder qualifies: the mixed master (or the first unlocked node if even that is locked).
 */
export function recommendedSkillId(list: Skill[], stars: Record<string, Stars>, facts: Record<FactKey, FactStats>): string | null {
    if (list.length === 0) return null;
    for (let i = 0; i < list.length; i++) {
        if (!isSkillUnlocked(list, stars, i)) continue;
        const done = getSkillMastery(list[i].id, facts) === 'mastered' && (stars[list[i].id] ?? 0) >= 1;
        if (!done) return list[i].id;
    }
    const mixed = list.findIndex((s) => s.id === 'k_mixed' || s.id === 'g_dmix');
    if (mixed >= 0 && isSkillUnlocked(list, stars, mixed)) return list[mixed].id;
    return list[0].id;
}
