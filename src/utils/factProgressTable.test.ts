import { describe, expect, it } from 'vitest';
import { seedDiagnosticFact, updateFact } from './factProgress';

describe('fastMs parameter and diagnostic seeding', () => {
    const base = { box: 2 as const, attempts: 3, correct: 3, lastSeenDay: '2026-05-01', lastUpDay: null, bestMs: 3000 };
    it('defaults to the 4000 ms threshold and accepts another one', () => {
        expect(updateFact(base, { correct: true, retrievalMs: 4500 }, '2026-05-10').box).toBe(2);
        expect(updateFact(base, { correct: true, retrievalMs: 4500 }, '2026-05-10', 5000).box).toBe(3);
        expect(updateFact(base, { correct: true, retrievalMs: 3900 }, '2026-05-10', 4000).box).toBe(3);
    });
    it('seeds correct+fast to box 2, correct+slow to box 1, wrong to box 0', () => {
        expect(seedDiagnosticFact(undefined, { correct: true, retrievalMs: 1500 }, '2026-05-10', 4000).box).toBe(2);
        expect(seedDiagnosticFact(undefined, { correct: true, retrievalMs: 9000 }, '2026-05-10', 4000).box).toBe(1);
        const wrong = seedDiagnosticFact(base, { correct: false, retrievalMs: 1500 }, '2026-05-10', 4000);
        expect(wrong.box).toBe(0);
        expect(wrong.lastWrong).toBe(true);
    });
    it('a wrong answer costs 2 boxes on an attempted fact (box 0 for unseen) and keeps lastWrong', () => {
        const high = { ...base, box: 4 as const };
        expect(seedDiagnosticFact(high, { correct: false, retrievalMs: 900 }, '2026-05-10', 4000)).toMatchObject({ box: 2, lastWrong: true });
        expect(seedDiagnosticFact(undefined, { correct: false, retrievalMs: 900 }, '2026-05-10', 4000)).toMatchObject({ box: 0, lastWrong: true });
    });
    it('sets lastUpDay when the seed raises the box, so practice the same day cannot raise it again', () => {
        const seeded = seedDiagnosticFact(undefined, { correct: true, retrievalMs: 900 }, '2026-05-10', 4000);
        expect(seeded.lastUpDay).toBe('2026-05-10');
        expect(updateFact(seeded, { correct: true, retrievalMs: 900 }, '2026-05-10').box).toBe(2);
        const kept = seedDiagnosticFact({ ...base, box: 3 }, { correct: true, retrievalMs: 900 }, '2026-05-10', 4000);
        expect(kept.lastUpDay).toBeNull();
    });
    it('never seeds above box 2 and never lowers a higher box on a correct answer', () => {
        const high = { ...base, box: 4 as const };
        expect(seedDiagnosticFact(high, { correct: true, retrievalMs: 500 }, '2026-05-10', 4000).box).toBe(4);
        expect(seedDiagnosticFact(undefined, { correct: true, retrievalMs: 1 }, '2026-05-10', 4000).box).toBeLessThanOrEqual(2);
        expect(seedDiagnosticFact(base, { correct: true, retrievalMs: 9000 }, '2026-05-10', 4000).box).toBe(2);
    });
});
