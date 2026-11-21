import type { TranslationKey } from '../utils/i18n';

export type UserMode = 'kinder' | 'grade4';

export interface Skill {
    id: string;
    mode: UserMode;
    nameKey: TranslationKey;
    order: number;
    multiplier: number;
}

export const skills: Skill[] = [
    { id: 'k_add_5', mode: 'kinder', nameKey: 'skill_k_add_5', order: 1, multiplier: 1.0 },
    { id: 'k_sub_5', mode: 'kinder', nameKey: 'skill_k_sub_5', order: 2, multiplier: 1.0 },
    { id: 'k_plus12', mode: 'kinder', nameKey: 'skill_k_plus12', order: 3, multiplier: 1.0 },
    { id: 'k_doubles', mode: 'kinder', nameKey: 'skill_k_doubles', order: 4, multiplier: 1.1 },
    { id: 'k_make10', mode: 'kinder', nameKey: 'skill_k_make10', order: 5, multiplier: 1.1 },
    { id: 'k_add_10', mode: 'kinder', nameKey: 'skill_k_add_10', order: 6, multiplier: 1.1 },
    { id: 'k_sub_10', mode: 'kinder', nameKey: 'skill_k_sub_10', order: 7, multiplier: 1.1 },
    { id: 'k_family_10', mode: 'kinder', nameKey: 'skill_k_family_10', order: 8, multiplier: 1.2 },
    { id: 'k_near_doubles', mode: 'kinder', nameKey: 'skill_k_near_doubles', order: 9, multiplier: 1.2 },
    { id: 'k_plus89', mode: 'kinder', nameKey: 'skill_k_plus89', order: 10, multiplier: 1.2 },
    { id: 'k_add_11_18', mode: 'kinder', nameKey: 'skill_k_add_11_18', order: 11, multiplier: 1.3 },
    { id: 'k_sub_11_18', mode: 'kinder', nameKey: 'skill_k_sub_11_18', order: 12, multiplier: 1.3 },
    { id: 'k_mixed', mode: 'kinder', nameKey: 'skill_k_mixed', order: 13, multiplier: 1.3 },
    { id: 'g_add_4', mode: 'grade4', nameKey: 'skill_g_add_4', order: 1, multiplier: 1.2 },
    { id: 'g_sub_4', mode: 'grade4', nameKey: 'skill_g_sub_4', order: 2, multiplier: 1.2 },
    { id: 'g_add_6', mode: 'grade4', nameKey: 'skill_g_add_6', order: 3, multiplier: 1.4 },
    { id: 'g_sub_6', mode: 'grade4', nameKey: 'skill_g_sub_6', order: 4, multiplier: 1.4 },
    { id: 'g_mul_21', mode: 'grade4', nameKey: 'skill_g_mul_21', order: 5, multiplier: 1.3 },
    { id: 'g_mul_32', mode: 'grade4', nameKey: 'skill_g_mul_32', order: 6, multiplier: 1.6 },
    { id: 'g_mul_42', mode: 'grade4', nameKey: 'skill_g_mul_42', order: 7, multiplier: 1.8 },
    { id: 'g_div_21', mode: 'grade4', nameKey: 'skill_g_div_21', order: 8, multiplier: 1.4 },
    { id: 'g_div_32', mode: 'grade4', nameKey: 'skill_g_div_32', order: 9, multiplier: 1.8 },
    { id: 'g_div_41', mode: 'grade4', nameKey: 'skill_g_div_41', order: 10, multiplier: 1.6 },
];

/** Kinder skills outside the unlock chain. They never appear in skillsForMode(). */
export const REVIEW_SKILL_ID = 'k_review';
/** Pseudo-skill id of the 60-second blitz (not a Skill: no stars, no coins). */
export const BLITZ_ID = 'k_blitz';

export const specialSkills: Skill[] = [
    { id: REVIEW_SKILL_ID, mode: 'kinder', nameKey: 'skill_k_review', order: 0, multiplier: 1.2 },
];

export function skillsForMode(mode: UserMode): Skill[] {
    return skills.filter((s) => s.mode === mode).sort((a, b) => a.order - b.order);
}

export function getSkill(id: string): Skill | undefined {
    return skills.find((s) => s.id === id) ?? specialSkills.find((s) => s.id === id);
}
