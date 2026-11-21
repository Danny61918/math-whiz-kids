import { describe, expect, it } from 'vitest';
import type { Skill } from '../data/skills';
import { FACT_MASTERY_BONUS, questionCoins, sessionBonus } from './rewards';

const skill = (multiplier: number): Skill => ({ id: 'x', mode: 'grade4', nameKey: 'skill_g_add_4', order: 1, multiplier });
const kinder = (multiplier: number): Skill => ({ id: 'k', mode: 'kinder', nameKey: 'skill_k_add_5', order: 1, multiplier });

describe('questionCoins (grade4 speed tiers)', () => {
    it('time tiers', () => {
        expect(questionCoins(skill(1), 0)).toBe(30);
        expect(questionCoins(skill(1), 5000)).toBe(30);
        expect(questionCoins(skill(1), 5001)).toBe(20);
        expect(questionCoins(skill(1), 10000)).toBe(20);
        expect(questionCoins(skill(1), 10001)).toBe(10);
    });
    it('applies multiplier with rounding', () => {
        expect(questionCoins(skill(1.1), 20000)).toBe(11);
        expect(questionCoins(skill(1.4), 7000)).toBe(28);
        expect(questionCoins(skill(1.3), 1000)).toBe(39);
        expect(questionCoins(skill(1.8), 12000)).toBe(18);
        expect(questionCoins(skill(1.25), 12000)).toBe(13);
    });
});

describe('questionCoins (kinder)', () => {
    it('is fixed at 10 x multiplier regardless of speed', () => {
        for (const ms of [0, 3000, 5001, 12000, 60000]) expect(questionCoins(kinder(1), ms)).toBe(10);
        expect(questionCoins(kinder(1.1), 100)).toBe(11);
        expect(questionCoins(kinder(1.3), 99999)).toBe(13);
        expect(questionCoins(kinder(1.2), 1)).toBe(12);
    });
    it('is 5 x multiplier when the Help button was used', () => {
        expect(questionCoins(kinder(1), 100, true)).toBe(5);
        expect(questionCoins(kinder(1.3), 100, true)).toBe(7);
        expect(questionCoins(kinder(1.1), 100, true)).toBe(6);
    });
    it('grade4 ignores the helped flag', () => {
        expect(questionCoins(skill(1), 1000, true)).toBe(30);
    });
    it('exposes the box-5 bonus', () => {
        expect(FACT_MASTERY_BONUS).toBe(20);
    });
});

describe('sessionBonus', () => {
    it('adds 20% when all correct', () => {
        expect(sessionBonus(100, 5, 5)).toBe(120);
        expect(sessionBonus(55, 10, 10)).toBe(66);
    });
    it('no bonus otherwise', () => {
        expect(sessionBonus(100, 4, 5)).toBe(100);
        expect(sessionBonus(0, 0, 5)).toBe(0);
    });
});
