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
    { id: 'k_add_10', mode: 'kinder', nameKey: 'skill_k_add_10', order: 3, multiplier: 1.1 },
    { id: 'k_sub_10', mode: 'kinder', nameKey: 'skill_k_sub_10', order: 4, multiplier: 1.1 },
    { id: 'k_make10', mode: 'kinder', nameKey: 'skill_k_make10', order: 5, multiplier: 1.2 },
    { id: 'k_add_20', mode: 'kinder', nameKey: 'skill_k_add_20', order: 6, multiplier: 1.3 },
    { id: 'k_sub_20', mode: 'kinder', nameKey: 'skill_k_sub_20', order: 7, multiplier: 1.3 },
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

export function skillsForMode(mode: UserMode): Skill[] {
    return skills.filter((s) => s.mode === mode).sort((a, b) => a.order - b.order);
}

export function getSkill(id: string): Skill | undefined {
    return skills.find((s) => s.id === id);
}
