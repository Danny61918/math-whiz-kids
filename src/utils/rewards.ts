import type { Skill } from '../data/skills';

/** One-time bonus when a fact first reaches the top box (kinder). */
export const FACT_MASTERY_BONUS = 20;

const KINDER_BASE_COINS = 10;
const KINDER_HELPED_COINS = 5;

/**
 * Coins for one first-attempt correct answer.
 * Kinder and the grade 4 times-table track: fixed (no speed pressure), half when the Help button was used.
 * Grade4 main track: speed tiers (unchanged).
 */
export function questionCoins(skill: Skill, timeMs: number, helped = false): number {
    if (skill.mode === 'kinder' || skill.track === 'table') {
        return Math.round((helped ? KINDER_HELPED_COINS : KINDER_BASE_COINS) * skill.multiplier);
    }
    const base = timeMs <= 5000 ? 30 : timeMs <= 10000 ? 20 : 10;
    return Math.round(base * skill.multiplier);
}

export function sessionBonus(total: number, correctCount: number, totalQuestions: number): number {
    return totalQuestions > 0 && correctCount === totalQuestions ? Math.round(total * 1.2) : total;
}
