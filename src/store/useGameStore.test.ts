import { beforeEach, describe, expect, it, vi } from 'vitest';

const memory = new Map<string, string>();

vi.stubGlobal('localStorage', {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
    clear: () => memory.clear(),
});

const { useGameStore } = await import('./useGameStore');

describe('useGameStore', () => {
    beforeEach(() => {
        useGameStore.setState({ users: {}, currentUserId: null });
        useGameStore.getState().createUser('Kid', '🦊', 'grade4', 'zh-TW');
    });

    const current = () => {
        const { users, currentUserId } = useGameStore.getState();
        return users[currentUserId ?? ''];
    };

    it('setUserMode and setUserLanguage change only the current user', () => {
        const firstId = useGameStore.getState().currentUserId ?? '';
        useGameStore.getState().addCoins(40);
        useGameStore.getState().recordAnswer('g_add_4', true, 1000);
        const firstBefore = useGameStore.getState().users[firstId];

        useGameStore.getState().createUser('Other', '🐱', 'grade4', 'zh-TW');
        const otherId = useGameStore.getState().currentUserId ?? '';
        useGameStore.getState().switchUser(firstId);

        useGameStore.getState().setUserMode('kinder');
        useGameStore.getState().setUserLanguage('en');

        const first = useGameStore.getState().users[firstId];
        expect(first).toMatchObject({ mode: 'kinder', language: 'en' });
        expect(first.coins).toBe(firstBefore.coins);
        expect(first.skills).toEqual(firstBefore.skills);
        expect(useGameStore.getState().users[otherId]).toMatchObject({ mode: 'grade4', language: 'zh-TW' });
    });

    it('recordAnswer tracks stats', () => {
        const { recordAnswer } = useGameStore.getState();
        recordAnswer('k_add_5', true, 1000);
        recordAnswer('k_add_5', false, 6000);
        const stats = current().skills.k_add_5;
        expect(stats).toMatchObject({ attempts: 2, correct: 1, recent: [true, false] });
        expect(stats.avgTimeMs).toBeCloseTo(2000);
    });

    it('keeps only the last 10 results', () => {
        for (let i = 0; i < 12; i++) useGameStore.getState().recordAnswer('k_add_5', i >= 2, 1000);
        expect(current().skills.k_add_5.recent).toEqual(Array(10).fill(true));
    });

    it('addCoins is a no-op without a user', () => {
        useGameStore.setState({ currentUserId: null });
        const before = structuredClone(useGameStore.getState().users);
        expect(() => useGameStore.getState().addCoins(5)).not.toThrow();
        expect(useGameStore.getState().users).toEqual(before);
    });
});
