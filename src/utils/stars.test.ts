import { describe, expect, it } from 'vitest';
import { skillsForMode } from '../data/skills';
import { calcStars, isSkillUnlocked } from './stars';

describe('calcStars', () => {
    it('kinder (5 questions)', () => {
        expect([0, 1, 2, 3, 4, 5].map((c) => calcStars(c, 5))).toEqual([1, 1, 1, 1, 2, 3]);
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
    it('next opens after previous has a star', () => {
        expect(isSkillUnlocked(list, {}, 1)).toBe(false);
        expect(isSkillUnlocked(list, { [list[0].id]: 1 }, 1)).toBe(true);
        expect(isSkillUnlocked(list, { [list[0].id]: 1 }, 2)).toBe(false);
    });
});
