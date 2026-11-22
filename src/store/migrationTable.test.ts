import { describe, expect, it } from 'vitest';
import { migrateV3ToV4 } from './migration';

describe('migrateV3ToV4 keeps table facts', () => {
    it('accepts table keys and still drops garbage keys', () => {
        const stat = { box: 2, attempts: 3, correct: 3, lastSeenDay: '2026-05-01', lastUpDay: null, bestMs: 1200 };
        const user = { id: 'a', name: 'A', avatar: 'x', mode: 'grade4', language: 'zh-TW', coins: 0, facts: { '7x8': stat, '56/7': stat, '3+4': stat, '0x3': stat, junk: stat } };
        const out = migrateV3ToV4({ users: { a: user }, currentUserId: 'a' }, '2026-05-10');
        expect(Object.keys(out.users.a.facts).sort()).toEqual(['3+4', '56/7', '7x8']);
        expect(out.users.a.facts['7x8'].box).toBe(2);
    });
});
