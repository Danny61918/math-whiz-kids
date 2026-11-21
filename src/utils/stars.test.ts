import { describe, expect, it } from 'vitest';
import { skillsForMode } from '../data/skills';
import { calcStars, isSkillUnlocked } from './stars';

describe('calcStars', () => {
    it('kinder (8 questions): 3 = all, 2 = at least 7 of 8', () => {
        expect([0, 4, 5, 6, 7, 8].map((c) => calcStars(c, 8))).toEqual([1, 1, 1, 1, 2, 3]);
    });
    it('grade4 (10 questions)', () => {
        expect([0, 5, 7, 8, 9, 10].map((c) => calcStars(c, 10))).toEqual([1, 1, 1, 2, 2, 3]);
    });
    it('handles zero total', () => {
        expect(calcStars(0, 0)).toBe(1);
    });
});

describe('isSkillUnlocked', () => {
    const list = skillsForMode('kinder');
    it('first node is always open', () => {
        expect(isSkillUnlocked(list, {}, 0)).toBe(true);
    });
    it('a node that already has a star stays open (migrated progress)', () => {
        const stars = { k_make10: 2 as const };
        expect(isSkillUnlocked(list, stars, list.findIndex((s) => s.id === 'k_make10'))).toBe(true);
        expect(isSkillUnlocked(list, stars, list.findIndex((s) => s.id === 'k_doubles'))).toBe(false);
    });
    it('next opens after previous has a star', () => {
        expect(isSkillUnlocked(list, {}, 1)).toBe(false);
        expect(isSkillUnlocked(list, { [list[0].id]: 1 }, 1)).toBe(true);
        expect(isSkillUnlocked(list, { [list[0].id]: 1 }, 2)).toBe(false);
    });
});
