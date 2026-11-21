import type { Skill } from '../data/skills';

export type Stars = 0 | 1 | 2 | 3;

/** 3 = all correct on first try, 2 = at least 80%, 1 = finished. */
export function calcStars(correctFirstTry: number, total: number): 1 | 2 | 3 {
    if (total > 0 && correctFirstTry >= total) return 3;
    if (total > 0 && correctFirstTry / total >= 0.8) return 2;
    return 1;
}

/** First node is always open; each next node opens once the previous one has at least 1 star. */
export function isSkillUnlocked(orderedSkills: Skill[], stars: Record<string, Stars>, index: number): boolean {
    if (index <= 0) return true;
    return (stars[orderedSkills[index - 1].id] ?? 0) >= 1;
}
