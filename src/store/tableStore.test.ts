import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allTableFacts } from '../data/tableFacts';
import { claimId, chartMasteredCount, masteredTotal, pendingMilestones } from '../utils/chart';
import type { FactStats } from '../utils/factProgress';
import { skills, specialSkills, tableSkills, specialTableSkills } from '../data/skills';
import { t } from '../utils/i18n';

const memory = new Map<string, string>();

vi.stubGlobal('localStorage', {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
    clear: () => memory.clear(),
});

const { useGameStore } = await import('./useGameStore');

const day = (d: number) => new Date(2026, 4, d, 12);
const user = () => {
    const { users, currentUserId } = useGameStore.getState();
    return users[currentUserId ?? ''];
};

beforeEach(() => {
    useGameStore.setState({ users: {}, currentUserId: null });
    useGameStore.getState().createUser('Kid', '🦊', 'grade4', 'zh-TW');
});

describe('recordFact with table keys', () => {
    it('accepts table keys and uses 4000 ms for x and 5000 ms for /', () => {
        const { recordFact } = useGameStore.getState();
        // get both facts to box 2 first (any correct answer raises boxes 0 and 1)
        for (const [d, key] of [[1, '3x4'], [1, '12/3'], [2, '3x4'], [2, '12/3']] as const) recordFact(key, true, 1000, false, day(d));
        expect(user().facts['3x4'].box).toBe(2);
        expect(user().facts['12/3'].box).toBe(2);
        // 4500 ms: too slow for x (box stays), fast enough for / (box rises)
        recordFact('3x4', true, 4500, false, day(3));
        recordFact('12/3', true, 4500, false, day(3));
        expect(user().facts['3x4'].box).toBe(2);
        expect(user().facts['12/3'].box).toBe(3);
        expect(recordFact('9x10', true, 1000, false, day(3))).toBeNull();
    });

    it('keeps the kinder 4000 ms threshold', () => {
        const { recordFact } = useGameStore.getState();
        for (const d of [1, 2]) recordFact('3+4', true, 1000, false, day(d));
        recordFact('3+4', true, 4500, false, day(3));
        expect(user().facts['3+4'].box).toBe(2);
    });
});

describe('recordDiagnosticFact', () => {
    it('seeds boxes, never above 2, with no coins, stars or tickets', () => {
        const { recordDiagnosticFact } = useGameStore.getState();
        const before = { coins: user().coins, tickets: user().tickets, stars: user().stars };
        expect(recordDiagnosticFact('7x8', true, 1200, day(1))).toBe(true);
        recordDiagnosticFact('6x6', true, 9000, day(1));
        recordDiagnosticFact('12/3', true, 4800, day(1));
        recordDiagnosticFact('9x9', false, 800, day(1));
        const f = user().facts;
        expect(f['7x8'].box).toBe(2);
        expect(f['6x6'].box).toBe(1);
        expect(f['12/3'].box).toBe(2); // 4800 ms is fast for division
        expect(f['9x9']).toMatchObject({ box: 0, lastWrong: true, attempts: 1, correct: 0 });
        for (const k of Object.keys(f)) expect(f[k].box).toBeLessThanOrEqual(2);
        expect({ coins: user().coins, tickets: user().tickets, stars: user().stars }).toEqual(before);
        expect(recordDiagnosticFact('3+4', true, 1000, day(1))).toBe(false);
    });
});

describe('times-table chart milestones', () => {
    const mastered = (): FactStats => ({ box: 4, attempts: 5, correct: 5, lastSeenDay: '2026-05-01', lastUpDay: null, bestMs: 1000 });
    const withMastered = (op: '×' | '÷', n: number) =>
        Object.fromEntries(allTableFacts.filter((f) => f.op === op).slice(0, n).map((f) => [f.key, mastered()]));

    it('counts x and / separately and leaves the kinder totals alone', () => {
        const facts = { ...withMastered('×', 30), ...withMastered('÷', 4) };
        expect(chartMasteredCount(facts, 'mul')).toBe(30);
        expect(chartMasteredCount(facts, 'div')).toBe(4);
        expect(chartMasteredCount(facts, 'add')).toBe(0);
        expect(masteredTotal(facts)).toBe(0);
    });

    it('uses the mul / div milestone ids with the same thresholds and tickets', () => {
        expect(claimId('mul', 25)).toBe('mul25');
        expect(pendingMilestones(withMastered('×', 20), [])).toEqual([]);
        expect(pendingMilestones(withMastered('×', 21), [])).toEqual([{ id: 'mul25', chart: 'mul', pct: 25, tickets: 1 }]);
        expect(pendingMilestones(withMastered('÷', 81), []).map((m) => m.id)).toEqual(['div25', 'div50', 'div75', 'div100']);
        expect(pendingMilestones(withMastered('÷', 81), []).reduce((n, m) => n + m.tickets, 0)).toBe(7);
        expect(pendingMilestones(withMastered('×', 41), ['mul25'])).toEqual([{ id: 'mul50', chart: 'mul', pct: 50, tickets: 1 }]);
    });

    it('claims table milestones through claimChartMilestones', () => {
        const facts = withMastered('×', 21);
        useGameStore.setState((s) => ({ users: { ...s.users, [user().id]: { ...user(), facts } } }));
        expect(useGameStore.getState().claimChartMilestones()).toBe(1);
        expect(user().chartClaims).toEqual(['mul25']);
        expect(useGameStore.getState().claimChartMilestones()).toBe(0);
    });
});

describe('i18n of table skills', () => {
    it('has names in both languages', () => {
        for (const s of [...tableSkills, ...specialTableSkills]) {
            expect(t(s.nameKey, 'en')).not.toBe(s.nameKey);
            expect(t(s.nameKey, 'zh-TW')).not.toBe(s.nameKey);
        }
        expect(skills.length + specialSkills.length).toBeGreaterThan(0);
    });
});
