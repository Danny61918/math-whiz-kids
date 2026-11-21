import { describe, expect, it } from 'vitest';
import type { Skill } from '../data/skills';
import { questionCoins, sessionBonus } from './rewards';

const skill = (multiplier: number): Skill => ({ id: 'x', mode: 'kinder', nameKey: 'skill_k_add_5', order: 1, multiplier });

describe('questionCoins', () => {
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
