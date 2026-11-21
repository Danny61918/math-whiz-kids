import type { Skill } from '../data/skills';

/** One-time bonus when a fact first reaches the top box (kinder). */
export const FACT_MASTERY_BONUS = 20;

export function questionCoins(skill: Skill, timeMs: number): number {
    const base = timeMs <= 5000 ? 30 : timeMs <= 10000 ? 20 : 10;
    return Math.round(base * skill.multiplier);
}

export function sessionBonus(total: number, correctCount: number, totalQuestions: number): number {
    return totalQuestions > 0 && correctCount === totalQuestions ? Math.round(total * 1.2) : total;
}
