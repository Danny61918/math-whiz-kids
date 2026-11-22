import { describe, expect, it } from 'vitest';
import { allTableFacts, tablePoolFor, TABLE_LADDER_IDS } from '../data/tableFacts';
import { mulberry32 } from '../test-rng';
import type { FactStats } from './factProgress';
import { checkAnswer } from './mathEngine';
import { buildFactSession, buildTableBlitzQuestions, questionFromTableFact } from './selection';

const TODAY = '2026-05-10';
const stat = (box: FactStats['box'], over: Partial<FactStats> = {}): FactStats => ({
    box, attempts: 3, correct: 2, lastSeenDay: '2026-05-01', lastUpDay: null, bestMs: 2000, ...over,
});

describe('table questions', () => {
    it('has the right answer for all 162 facts and every form', () => {
        for (const f of allTableFacts) {
            const forms = f.op === '×' ? (['direct', 'missingMul'] as const) : (['direct', 'missingMul', 'missingDiv'] as const);
            for (const form of forms) {
                const q = questionFromTableFact('g_xmix', f, form);
                expect(q.factKey).toBe(f.key);
                expect(checkAnswer(q, { answer: q.answer })).toBe(true);
                expect(checkAnswer(q, { answer: q.answer + 1 })).toBe(false);
                if (q.right === null && q.operator === '×') {
                    expect((q.left ?? 0) * q.answer).toBe(q.result);
                } else if (q.right === null && q.operator === '÷') {
                    expect((q.left ?? 0) / q.answer).toBe(q.result);
                } else if (q.operator === '×') {
                    expect((q.left ?? 0) * (q.right ?? 0)).toBe(q.answer);
                } else {
                    expect((q.left ?? 0) / (q.right ?? 0)).toBe(q.answer);
                    expect(q.remainder).toBeUndefined();
                }
                expect(q.answer).toBeGreaterThanOrEqual(1);
                expect(q.answer).toBeLessThanOrEqual(81);
            }
        }
    });

    it('shapes: a x b = ?, p / d = ?, a x ? = p, p / ? = q', () => {
        const mul = allTableFacts.find((f) => f.key === '3x4');
        const div = allTableFacts.find((f) => f.key === '12/3');
        if (!mul || !div) throw new Error('missing fact');
        expect(questionFromTableFact('s', mul, 'direct')).toMatchObject({ operator: '×', left: 3, right: 4, result: null, answer: 12 });
        expect(questionFromTableFact('s', mul, 'missingMul')).toMatchObject({ operator: '×', left: 3, right: null, result: 12, answer: 4 });
        expect(questionFromTableFact('s', div, 'direct')).toMatchObject({ operator: '÷', left: 12, right: 3, result: null, answer: 4 });
        expect(questionFromTableFact('s', div, 'missingMul')).toMatchObject({ operator: '×', left: 3, right: null, result: 12, answer: 4 });
        expect(questionFromTableFact('s', div, 'missingDiv')).toMatchObject({ operator: '÷', left: 12, right: null, result: 4, answer: 3 });
    });
});

