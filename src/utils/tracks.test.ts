import { describe, expect, it } from 'vitest';
import { skills, skillsForMode, skillsForTrack, tableSkills, getSkill } from '../data/skills';
import { allTableFacts, tablePoolFor } from '../data/tableFacts';
import type { FactStats } from './factProgress';
import { getSkillMastery, recommendedSkillId } from './mastery';
import { questionCoins } from './rewards';
import { aidModeFor } from './session';
import { dueTableFactCount, isTableTrackSkill, recommendedGrade4SkillId, showTablesHint, tableGatePassed } from './tracks';
import { isSkillUnlocked, type Stars } from './stars';

const TODAY = '2026-05-10';
const fact = (box: FactStats['box'], over: Partial<FactStats> = {}): FactStats => ({
    box, attempts: 4, correct: 4, lastSeenDay: '2026-05-01', lastUpDay: null, bestMs: 1500, ...over,
});
const factsFor = (id: string, box: FactStats['box'], count = 100) =>
    Object.fromEntries(tablePoolFor(id).slice(0, count).map((f) => [f.key, fact(box)]));

describe('table track definition', () => {
    it('has 11 ordered table skills plus a review skill; the main track is unchanged', () => {
        expect(tableSkills.map((s) => s.id)).toEqual(['g_x25', 'g_x34', 'g_x6', 'g_x7', 'g_x8', 'g_x9', 'g_xmix', 'g_d25', 'g_d34', 'g_d69', 'g_dmix']);
        expect(tableSkills.every((s) => s.track === 'table' && s.mode === 'grade4')).toBe(true);
        expect(tableSkills.map((s) => s.multiplier)).toEqual([1.0, 1.1, 1.2, 1.3, 1.3, 1.4, 1.5, 1.2, 1.3, 1.5, 1.6]);
        expect(getSkill('g_review')).toMatchObject({ track: 'table', multiplier: 1.2 });
        expect(skillsForMode('grade4')).toHaveLength(10);
        expect(skillsForMode('grade4').every((s) => s.track === undefined)).toBe(true);
        expect(skills.some((s) => s.id.startsWith('g_x'))).toBe(false);
        expect(skillsForTrack('grade4', 'table')).toEqual(tableSkills);
        expect(skillsForTrack('kinder', 'table')).toEqual([]);
        expect(isTableTrackSkill('g_review') && isTableTrackSkill('g_x7') && !isTableTrackSkill('g_mul_21')).toBe(true);
    });

    it('unlocks per track: the table ladder is sequential and independent of the main track', () => {
        expect(isSkillUnlocked(tableSkills, {}, 0)).toBe(true);
        expect(isSkillUnlocked(tableSkills, {}, 1)).toBe(false);
        expect(isSkillUnlocked(tableSkills, { g_x25: 1 }, 1)).toBe(true);
        expect(isSkillUnlocked(tableSkills, { g_x25: 1 }, 2)).toBe(false);
        const main = skillsForMode('grade4');
        expect(isSkillUnlocked(main, { g_x25: 3, g_x34: 3 }, 1)).toBe(false); // table stars do not unlock main skills
        expect(isSkillUnlocked(main, { g_add_4: 1 }, 1)).toBe(true);
    });
});

describe('table mastery, rewards and aid', () => {
    it('getSkillMastery works for table skills through their pools', () => {
        expect(getSkillMastery('g_x6', {})).toBe('new');
        expect(getSkillMastery('g_x6', factsFor('g_x6', 3))).toBe('mastered');
        expect(getSkillMastery('g_x6', factsFor('g_x6', 1))).toBe('learning');
        expect(getSkillMastery('g_x6', factsFor('g_x6', 3, 2))).toBe('new');
    });

    it('pays the kinder fluency coins for table skills and the speed tiers for main skills', () => {
        const mix = getSkill('g_xmix');
        const main = getSkill('g_mul_21');
        if (!mix || !main) throw new Error('missing skill');
        expect(questionCoins(mix, 9000)).toBe(15);
        expect(questionCoins(mix, 100, true)).toBe(8);
        expect(questionCoins(main, 4000)).toBe(39);
    });

    it('fades the aid by box; the daily review has none', () => {
        expect(aidModeFor('g_x7', undefined)).toBe('visible');
        expect(aidModeFor('g_x7', fact(1))).toBe('visible');
        expect(aidModeFor('g_x7', fact(2))).toBe('help');
        expect(aidModeFor('g_x7', fact(3))).toBe('help');
        expect(aidModeFor('g_x7', fact(4))).toBe('none');
        expect(aidModeFor('g_review', fact(0))).toBe('none');
    });
});

