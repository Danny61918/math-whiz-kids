import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allFacts } from '../data/facts';
import type { FactStats } from '../utils/factProgress';

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
const patchUser = (patch: Partial<ReturnType<typeof user>>) =>
    useGameStore.setState((s) => ({ users: { ...s.users, [user().id]: { ...user(), ...patch } } }));

beforeEach(() => {
    useGameStore.setState({ users: {}, currentUserId: null });
    useGameStore.getState().createUser('Kid', '🦊', 'kinder', 'en');
});

describe('new users', () => {
    it('start with empty fluency data', () => {
        expect(user()).toMatchObject({ facts: {}, chartClaims: [], blitzBest: 0, blitzBestDay: null });
    });
});

describe('recordFact', () => {
    it('creates and updates fact stats for the current user only', () => {
        const kidId = user().id;
        useGameStore.getState().createUser('Other', '🐱', 'kinder', 'en');
        const otherId = useGameStore.getState().currentUserId ?? '';
        useGameStore.getState().switchUser(kidId);
        const othersBefore = structuredClone(useGameStore.getState().users[otherId]);

        const r = useGameStore.getState().recordFact('3+4', true, 1500, false, day(1));
        expect(r).toEqual({ boxBefore: 0, boxAfter: 1, bonusCoins: 0 });
        expect(user().facts['3+4']).toMatchObject({ box: 1, attempts: 1, correct: 1, lastSeenDay: '2026-05-01', bestMs: 1500 });
        useGameStore.getState().recordFact('3+4', false, 900, false, day(2));
        expect(user().facts['3+4']).toMatchObject({ box: 0, attempts: 2, correct: 1, lastWrong: true });
        expect(useGameStore.getState().users[otherId]).toEqual(othersBefore);
    });

    it('a helped answer never raises the box', () => {
        useGameStore.getState().recordFact('3+4', true, 1000, true, day(1));
        expect(user().facts['3+4']).toMatchObject({ box: 0, correct: 1 });
    });

    it('ignores invalid keys and does nothing without a user', () => {
        const before = structuredClone(useGameStore.getState().users);
        expect(useGameStore.getState().recordFact('0+0', true, 100, false)).toBeNull();
        expect(useGameStore.getState().users).toEqual(before);
        useGameStore.setState({ currentUserId: null });
        expect(useGameStore.getState().recordFact('3+4', true, 100, false)).toBeNull();
    });

    it('reports the +20 box-5 bonus in a single store update, and paid5 is only set by completeSession', () => {
        const base: FactStats = { box: 4, attempts: 9, correct: 9, lastSeenDay: '2026-05-01', lastUpDay: '2026-05-01', bestMs: 1000 };
        patchUser({ facts: { '3+4': base } });
        let updates = 0;
        const unsubscribe = useGameStore.subscribe(() => {
            updates += 1;
        });
        const up = useGameStore.getState().recordFact('3+4', true, 1000, false, day(3));
        unsubscribe();
        expect(updates).toBe(1);
        expect(up).toEqual({ boxBefore: 4, boxAfter: 5, bonusCoins: 20 });
        expect(user().facts['3+4'].paid5).toBeUndefined(); // not paid yet: abandoning keeps it earnable
        expect(user().coins).toBe(0); // coins are awarded by the session, never by recordFact

        // abandoned session: the same transition pays out again later
        useGameStore.getState().recordFact('3+4', false, 1000, false, day(4));
        useGameStore.getState().recordFact('3+4', true, 1000, false, day(5));
        const again = useGameStore.getState().recordFact('3+4', true, 1000, false, day(6));
        expect(again?.bonusCoins).toBe(20);

        // the session that awards the coins marks the fact as paid
        useGameStore.getState().completeSession({ skillId: 'k_add_5', correct: 8, total: 8, now: day(6), paidFacts: ['3+4', '9+9'] });
        expect(user().facts['3+4'].paid5).toBe(true);
        expect(user().facts['9+9']).toBeUndefined();
        expect(user().coins).toBe(0);
        useGameStore.getState().recordFact('3+4', false, 1000, false, day(7));
        useGameStore.getState().recordFact('3+4', true, 1000, false, day(8));
        const third = useGameStore.getState().recordFact('3+4', true, 1000, false, day(9));
        expect(third?.bonusCoins).toBe(0);
    });
});

