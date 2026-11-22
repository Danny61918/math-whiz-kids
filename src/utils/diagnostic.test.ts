import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../test-rng';
import { buildDiagnosticQuestions, summariseDiagnostic, DIAGNOSTIC_COUNT, type DiagnosticAnswer } from './diagnostic';
import { checkAnswer } from './mathEngine';

describe('buildDiagnosticQuestions', () => {
    it('builds 27 direct questions: 3 per group, 24 x and 3 /, no duplicates', () => {
        for (let seed = 1; seed <= 40; seed++) {
            const qs = buildDiagnosticQuestions(mulberry32(seed));
            expect(qs).toHaveLength(DIAGNOSTIC_COUNT);
            for (let g = 1; g <= 9; g++) expect(qs.filter((q) => q.group === g)).toHaveLength(3);
            expect(qs.filter((q) => (q.factKey ?? '').includes('/'))).toHaveLength(3);
            expect(qs.filter((q) => (q.factKey ?? '').includes('x'))).toHaveLength(24);
            expect(new Set(qs.map((q) => q.factKey)).size).toBe(27);
            const pairs = qs.filter((q) => q.operator === '×').map((q) => [Math.min(q.left ?? 0, q.right ?? 0), Math.max(q.left ?? 0, q.right ?? 0)].join('-'));
            expect(new Set(pairs).size).toBe(pairs.length);
            for (const q of qs) {
                expect(q.right).not.toBeNull();
                expect(checkAnswer(q, { answer: q.answer })).toBe(true);
                const k = q.factKey ?? '';
                const [p, d] = k.split('/').map(Number);
                const [x, y] = k.includes('x') ? k.split('x').map(Number) : [d, p / d];
                expect(x === q.group || y === q.group).toBe(true);
            }
        }
    });
    it('prefers facts with both operands >= 2 and is deterministic', () => {
        const qs = buildDiagnosticQuestions(mulberry32(5));
        for (const q of qs.filter((x) => x.group >= 2)) {
            const k = q.factKey ?? '';
            if (k.includes('x')) expect(k.split('x').map(Number).every((n) => n >= 2)).toBe(true);
        }
        expect(buildDiagnosticQuestions(mulberry32(5))).toEqual(qs);
    });
});

describe('summariseDiagnostic', () => {
    const qs = buildDiagnosticQuestions(mulberry32(9));
    const answers = (f: (q: (typeof qs)[number]) => { correct: boolean; retrievalMs: number }): DiagnosticAnswer[] =>
        qs.map((question) => ({ question, ...f(question) }));
    it('all fast and correct -> every group strong, nothing to focus on', () => {
        const s = summariseDiagnostic(answers(() => ({ correct: true, retrievalMs: 800 })));
        expect(s.groups.every((g) => g.status === 'strong')).toBe(true);
        expect(s.focus).toEqual([]);
        expect(s.slowFacts).toEqual([]);
    });
    it('wrong answers mark their group as practise; slow ones are listed with seconds', () => {
        const s = summariseDiagnostic(answers((q) => ({ correct: q.group !== 7, retrievalMs: q.group === 3 ? 9000 : 700 })));
        expect(s.groups.find((g) => g.group === 7)).toMatchObject({ status: 'practice', wrong: 3 });
        expect(s.groups.find((g) => g.group === 3)?.status).toBe('slow');
        expect(s.focus).toEqual([7]);
        expect(s.slowFacts).toHaveLength(3);
        expect(s.slowFacts[0].seconds).toBe(9);
    });
    it('uses the 5 s threshold for division facts', () => {
        const s = summariseDiagnostic(answers((q) => ({ correct: true, retrievalMs: (q.factKey ?? '').includes('/') ? 4800 : 700 })));
        expect(s.slowFacts).toEqual([]);
    });
});
