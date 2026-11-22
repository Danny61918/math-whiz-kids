import { tableSkills, skills, type Skill } from '../data/skills';
import { allTableFacts } from '../data/tableFacts';
import type { FactKey } from '../data/facts';
import { isAttempted, isDue, type FactStats } from './factProgress';
import { getSkillMastery, recommendedSkillId } from './mastery';
import { isSkillUnlocked, type Stars } from './stars';

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

/** Daily review needs this many attempted table facts (mirrors the kinder review) ... */
export const REVIEW_MIN_ATTEMPTED = 10;
/** ... and the Continue button prefers it once this many are due. */
export const REVIEW_CONTINUE_DUE = 5;

/** The daily review is offered: at least 10 attempted table facts and at least one due. */
export function tableReviewAvailable(facts: Facts, today: string): boolean {
    return attemptedTableFacts(facts).length >= REVIEW_MIN_ATTEMPTED && dueTableFactCount(facts, today) >= 1;
}

/** Table skills that must be mastered AND starred before Continue moves on to the big-number track. */
export const TABLE_GATE_SKILL_IDS = ['g_x25', 'g_x34', 'g_x6', 'g_x7'] as const;

/** True when every gate skill is mastered (>= 80% of its pool at box 3+) and starred (a star = a finished session). */
export function tableGatePassed(stars: Record<string, Stars>, facts: Facts): boolean {
    return TABLE_GATE_SKILL_IDS.every((id) => getSkillMastery(id, facts) === 'mastered' && (stars[id] ?? 0) >= 1);
}

/**
 * The grade 4 "Continue" node across both tracks (deterministic, first match wins):
 * 1. >= 5 table facts due and >= 10 attempted -> `g_review`;
 * 2. any of g_x25, g_x34, g_x6, g_x7 not (mastered and starred) -> the table ladder's recommendation;
 * 3. the first unlocked main skill without a star;
 * 4. every main skill starred -> the table ladder's recommendation.
 */
export function recommendedGrade4SkillId(stars: Record<string, Stars>, facts: Facts, today: string): string {
    if (attemptedTableFacts(facts).length >= REVIEW_MIN_ATTEMPTED && dueTableFactCount(facts, today) >= REVIEW_CONTINUE_DUE) return 'g_review';
    const tableRec = recommendedSkillId(tableSkills, stars, facts) ?? tableSkills[0].id;
    if (!tableGatePassed(stars, facts)) return tableRec;
    const main = skills.filter((s) => s.mode === 'grade4').sort((x, y) => x.order - y.order);
    const next = main.find((s, i) => isSkillUnlocked(main, stars, i) && (stars[s.id] ?? 0) === 0);
    return next?.id ?? tableRec;
}

/** Soft nudge on the multi-digit multiplication/division cards while the mixed table skill has no star. Never locks. */
export function showTablesHint(skillId: string, stars: Record<string, Stars>): boolean {
    return (skillId === 'g_mul_21' || skillId === 'g_div_21') && (stars.g_xmix ?? 0) === 0;
}

export type { Skill };
