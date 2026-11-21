import { describe, expect, it } from 'vitest';
import { allFacts, type FactKey } from '../data/facts';
import { evaluateBlitz } from './blitz';
import { CHART_MILESTONES, chartMasteredCount, masteredTotal, milestoneThreshold, newlyMastered, pendingMilestones } from './chart';
import type { FactStats } from './factProgress';

const mastered = (): FactStats => ({ box: 4, attempts: 5, correct: 5, lastSeenDay: '2026-05-01', lastUpDay: null, bestMs: 1000 });

function withMastered(op: '+' | '-', n: number): Record<FactKey, FactStats> {
    const facts: Record<FactKey, FactStats> = {};
    allFacts.filter((f) => f.op === op).slice(0, n).forEach((f) => (facts[f.key] = mastered()));
    return facts;
}

describe('chart milestones', () => {
    it('uses ceil(81 * pct) thresholds', () => {
        expect([25, 50, 75, 100].map(milestoneThreshold)).toEqual([21, 41, 61, 81]);
        expect(CHART_MILESTONES.map((m) => m.tickets)).toEqual([1, 1, 2, 3]);
    });

    it('counts mastered facts per chart', () => {
        const facts = { ...withMastered('+', 10), ...withMastered('-', 3) };
        expect(chartMasteredCount(facts, 'add')).toBe(10);
        expect(chartMasteredCount(facts, 'sub')).toBe(3);
        expect(masteredTotal(facts)).toBe(13);
    });

    it('is pending exactly at each threshold', () => {
        expect(pendingMilestones(withMastered('+', 20), [])).toEqual([]);
        expect(pendingMilestones(withMastered('+', 21), [])).toEqual([{ id: 'add25', chart: 'add', pct: 25, tickets: 1 }]);
        expect(pendingMilestones(withMastered('+', 41), []).map((m) => m.id)).toEqual(['add25', 'add50']);
        expect(pendingMilestones(withMastered('+', 61), []).map((m) => m.tickets)).toEqual([1, 1, 2]);
        expect(pendingMilestones(withMastered('+', 81), []).map((m) => m.id)).toEqual(['add25', 'add50', 'add75', 'add100']);
        expect(pendingMilestones(withMastered('-', 21), []).map((m) => m.id)).toEqual(['sub25']);
    });

    it('skips claimed milestones', () => {
        expect(pendingMilestones(withMastered('+', 41), ['add25']).map((m) => m.id)).toEqual(['add50']);
        expect(pendingMilestones(withMastered('+', 41), ['add25', 'add50'])).toEqual([]);
    });

    it('counts newly mastered facts', () => {
        const before = withMastered('+', 3);
        const after = withMastered('+', 5);
        expect(newlyMastered(before, after)).toBe(2);
        expect(newlyMastered(after, after)).toBe(0);
        expect(newlyMastered({}, {})).toBe(0);
    });
});

describe('evaluateBlitz', () => {
    it('beating the best is a record and grants a ticket', () => {
        expect(evaluateBlitz(8, 5, '2026-05-01', '2026-05-02')).toEqual({ best: 8, bestDay: '2026-05-02', newRecord: true, ticket: true });
    });
    it('no ticket twice on the same day', () => {
        expect(evaluateBlitz(9, 8, '2026-05-02', '2026-05-02')).toEqual({ best: 9, bestDay: '2026-05-02', newRecord: true, ticket: false });
    });
    it('equal or lower scores change nothing', () => {
        expect(evaluateBlitz(5, 5, '2026-05-01', '2026-05-02')).toEqual({ best: 5, bestDay: '2026-05-01', newRecord: false, ticket: false });
        expect(evaluateBlitz(0, 0, null, '2026-05-02').newRecord).toBe(false);
    });
    it('the first positive score is a record', () => {
        expect(evaluateBlitz(1, 0, null, '2026-05-02')).toMatchObject({ newRecord: true, ticket: true, best: 1 });
    });
});