describe('buildFactSession', () => {
    it('builds sessions of the right size from the right pool, never the same fact twice in a row', () => {
        for (const id of [...TABLE_LADDER_IDS, 'g_review']) {
            for (const seed of [1, 2, 3]) {
                const qs = buildFactSession(id, {}, TODAY, 10, mulberry32(seed));
                const pool = new Set(tablePoolFor(id === 'g_review' ? 'g_x25' : id).map((f) => f.key));
                expect(qs).toHaveLength(10);
                for (const q of qs) {
                    expect(pool.has(q.factKey ?? '')).toBe(true);
                    expect(q.skillId).toBe(id);
                    expect(checkAnswer(q, { answer: q.answer })).toBe(true);
                }
                for (let i = 1; i < qs.length; i++) expect(qs[i].factKey).not.toBe(qs[i - 1].factKey);
            }
        }
    });

    it('is deterministic with a seeded rng', () => {
        const a = buildFactSession('g_xmix', {}, TODAY, 10, mulberry32(7));
        const b = buildFactSession('g_xmix', {}, TODAY, 10, mulberry32(7));
        expect(a).toEqual(b);
    });

    it('splits 6 priority / 3 new / 1 review when every bucket is full', () => {
        const pool = tablePoolFor('g_xmix');
        const facts: Record<string, FactStats> = {};
        pool.slice(0, 20).forEach((f) => (facts[f.key] = stat(0, { lastWrong: true })));
        pool.slice(20, 40).forEach((f) => (facts[f.key] = stat(3)));
        const qs = buildFactSession('g_xmix', facts, TODAY, 10, mulberry32(4));
        const key = (q: { factKey?: string }) => q.factKey ?? '';
        expect(qs.filter((q) => facts[key(q)]?.box === 0)).toHaveLength(6);
        expect(qs.filter((q) => facts[key(q)] === undefined)).toHaveLength(3);
        expect(qs.filter((q) => facts[key(q)]?.box === 3)).toHaveLength(1);
    });

    it('repeats facts (not back to back) when the pool is smaller than the session', () => {
        const qs = buildFactSession('g_review', { '2x3': stat(0), '3x2': stat(0), '5x5': stat(0) }, TODAY, 10, mulberry32(3));
        expect(qs).toHaveLength(10);
        expect(new Set(qs.map((q) => q.factKey)).size).toBe(3);
        for (let i = 1; i < qs.length; i++) expect(qs[i].factKey).not.toBe(qs[i - 1].factKey);
    });

    it('g_xmix uses only x facts with about 25% missing-factor questions', () => {
        let missing = 0;
        let total = 0;
        for (let seed = 1; seed <= 60; seed++) {
            for (const q of buildFactSession('g_xmix', {}, TODAY, 10, mulberry32(seed))) {
                total++;
                expect(q.factKey).toMatch(/x/);
                if (q.right === null) missing++;
            }
        }
        expect(missing / total).toBeGreaterThan(0.15);
        expect(missing / total).toBeLessThan(0.35);
    });

    it('g_review mixes x and / facts, at most 2 of an op in a row, and uses missing forms', () => {
        const facts: Record<string, FactStats> = {};
        for (const f of allTableFacts.filter((x) => x.op === '×').slice(0, 5)) facts[f.key] = stat(2);
        for (const f of allTableFacts.filter((x) => x.op === '÷').slice(0, 5)) facts[f.key] = stat(2);
        let missing = 0;
        let total = 0;
        for (let seed = 1; seed <= 40; seed++) {
            const qs = buildFactSession('g_review', facts, TODAY, 10, mulberry32(seed));
            const isDiv = qs.map((q) => (q.factKey ?? '').includes('/'));
            expect(isDiv.some(Boolean) && isDiv.some((d) => !d)).toBe(true);
            for (let i = 2; i < isDiv.length; i++) expect(isDiv[i] === isDiv[i - 1] && isDiv[i] === isDiv[i - 2]).toBe(false);
            for (const q of qs) {
                total++;
                if (q.right === null) missing++;
                expect(facts[q.factKey ?? '']).toBeDefined();
            }
        }
        expect(missing / total).toBeGreaterThan(0.12);
    });

    it('division skills show their missing form as d x ? = p', () => {
        for (const id of ['g_d25', 'g_d34', 'g_d69']) {
            for (let seed = 1; seed <= 30; seed++) {
                for (const q of buildFactSession(id, {}, TODAY, 10, mulberry32(seed))) {
                    expect(q.operator).toBe(q.right === null ? '×' : '÷');
                }
            }
        }
    });

    it('g_review with no history falls back to the g_x25 facts', () => {
        const qs = buildFactSession('g_review', {}, TODAY, 10, mulberry32(1));
        const pool = new Set(tablePoolFor('g_x25').map((f) => f.key));
        for (const q of qs) expect(pool.has(q.factKey ?? '')).toBe(true);
    });

    it('throws for an unknown skill', () => {
        expect(() => buildFactSession('nope', {}, TODAY, 10, mulberry32(1))).toThrow();
    });
});

describe('buildTableBlitzQuestions', () => {
    it('uses g_x25 facts with little history and attempted facts with >= 10', () => {
        const few = buildTableBlitzQuestions({}, mulberry32(1), 60);
        const x25 = new Set(tablePoolFor('g_x25').map((f) => f.key));
        for (const q of few) expect(x25.has(q.factKey ?? '')).toBe(true);
        const facts: Record<string, FactStats> = {};
        for (const f of allTableFacts.filter((x) => x.op === '÷').slice(0, 12)) facts[f.key] = stat(1);
        for (const q of buildTableBlitzQuestions(facts, mulberry32(2), 60)) expect(facts[q.factKey ?? '']).toBeDefined();
    });
});