describe('chart milestones', () => {
    const mastered = (): FactStats => ({ box: 4, attempts: 5, correct: 5, lastSeenDay: '2026-05-01', lastUpDay: null, bestMs: 1000 });
    const addFacts = (n: number) => Object.fromEntries(allFacts.filter((f) => f.op === '+').slice(0, n).map((f) => [f.key, mastered()]));

    it('claimChartMilestones grants once and is idempotent', () => {
        patchUser({ facts: addFacts(41) });
        expect(useGameStore.getState().claimChartMilestones()).toBe(2); // 25% (+1) and 50% (+1)
        expect(user().tickets).toBe(2);
        expect(user().chartClaims).toEqual(['add25', 'add50']);
        expect(useGameStore.getState().claimChartMilestones()).toBe(0);
        expect(user().tickets).toBe(2);
        patchUser({ facts: addFacts(61) });
        expect(useGameStore.getState().claimChartMilestones()).toBe(2); // 75% (+2)
        expect(user().chartClaims).toEqual(['add25', 'add50', 'add75']);
    });

    it('completeSession reports newly mastered facts and chart tickets from before/after', () => {
        const before = addFacts(20);
        patchUser({ facts: before });
        patchUser({ facts: addFacts(22) });
        const s = useGameStore.getState().completeSession({ skillId: 'k_add_5', correct: 8, total: 8, now: day(1), factsBefore: before });
        expect(s).toMatchObject({ newMasteredFacts: 2, chartTickets: 1 });
        expect(user().chartClaims).toEqual(['add25']);
        expect(user().tickets).toBe(2); // daily + chart
        expect(user().coins).toBe(0);
        const second = useGameStore.getState().completeSession({ skillId: 'k_add_5', correct: 8, total: 8, now: day(1), factsBefore: user().facts });
        expect(second).toMatchObject({ newMasteredFacts: 0, chartTickets: 0 });
        expect(user().tickets).toBe(2);
    });

    it('completeSession without factsBefore reports 0 newly mastered', () => {
        const s = useGameStore.getState().completeSession({ skillId: 'k_add_5', correct: 8, total: 8, now: day(1) });
        expect(s).toMatchObject({ newMasteredFacts: 0, chartTickets: 0 });
    });

    it('completeSession leaves other users untouched', () => {
        const kidId = user().id;
        useGameStore.getState().createUser('Other', '🐱', 'kinder', 'en');
        const otherId = useGameStore.getState().currentUserId ?? '';
        useGameStore.getState().switchUser(kidId);
        const before = structuredClone(useGameStore.getState().users[otherId]);
        patchUser({ facts: addFacts(30) });
        useGameStore.getState().completeSession({ skillId: 'k_add_5', correct: 8, total: 8, now: day(1), factsBefore: {} });
        expect(useGameStore.getState().users[otherId]).toEqual(before);
    });
});

describe('recordBlitz', () => {
    it('records the best and grants at most one ticket per day', () => {
        expect(useGameStore.getState().recordBlitz(6, day(1))).toEqual({ best: 6, newRecord: true, ticket: true });
        expect(user()).toMatchObject({ blitzBest: 6, blitzBestDay: '2026-05-01', tickets: 1 });
        expect(useGameStore.getState().recordBlitz(9, day(1))).toEqual({ best: 9, newRecord: true, ticket: false });
        expect(user().tickets).toBe(1);
        expect(useGameStore.getState().recordBlitz(4, day(2))).toEqual({ best: 9, newRecord: false, ticket: false });
        expect(useGameStore.getState().recordBlitz(10, day(2))).toEqual({ best: 10, newRecord: true, ticket: true });
        expect(user().tickets).toBe(2);
    });

    it('does not touch the streak or coins, and is a no-op without a user', () => {
        useGameStore.getState().recordBlitz(5, day(1));
        expect(user().streak.count).toBe(0);
        expect(user().coins).toBe(0);
        useGameStore.setState({ currentUserId: null });
        expect(useGameStore.getState().recordBlitz(5, day(1))).toBeNull();
    });
});
