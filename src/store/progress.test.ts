import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cards } from '../data/cards';

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

describe('completeSession', () => {
    it('keeps best stars, counts sessions and does not touch coins', () => {
        const { completeSession } = useGameStore.getState();
        expect(completeSession({ skillId: 'k_add_5', correct: 5, total: 5, now: day(1) })).toMatchObject({ stars: 3, isNewBest: true });
        expect(completeSession({ skillId: 'k_add_5', correct: 2, total: 5, now: day(1) })).toMatchObject({ stars: 1, isNewBest: false });
        expect(user().stars.k_add_5).toBe(3);
        expect(user().totalSessions).toBe(2);
        expect(user().coins).toBe(0);
    });

    it('grants the daily ticket once per day and updates the streak', () => {
        const { completeSession } = useGameStore.getState();
        const first = completeSession({ skillId: 'k_add_5', correct: 5, total: 5, now: day(1) });
        const second = completeSession({ skillId: 'k_add_5', correct: 5, total: 5, now: day(1) });
        expect(first).toMatchObject({ dailyTicket: true, streakIncreased: true });
        expect(second).toMatchObject({ dailyTicket: false, streakIncreased: false });
        expect(user().tickets).toBe(1);
        expect(user().streak.count).toBe(1);
        completeSession({ skillId: 'k_add_5', correct: 5, total: 5, now: day(2) });
        expect(user().tickets).toBe(2);
        expect(user().streak).toMatchObject({ count: 2, lastDay: '2026-05-02' });
    });

    it('grants a milestone ticket on day 3 (plus the daily one)', () => {
        const { completeSession } = useGameStore.getState();
        completeSession({ skillId: 'k_add_5', correct: 5, total: 5, now: day(1) });
        completeSession({ skillId: 'k_add_5', correct: 5, total: 5, now: day(2) });
        const third = completeSession({ skillId: 'k_add_5', correct: 5, total: 5, now: day(3) });
        expect(third).toMatchObject({ milestoneTicket: true, dailyTicket: true });
        expect(user().tickets).toBe(4);
    });

    it('is a no-op without a user', () => {
        useGameStore.setState({ currentUserId: null });
        expect(useGameStore.getState().completeSession({ skillId: 'k_add_5', correct: 5, total: 5 })).toBeNull();
    });
});

describe('openPack', () => {
    const rng = () => 0.5;

    it('does nothing when it cannot be afforded', () => {
        const before = structuredClone(useGameStore.getState().users);
        expect(useGameStore.getState().openPack(rng)).toBe(false);
        expect(useGameStore.getState().users).toEqual(before);
    });

    it('uses a ticket before coins', () => {
        patchUser({ coins: 100, tickets: 1 });
        const r = useGameStore.getState().openPack(rng);
        if (!r) throw new Error('expected a pack');
        expect(r.usedTicket).toBe(true);
        expect(user().tickets).toBe(0);
        expect(user().coins).toBe(100);
        expect(user().cards[r.cardId]).toBe(1);
    });

    it('pays the mode price with coins', () => {
        patchUser({ coins: 200 });
        const r = useGameStore.getState().openPack(rng);
        expect(r && r.isNew).toBe(true);
        expect(user().coins).toBe(140);
    });

    it('refunds duplicates and increments the count', () => {
        patchUser({ coins: 200 });
        const first = useGameStore.getState().openPack(rng);
        if (!first) throw new Error('expected a pack');
        // Own every card so the next draw must be a duplicate.
        const all = Object.fromEntries(cards.map((c) => [c.id, 1]));
        patchUser({ cards: all, pity: 0, coins: 200 });
        const dup = useGameStore.getState().openPack(rng);
        if (!dup) throw new Error('expected a pack');
        expect(dup.isNew).toBe(false);
        expect(dup.refund).toBeGreaterThan(0);
        expect(user().coins).toBe(200 - 60 + dup.refund);
        expect(user().cards[dup.cardId]).toBe(2);
    });

    it('tracks pity with the draw', () => {
        patchUser({ coins: 60, pity: 9 });
        const r = useGameStore.getState().openPack(rng);
        if (!r) throw new Error('expected a pack');
        expect(user().pity).toBe(0); // 10th pull guarantees rarity >= 3
    });
});
