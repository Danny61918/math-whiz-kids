import { tableSkills, skills, type Skill } from '../data/skills';
import { allTableFacts, TABLE_LADDER_IDS } from '../data/tableFacts';
import type { FactKey } from '../data/facts';
import { isAttempted, isDue, factLevel, type FactStats } from './factProgress';
import { recommendedSkillId } from './mastery';
import { isSkillUnlocked, type Stars } from './stars';

export { TABLE_LADDER_IDS };

/** The ×2/5, ×3/4 and ×6 skills: once starred the child may continue with the big-number track. */
export const TABLE_GATE_SKILL_IDS = ['g_x25', 'g_x34', 'g_x6'] as const;

/** A times-table skill (ladder or review)? */
export const isTableTrackSkill = (skillId: string): boolean => skillId === 'g_review' || tableSkills.some((s) => s.id === skillId);

type Facts = Record<FactKey, FactStats>;

/** Attempted table facts. */
export function attemptedTableFacts(facts: Facts) {
    return allTableFacts.filter((f) => isAttempted(facts[f.key]));
}

/** Number of attempted table facts that are due today (the daily review shows up when >= 1). */
export function dueTableFactCount(facts: Facts, today: string): number {
    return attemptedTableFacts(facts).filter((f) => isDue(facts[f.key], today)).length;
}

/** True when the child has attempted at least one table fact. */
export const hasTableHistory = (facts: Facts): boolean => attemptedTableFacts(facts).length > 0;

/** The table track passes its gate when ×2..×6 skills are starred or every attempted table fact is mastered. */
export function tableGatePassed(stars: Record<string, Stars>, facts: Facts): boolean {
    if (TABLE_GATE_SKILL_IDS.every((id) => (stars[id] ?? 0) >= 1)) return true;
    const attempted = attemptedTableFacts(facts);
    return attempted.length > 0 && attempted.every((f) => factLevel(facts[f.key]) === 'mastered');
}

/**
 * The grade 4 "Continue" node across both tracks (deterministic):
 * 1. gate not passed -> the table ladder's recommended skill (first unlocked skill that is not
 *    mastered+starred);
 * 2. gate passed -> the first unlocked main skill without a star; when every main skill is starred,
 *    the table ladder's recommended skill.
 */
export function recommendedGrade4SkillId(stars: Record<string, Stars>, facts: Facts): string {
    const tableRec = recommendedSkillId(tableSkills, stars, facts) ?? tableSkills[0].id;
    if (!tableGatePassed(stars, facts)) return tableRec;
    const main = skills.filter((s) => s.mode === 'grade4').sort((a, b) => a.order - b.order);
    const next = main.find((s, i) => isSkillUnlocked(main, stars, i) && (stars[s.id] ?? 0) === 0);
    return next?.id ?? tableRec;
}

/** Soft nudge on the multi-digit multiplication/division cards while the mixed table skill has no star. Never locks. */
export function showTablesHint(skillId: string, stars: Record<string, Stars>): boolean {
    return (skillId === 'g_mul_21' || skillId === 'g_div_21') && (stars.g_xmix ?? 0) === 0;
}

export type { Skill };