describe('recommendedSkillId over the table ladder', () => {
    it('recommends g_x25 when fresh, then walks the ladder', () => {
        expect(recommendedSkillId(tableSkills, {}, {})).toBe('g_x25');
        expect(recommendedSkillId(tableSkills, { g_x25: 2 }, factsFor('g_x25', 4))).toBe('g_x34');
        expect(recommendedSkillId(tableSkills, { g_x25: 2 }, {})).toBe('g_x25'); // starred but not yet mastered
    });
    it('ends on g_dmix when everything is mastered', () => {
        const stars = Object.fromEntries(tableSkills.map((s) => [s.id, 3])) as Record<string, Stars>;
        const facts = Object.fromEntries(allTableFacts.map((f) => [f.key, fact(5)]));
        expect(recommendedSkillId(tableSkills, stars, facts)).toBe('g_dmix');
    });
});

describe('recommendedGrade4SkillId (across tracks)', () => {
    it('fresh user: the table track first', () => {
        expect(recommendedGrade4SkillId({}, {})).toBe('g_x25');
    });
    it('partial: stays on the table ladder until g_x25, g_x34 and g_x6 are starred', () => {
        expect(recommendedGrade4SkillId({ g_x25: 1, g_x34: 1 }, {})).toBe('g_x25');
        expect(recommendedGrade4SkillId({ g_x25: 3, g_x34: 3 }, { ...factsFor('g_x25', 5), ...factsFor('g_x34', 5), '7x8': fact(1) })).toBe('g_x6');
    });
    it('gate passed by stars: continues with the first unlocked unstarred main skill', () => {
        const stars = { g_x25: 1, g_x34: 1, g_x6: 1 } as Record<string, Stars>;
        expect(tableGatePassed(stars, {})).toBe(true);
        expect(recommendedGrade4SkillId(stars, {})).toBe('g_add_4');
        expect(recommendedGrade4SkillId({ ...stars, g_add_4: 2 }, {})).toBe('g_sub_4');
    });
    it('gate passed because every attempted table fact is mastered (and at least one attempted)', () => {
        expect(tableGatePassed({}, {})).toBe(false);
        const facts = factsFor('g_x25', 4, 5);
        expect(tableGatePassed({}, facts)).toBe(true);
        expect(recommendedGrade4SkillId({}, facts)).toBe('g_add_4');
        expect(tableGatePassed({}, { ...facts, '7x8': fact(1) })).toBe(false);
    });
    it('everything on the main track starred: back to the table ladder recommendation', () => {
        const stars: Record<string, Stars> = { g_x25: 1, g_x34: 1, g_x6: 1 };
        for (const s of skillsForMode('grade4')) stars[s.id] = 1;
        expect(recommendedGrade4SkillId(stars, {})).toBe('g_x25');
    });
    it('is deterministic', () => {
        const stars = { g_x25: 1 } as Record<string, Stars>;
        expect(recommendedGrade4SkillId(stars, {})).toBe(recommendedGrade4SkillId(stars, {}));
    });
});

describe('g_review due logic and soft nudge', () => {
    it('counts attempted table facts that are due', () => {
        expect(dueTableFactCount({}, TODAY)).toBe(0);
        const facts = { '3x4': fact(2, { lastSeenDay: '2026-05-01' }), '4x3': fact(2, { lastSeenDay: '2026-05-10' }), '12/3': fact(0, { lastSeenDay: TODAY }) };
        // box 2 seen 9 days ago: due; box 2 seen today: not due; box 0: always due
        expect(dueTableFactCount(facts, TODAY)).toBe(2);
        expect(dueTableFactCount({ '3+4': fact(0) }, TODAY)).toBe(0);
    });
    it('shows the tables hint on the 21 cards only while g_xmix has no star', () => {
        expect(showTablesHint('g_mul_21', {})).toBe(true);
        expect(showTablesHint('g_div_21', { g_xmix: 0 })).toBe(true);
        expect(showTablesHint('g_div_21', { g_xmix: 1 })).toBe(false);
        expect(showTablesHint('g_mul_32', {})).toBe(false);
    });
});
