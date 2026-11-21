import { describe, expect, it } from 'vitest';
import { skills } from '../data/skills';
import { checkAnswer, countBorrows, countCarries, generateQuestion, generateSession, type Question, type Rng } from './mathEngine';

function mulberry32(seed: number): Rng {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const digits = (n: number | null) => String(n).length;

function sample(skillId: string, count = 300): Question[] {
    const rng = mulberry32(12345);
    return Array.from({ length: count }, () => generateQuestion(skillId, rng));
}

function expectBasics(q: Question, skillId: string) {
    expect(q.skillId).toBe(skillId);
    expect(Number.isInteger(q.answer)).toBe(true);
    expect(q.answer).toBeGreaterThan(0);
    expect(q.left).not.toBe(0);
    expect(q.right).not.toBe(0);
}

describe('countCarries / countBorrows', () => {
    it('counts propagated carries', () => {
        expect(countCarries(5, 5)).toBe(1);
        expect(countCarries(99, 1)).toBe(2);
        expect(countCarries(123, 456)).toBe(0);
        expect(countCarries(999, 1)).toBe(3);
    });
    it('counts propagated borrows', () => {
        expect(countBorrows(10, 1)).toBe(1);
        expect(countBorrows(100, 1)).toBe(2);
        expect(countBorrows(789, 123)).toBe(0);
        expect(countBorrows(1000, 1)).toBe(3);
    });
});

describe('kinder skills', () => {
    const addCases: [string, number][] = [['k_add_5', 5], ['k_add_10', 10], ['k_add_20', 20]];
    it.each(addCases)('%s: sum <= max, operands >= 1', (id, max) => {
        for (const q of sample(id)) {
            expectBasics(q, id);
            expect(q.operator).toBe('+');
            expect(q.left).toBeGreaterThanOrEqual(1);
            expect(q.right).toBeGreaterThanOrEqual(1);
            expect(q.answer).toBeLessThanOrEqual(max);
            expect(q.answer).toBe((q.left ?? 0) + (q.right ?? 0));
        }
    });

    const subCases: [string, number][] = [['k_sub_5', 5], ['k_sub_10', 10], ['k_sub_20', 20]];
    it.each(subCases)('%s: a <= max, positive result', (id, max) => {
        for (const q of sample(id)) {
            expectBasics(q, id);
            expect(q.operator).toBe('-');
            expect(q.left).toBeLessThanOrEqual(max);
            expect(q.right).toBeGreaterThanOrEqual(1);
            expect(q.left).not.toBe(q.right);
            expect(q.answer).toBe((q.left ?? 0) - (q.right ?? 0));
        }
    });

    it('k_sub_20 includes borrow cases', () => {
        const borrows = sample('k_sub_20').filter((q) => countBorrows(q.left ?? 0, q.right ?? 0) > 0);
        expect(borrows.length).toBeGreaterThan(30);
    });

    it('k_add_20 includes carry cases', () => {
        const carries = sample('k_add_20').filter((q) => countCarries(q.left ?? 0, q.right ?? 0) > 0);
        expect(carries.length).toBeGreaterThan(30);
    });

    it('k_make10: a + ? = 10', () => {
        for (const q of sample('k_make10')) {
            expect(q.operator).toBe('+');
            expect(q.right).toBeNull();
            expect(q.result).toBe(10);
            expect(q.left).toBeGreaterThanOrEqual(1);
            expect(q.left).toBeLessThanOrEqual(9);
            expect((q.left ?? 0) + q.answer).toBe(10);
        }
    });
});

describe('grade4 add/sub', () => {
    it('g_add_4', () => {
        for (const q of sample('g_add_4')) {
            expectBasics(q, 'g_add_4');
            expect(digits(q.left)).toBe(4);
            expect([3, 4]).toContain(digits(q.right));
            expect(countCarries(q.left ?? 0, q.right ?? 0)).toBeGreaterThanOrEqual(1);
            expect(q.answer).toBe((q.left ?? 0) + (q.right ?? 0));
        }
    });
    it('g_sub_4', () => {
        for (const q of sample('g_sub_4')) {
            expectBasics(q, 'g_sub_4');
            expect(digits(q.left)).toBe(4);
            expect([3, 4]).toContain(digits(q.right));
            expect(countBorrows(q.left ?? 0, q.right ?? 0)).toBeGreaterThanOrEqual(1);
            expect(q.answer).toBe((q.left ?? 0) - (q.right ?? 0));
        }
    });
    it('g_add_6', () => {
        for (const q of sample('g_add_6')) {
            expectBasics(q, 'g_add_6');
            expect([5, 6]).toContain(digits(q.left));
            expect([5, 6]).toContain(digits(q.right));
            expect(countCarries(q.left ?? 0, q.right ?? 0)).toBeGreaterThanOrEqual(2);
        }
    });
    it('g_sub_6', () => {
        for (const q of sample('g_sub_6')) {
            expectBasics(q, 'g_sub_6');
            expect([5, 6]).toContain(digits(q.left));
            expect([5, 6]).toContain(digits(q.right));
            expect(countBorrows(q.left ?? 0, q.right ?? 0)).toBeGreaterThanOrEqual(2);
            expect(q.answer).toBeGreaterThan(0);
        }
    });
});

describe('grade4 mul', () => {
    const cases: [string, number, number][] = [['g_mul_21', 2, 1], ['g_mul_32', 3, 2], ['g_mul_42', 4, 2]];
    it.each(cases)('%s digit counts', (id, a, b) => {
        for (const q of sample(id)) {
            expectBasics(q, id);
            expect(q.operator).toBe('×');
            expect(digits(q.left)).toBe(a);
            expect(digits(q.right)).toBe(b);
            expect(q.right).not.toBe(1);
            expect(q.answer).toBe((q.left ?? 0) * (q.right ?? 0));
        }
    });
});

describe('grade4 div', () => {
    const cases: [string, number, number][] = [['g_div_21', 2, 1], ['g_div_32', 3, 2], ['g_div_41', 4, 1]];
    it.each(cases)('%s relation, ranges, remainder rate', (id, dividendDigits, divisorDigits) => {
        const qs = sample(id);
        for (const q of qs) {
            expectBasics(q, id);
            expect(q.operator).toBe('÷');
            expect(digits(q.left)).toBe(dividendDigits);
            expect(digits(q.right)).toBe(divisorDigits);
            const divisor = q.right ?? 0;
            const remainder = q.remainder ?? -1;
            expect(divisor).toBeGreaterThanOrEqual(2);
            expect(q.answer).toBeGreaterThanOrEqual(2);
            expect(remainder).toBeGreaterThanOrEqual(0);
            expect(remainder).toBeLessThan(divisor);
            expect(q.left).toBe(q.answer * divisor + remainder);
        }
        const nonZero = qs.filter((q) => (q.remainder ?? 0) > 0).length / qs.length;
        expect(nonZero).toBeGreaterThan(0.55);
        expect(nonZero).toBeLessThan(0.85);
    });
});

describe('generateSession', () => {
    it.each(skills.map((s) => s.id))('%s: no duplicate keys', (id) => {
        for (const seed of [1, 2, 3]) {
            const count = id.startsWith('k_') ? 5 : 10; // per-mode session sizes
            const session = generateSession(id, count, mulberry32(seed));
            expect(session).toHaveLength(count);
            expect(new Set(session.map((q) => q.key)).size).toBe(count);
        }
    });

    it('is deterministic for a seed', () => {
        expect(generateSession('g_div_32', 10, mulberry32(7))).toEqual(generateSession('g_div_32', 10, mulberry32(7)));
    });

    it('does not hang or throw when the pool is smaller than the count', () => {
        expect(generateSession('k_make10', 20, mulberry32(9))).toHaveLength(20);
    });

    it('throws on unknown skills', () => {
        expect(() => generateQuestion('nope')).toThrow();
    });
});

describe('checkAnswer', () => {
    const q = generateSession('g_div_21', 1, mulberry32(3))[0];
    const remainder = q.remainder ?? 0;

    it('requires quotient and remainder', () => {
        expect(checkAnswer(q, { answer: q.answer, remainder })).toBe(true);
        expect(checkAnswer(q, { answer: q.answer + 1, remainder })).toBe(false);
        expect(checkAnswer(q, { answer: q.answer, remainder: remainder + 1 })).toBe(false);
    });

    it('treats a missing remainder as 0', () => {
        const exact: Question = { ...q, left: 42, right: 6, answer: 7, remainder: 0 };
        expect(checkAnswer(exact, { answer: 7 })).toBe(true);
        const withRem: Question = { ...q, left: 45, right: 6, answer: 7, remainder: 3 };
        expect(checkAnswer(withRem, { answer: 7 })).toBe(false);
        expect(checkAnswer(withRem, { answer: 7, remainder: 3 })).toBe(true);
    });

    it('checks plain answers', () => {
        const add = generateQuestion('k_add_10', mulberry32(1));
        expect(checkAnswer(add, { answer: add.answer })).toBe(true);
        expect(checkAnswer(add, { answer: add.answer + 1 })).toBe(false);
    });
});
