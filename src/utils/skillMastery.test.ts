import { describe, expect, it } from 'vitest';
import { poolFor, type FactKey } from '../data/facts';
import { skillsForMode } from '../data/skills';
import type { FactStats } from './factProgress';
import { getSkillMastery, recommendedSkillId } from './mastery';

const fact = (box: FactStats['box'], attempts = 3): FactStats => ({
    box, attempts, correct: attempts, lastSeenDay: '2026-05-01', lastUpDay: null, bestMs: 1000,
});

function factsFor(skillId: string, count: number, box: FactStats['box']): Record<FactKey, FactStats> {
    return Object.fromEntries(poolFor(skillId).slice(0, count).map((f) => [f.key, fact(box)]));
}

describe('getSkillMastery', () => {
    it('is new with fewer than 3 attempted pool facts', () => {
        expect(getSkillMastery('k_add_5', {})).toBe('new');
        expect(getSkillMastery('k_add_5', factsFor('k_add_5', 2, 5))).toBe('new');
        expect(getSkillMastery('k_add_5', { ...factsFor('k_add_5', 2, 5), '9+9': fact(5) })).toBe('new'); // outside the pool
    });
    it('is learning with 3+ attempted but under 80% at box 4+', () => {
        expect(getSkillMastery('k_add_5', factsFor('k_add_5', 3, 0))).toBe('learning');
        // 10 pool facts: 7 mastered is 70%
        const facts = { ...factsFor('k_add_5', 10, 1), ...factsFor('k_add_5', 7, 4) };
        expect(getSkillMastery('k_add_5', facts)).toBe('learning');
    });
    it('is mastered at 80% of the pool with box >= 4', () => {
        const facts = { ...factsFor('k_add_5', 10, 1), ...factsFor('k_add_5', 8, 4) };
        expect(getSkillMastery('k_add_5', facts)).toBe('mastered');
        expect(getSkillMastery('k_add_5', factsFor('k_add_5', 10, 5))).toBe('mastered');
    });
    it('box 3 does not count and unknown skills are new', () => {
        expect(getSkillMastery('k_add_5', factsFor('k_add_5', 10, 3))).toBe('learning');
        expect(getSkillMastery('nope', {})).toBe('new');
    });
});

describe('recommendedSkillId', () => {
    const list = skillsForMode('kinder');
    it('is the first ladder skill when nothing is mastered', () => {
        expect(recommendedSkillId(list, {}, {})).toBe('k_add_5');
    });
    it('skips mastered skills', () => {
        expect(recommendedSkillId(list, { k_add_5: 3 }, factsFor('k_add_5', 10, 5))).toBe('k_sub_5');
    });
    it('is null when the first unmastered skill is still locked, or everything is mastered', () => {
        expect(recommendedSkillId(list, {}, factsFor('k_add_5', 10, 5))).toBeNull();
        const all = Object.fromEntries(list.flatMap((s) => poolFor(s.id).map((f) => [f.key, fact(5)])));
        expect(recommendedSkillId(list, {}, all)).toBeNull();
    });
});
