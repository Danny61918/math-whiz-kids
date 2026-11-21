import { describe, expect, it } from 'vitest';
import { LADDER_POOL_IDS, allFacts, poolFor, type FactKey } from '../data/facts';
import { skillsForMode, specialSkills } from '../data/skills';
import { checkAnswer, type Rng } from './mathEngine';
import type { FactStats } from './factProgress';
import { bucketOf, buildBlitzQuestions, buildKinderSession } from './selection';

function mulberry32(seed: number): Rng {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const TODAY = '2026-05-10';
const stat = (box: FactStats['box'], over: Partial<FactStats> = {}): FactStats => ({
    box, attempts: 3, correct: 2, lastSeenDay: '2026-05-01', lastUpDay: null, bestMs: 2000, ...over,
});

describe('skills ladder', () => {
    it('has 13 unique kinder ladder skills with pools, ascending multipliers 1.0-1.3', () => {
        const list = skillsForMode('kinder');
        expect(list.map((s) => s.id)).toEqual([...LADDER_POOL_IDS]);
        expect(new Set(list.map((s) => s.id)).size).toBe(13);
        const mult = list.map((s) => s.multiplier);
        expect(mult).toEqual([...mult].sort((a, b) => a - b));
        expect(mult[0]).toBe(1);
        expect(mult[12]).toBe(1.3);
        for (const s of list) expect(poolFor(s.id).length).toBeGreaterThan(0);
        expect(list.some((s) => s.id === 'k_add_20' || s.id === 'k_sub_20' || s.id === 'k_review')).toBe(false);
        expect(specialSkills.map((s) => s.id)).toEqual(['k_review']);
    });
});

describe('buildKinderSession', () => {
    it('builds 8 distinct questions from the pool with correct arithmetic', () => {
        for (const id of LADDER_POOL_IDS) {
            for (const seed of [1, 2, 3, 4]) {
                const qs = buildKinderSession(id, {}, TODAY, 8, mulberry32(seed));
                const poolKeys = new Set(poolFor(id).map((f) => f.key));
                expect(qs).toHaveLength(8);
                if (poolKeys.size >= 8) expect(new Set(qs.map((q) => q.factKey)).size).toBe(8);
                for (const q of qs) {
                    expect(poolKeys.has(q.factKey ?? '')).toBe(true);
                    expect(q.skillId).toBe(id);
                    expect(checkAnswer(q, { answer: q.answer })).toBe(true);
                    expect(q.answer).toBeGreaterThanOrEqual(1);
                    if (q.kind === 'sum') expect(q.left).toBe(q.answer - (q.right ?? 0));
                    if (q.kind === 'diff') expect((q.left ?? 0) - (q.right ?? 0)).toBe(q.answer);
                    if (q.kind === 'missing') {
                        expect(q.right).toBeNull();
                        expect((q.left ?? 0) + q.answer).toBe(q.result);
                    }
                }
            }
        }
    });

    it('is deterministic for a seed', () => {
        expect(buildKinderSession('k_mixed', {}, TODAY, 8, mulberry32(5))).toEqual(buildKinderSession('k_mixed', {}, TODAY, 8, mulberry32(5)));
    });

    it('emits missing-addend only where allowed, and make10 emits them about half the time', () => {
        const kinds = (id: string) => Array.from({ length: 60 }, (_, i) => buildKinderSession(id, {}, TODAY, 8, mulberry32(i))).flat();
        for (const id of ['k_add_5', 'k_doubles', 'k_add_10', 'k_plus89', 'k_add_11_18']) {
            expect(kinds(id).every((q) => q.kind === 'sum'), id).toBe(true);
        }
        for (const id of ['k_sub_5', 'k_sub_10', 'k_sub_11_18']) {
            expect(kinds(id).every((q) => q.kind === 'diff'), id).toBe(true);
        }
        const make10 = kinds('k_make10');
        const share = make10.filter((q) => q.kind === 'missing').length / make10.length;
        expect(share).toBeGreaterThan(0.4);
        expect(share).toBeLessThan(0.6);
        for (const q of make10.filter((x) => x.kind === 'missing')) expect(q.result).toBe(10);
        const kindsSeen = new Set(kinds('k_family_10').map((q) => q.kind));
        expect(kindsSeen).toEqual(new Set(['sum', 'diff', 'missing']));
    });

    it('draws roughly 60% priority / 30% new / 10% review', () => {
        // pool k_add_10 (45 facts): 12 weak, 12 solid-and-due, rest unseen.
        const pool = poolFor('k_add_10');
        const facts: Record<FactKey, FactStats> = {};
        pool.slice(0, 12).forEach((f) => (facts[f.key] = stat(1, { lastSeenDay: '2026-05-01' })));
        pool.slice(12, 24).forEach((f) => (facts[f.key] = stat(3, { lastSeenDay: '2026-05-01' })));
        const counts = { priority: 0, new: 0, review: 0, rest: 0 };
        const total = 400;
        for (let i = 0; i < total; i++) {
            for (const q of buildKinderSession('k_add_10', facts, TODAY, 10, mulberry32(i + 1))) {
                const fact = pool.find((f) => f.key === q.factKey);
                counts[bucketOf(fact && facts[fact.key], TODAY)]++;
            }
        }
        const n = total * 10;
        expect(counts.priority / n).toBeGreaterThan(0.55);
        expect(counts.priority / n).toBeLessThan(0.65);
        expect(counts.new / n).toBeGreaterThan(0.25);
        expect(counts.new / n).toBeLessThan(0.35);
        expect(counts.review / n).toBeGreaterThan(0.06);
        expect(counts.review / n).toBeLessThan(0.14);
        expect(counts.rest).toBe(0);
    });

    it('chooses weak facts more often than solid ones', () => {
        const pool = poolFor('k_add_10');
        const facts: Record<FactKey, FactStats> = {};
        for (const f of pool) facts[f.key] = f.a % 2 === 0 ? stat(0) : stat(5, { lastSeenDay: TODAY });
        const tally = { weak: 0, solid: 0 };
        for (let i = 0; i < 200; i++) {
            for (const q of buildKinderSession('k_add_10', facts, TODAY, 8, mulberry32(i))) {
                const f = pool.find((x) => x.key === q.factKey);
                if (f) tally[f.a % 2 === 0 ? 'weak' : 'solid']++;
            }
        }
        expect(tally.weak).toBeGreaterThan(tally.solid * 3);
    });

    it('treats a recently wrong fact as priority even when its box is high', () => {
        expect(bucketOf(stat(3, { lastSeenDay: TODAY, lastWrong: true }), TODAY)).toBe('priority');
        expect(bucketOf(stat(3, { lastSeenDay: TODAY }), TODAY)).toBe('rest');
        expect(bucketOf(stat(3), TODAY)).toBe('review');
        expect(bucketOf(stat(0), TODAY)).toBe('priority');
        expect(bucketOf(undefined, TODAY)).toBe('new');
    });

    it('redistributes when buckets are empty: no new facts left -> priority and review fill the session', () => {
        const pool = poolFor('k_add_5'); // 10 facts
        const facts: Record<FactKey, FactStats> = {};
        pool.forEach((f, i) => (facts[f.key] = i < 3 ? stat(0) : stat(3)));
        const qs = buildKinderSession('k_add_5', facts, TODAY, 8, mulberry32(3));
        expect(new Set(qs.map((q) => q.factKey)).size).toBe(8);
        const keys = qs.map((q) => q.factKey);
        for (const f of pool.slice(0, 3)) expect(keys).toContain(f.key); // all weak ones are in
    });

    it('everything solid and not due: still fills the session, lowest box first', () => {
        const pool = poolFor('k_add_5');
        const facts: Record<FactKey, FactStats> = {};
        pool.forEach((f, i) => (facts[f.key] = stat(i < 2 ? 2 : 5, { lastSeenDay: TODAY })));
        const qs = buildKinderSession('k_add_5', facts, TODAY, 8, mulberry32(8));
        expect(qs).toHaveLength(8);
        const keys = qs.map((q) => q.factKey);
        expect(keys).toContain(pool[0].key);
        expect(keys).toContain(pool[1].key);
        expect(new Set(keys).size).toBe(8);
    });

    it('repeats facts only when the pool is smaller than the session, never twice in a row', () => {
        for (let seed = 0; seed < 30; seed++) {
            const qs = buildKinderSession('k_make10', {}, TODAY, 20, mulberry32(seed));
            expect(qs).toHaveLength(20);
            for (let i = 1; i < qs.length; i++) expect(qs[i].factKey).not.toBe(qs[i - 1].factKey);
        }
    });

    it('k_review only uses attempted facts', () => {
        const facts: Record<FactKey, FactStats> = {};
        const attempted = allFacts.slice(0, 40).filter((_, i) => i % 3 !== 0);
        attempted.forEach((f) => (facts[f.key] = stat(2)));
        const allowed = new Set(attempted.map((f) => f.key));
        for (let seed = 0; seed < 30; seed++) {
            for (const q of buildKinderSession('k_review', facts, TODAY, 8, mulberry32(seed))) {
                expect(allowed.has(q.factKey ?? '')).toBe(true);
            }
        }
    });

    it('interleaves addition and subtraction: no run of 3+ when the mix allows it', () => {
        const longest = (ops: string[]) => {
            let best = 0;
            let run = 0;
            ops.forEach((op, i) => {
                run = i > 0 && op === ops[i - 1] ? run + 1 : 1;
                best = Math.max(best, run);
            });
            return best;
        };
        let checked = 0;
        for (let seed = 0; seed < 200; seed++) {
            const qs = buildKinderSession('k_mixed', {}, TODAY, 8, mulberry32(seed));
            const ops = qs.map((q) => q.operator);
            const plus = ops.filter((o) => o === '+').length;
            const minus = ops.length - plus;
            if (Math.max(plus, minus) <= 2 * (Math.min(plus, minus) + 1)) {
                checked++;
                expect(longest(ops), `seed ${seed}`).toBeLessThanOrEqual(2);
            }
        }
        expect(checked).toBeGreaterThan(150);
    });

    it('throws on an unknown skill', () => {
        expect(() => buildKinderSession('nope', {}, TODAY, 8, Math.random)).toThrow();
    });
});

describe('buildBlitzQuestions', () => {
    it('uses the k_add_10 pool while few facts were attempted', () => {
        const pool = new Set(poolFor('k_add_10').map((f) => f.key));
        const qs = buildBlitzQuestions({}, mulberry32(1), 100);
        expect(qs).toHaveLength(100);
        expect(qs.every((q) => pool.has(q.factKey ?? '') && q.kind === 'sum')).toBe(true);
        for (let i = 1; i < qs.length; i++) expect(qs[i].factKey).not.toBe(qs[i - 1].factKey);
    });
    it('uses only attempted facts once there are 10 of them', () => {
        const facts: Record<FactKey, FactStats> = {};
        const attempted = allFacts.filter((_, i) => i % 9 === 0);
        attempted.forEach((f) => (facts[f.key] = stat(2)));
        const allowed = new Set(attempted.map((f) => f.key));
        const qs = buildBlitzQuestions(facts, mulberry32(2), 80);
        expect(qs.every((q) => allowed.has(q.factKey ?? ''))).toBe(true);
        expect(qs.some((q) => q.kind === 'diff')).toBe(true);
    });
});
