import { describe, expect, it } from 'vitest';
import { migrateV1ToV2, migrateV2ToV3 } from './migration';

const v2 = {
    users: {
        a: {
            id: 'a', name: 'Amy', avatar: '🦊', mode: 'kinder', language: 'en', coins: 50,
            skills: {
                k_add_5: { attempts: 6, correct: 5, recent: [true, false, true], avgTimeMs: 4000, lastPlayedAt: 1 },
                k_sub_5: { attempts: 0, correct: 0, recent: [], avgTimeMs: 0, lastPlayedAt: 0 },
            },
        },
    },
    currentUserId: 'a',
};

describe('migrateV2ToV3', () => {
    it('adds defaults and keeps existing fields', () => {
        const out = migrateV2ToV3(v2);
        expect(out.currentUserId).toBe('a');
        expect(out.users.a).toMatchObject({
            name: 'Amy', mode: 'kinder', language: 'en', coins: 50, cards: {}, tickets: 0, pity: 0,
            streak: { count: 0, best: 0, lastDay: null }, dailyBonusDay: null, totalSessions: 0,
        });
    });

    it('gives 1 star to skills with attempts only', () => {
        expect(migrateV2ToV3(v2).users.a.stars).toEqual({ k_add_5: 1 });
    });

    it('is idempotent on v3 data and keeps valid values', () => {
        const once = migrateV2ToV3({
            users: {
                a: {
                    ...v2.users.a, stars: { k_add_5: 3 }, cards: { dino_x: 2 }, tickets: 2, pity: 4, totalSessions: 9,
                    streak: { count: 3, best: 5, lastDay: '2026-01-02' }, dailyBonusDay: '2026-01-02',
                },
            },
            currentUserId: 'a',
        });
        expect(once.users.a).toMatchObject({ stars: { k_add_5: 3 }, cards: { dino_x: 2 }, tickets: 2, pity: 4, totalSessions: 9 });
        expect(once.users.a.streak).toEqual({ count: 3, best: 5, lastDay: '2026-01-02' });
        expect(migrateV2ToV3(once)).toEqual(once);
    });

    it('does not throw on garbage and repairs fields', () => {
        const bad = { skills: 5, stars: 'x', cards: [], streak: 7, tickets: -4, dailyBonusDay: 3 };
        const inputs: unknown[] = [undefined, null, 1, 'x', [], {}, { users: 3 }, { users: { a: null, b: bad } }];
        for (const input of inputs) expect(() => migrateV2ToV3(input)).not.toThrow();
        const out = migrateV2ToV3({ users: { b: bad } });
        expect(out.users.b).toMatchObject({ skills: {}, stars: {}, cards: {}, tickets: 0, dailyBonusDay: null, mode: 'grade4' });
    });

    it('drops invalid and future days', () => {
        const mk = (lastDay: string, dailyBonusDay: string) => ({
            users: { a: { ...v2.users.a, streak: { count: 4, best: 4, lastDay }, dailyBonusDay } },
        });
        const bad = migrateV2ToV3(mk('2026-13-45', '2099-01-01'), '2026-05-05').users.a;
        expect(bad.streak).toMatchObject({ count: 4, lastDay: null });
        expect(bad.dailyBonusDay).toBeNull();
        const ok = migrateV2ToV3(mk('2026-05-04', '2026-05-05'), '2026-05-05').users.a;
        expect(ok.streak.lastDay).toBe('2026-05-04');
        expect(ok.dailyBonusDay).toBe('2026-05-05');
    });

    it('chains from a v1 save', () => {
        const v1 = { users: { a: { id: 'a', name: 'Amy', avatar: '🦊', coins: 120, inventory: {}, placedItems: [] } }, currentUserId: 'a', language: 'en' };
        const out = migrateV2ToV3(migrateV1ToV2(v1));
        expect(out.users.a).toMatchObject({ coins: 120, mode: 'grade4', language: 'en', stars: {}, cards: {}, tickets: 0 });
    });
});
