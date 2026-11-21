import { describe, expect, it } from 'vitest';
import { migrateV1ToV2 } from './migration';

const v1 = {
    users: {
        a: {
            id: 'a', name: 'Amy', avatar: '🦊', coins: 120,
            inventory: { cabin: 1 }, placedItems: [{ id: 'p', itemId: 'cabin', x: 1, y: 2 }], landLevel: 3,
        },
        b: { id: 'b', name: 'Ben', avatar: '🐱', coins: 5, inventory: {}, placedItems: [] },
    },
    currentUserId: 'b',
    settings: { operations: ['+'], leftDigits: 1, rightDigits: 1, questionCount: 10 },
    language: 'en',
};

describe('migrateV1ToV2', () => {
    it('converts a v1 fixture', () => {
        const out = migrateV1ToV2(v1);
        expect(out.currentUserId).toBe('b');
        expect(out.users.a).toEqual({
            id: 'a', name: 'Amy', avatar: '🦊', coins: 120, mode: 'grade4', language: 'en', skills: {},
        });
        expect(out.users.b.coins).toBe(5);
        expect(Object.keys(out)).toEqual(['users', 'currentUserId']);
    });

    it('defaults language to zh-TW', () => {
        expect(migrateV1ToV2({ ...v1, language: undefined }).users.a.language).toBe('zh-TW');
        expect(migrateV1ToV2({ ...v1, language: 'fr' }).users.a.language).toBe('zh-TW');
    });

    it('does not throw on garbage', () => {
        const inputs: unknown[] = [
            undefined, null, 42, 'x', [], {}, { users: 5 },
            { users: { a: null, b: 7, c: [] } },
            { users: { a: { coins: 'lots' } }, currentUserId: 9 },
        ];
        for (const input of inputs) {
            expect(() => migrateV1ToV2(input)).not.toThrow();
        }
        expect(migrateV1ToV2(undefined)).toEqual({ users: {}, currentUserId: null });
    });

    it('repairs bad fields', () => {
        const out = migrateV1ToV2({ users: { k: { coins: 'lots', name: 3 } }, currentUserId: 'zzz' });
        expect(out.users.k).toMatchObject({ id: 'k', name: '', coins: 0, mode: 'grade4', skills: {} });
        expect(out.currentUserId).toBeNull();
    });
    it("replaces the v1 literal 'default-avatar' with an emoji and keeps emoji avatars", () => {
        const out = migrateV1ToV2({
            users: {
                a: { id: 'a', name: 'A', avatar: 'default-avatar', coins: 1 },
                b: { id: 'b', name: 'B', avatar: '🐱', coins: 1 },
            },
        });
        expect(out.users.a.avatar).toBe('🦊');
        expect(out.users.b.avatar).toBe('🐱');
    });
});
