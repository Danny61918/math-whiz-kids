import { describe, expect, it } from 'vitest';
import { migrateV1ToV2, migrateV2ToV3, migrateV3ToV4 } from './migration';

const TODAY = '2026-05-10';

const v3 = {
    users: {
        a: {
            id: 'a', name: 'Amy', avatar: '🦊', mode: 'kinder', language: 'en', coins: 50,
            skills: { k_add_20: { attempts: 6, correct: 5, recent: [true], avgTimeMs: 4000, lastPlayedAt: 1 } },
            stars: { k_add_5: 3, k_add_20: 2, k_sub_20: 1, k_add_11_18: 1 },
            cards: { dino_x: 1 }, tickets: 2, pity: 1, totalSessions: 4,
            streak: { count: 2, best: 3, lastDay: '2026-05-09' }, dailyBonusDay: '2026-05-09',
        },
    },
    currentUserId: 'a',
};

describe('migrateV3ToV4', () => {
    it('adds the fluency fields and keeps everything else', () => {
        const out = migrateV3ToV4(v3, TODAY);
        expect(out.currentUserId).toBe('a');
        expect(out.users.a).toMatchObject({
            name: 'Amy', coins: 50, tickets: 2, pity: 1, totalSessions: 4, cards: { dino_x: 1 },
            facts: {}, chartClaims: [], blitzBest: 0, blitzBestDay: null,
        });
        expect(out.users.a.streak).toEqual({ count: 2, best: 3, lastDay: '2026-05-09' });
    });

    it('renames the old 20-skills stars, keeping the larger value, and drops the old keys', () => {
        const stars = migrateV3ToV4(v3, TODAY).users.a.stars;
        expect(stars).toEqual({ k_add_5: 3, k_add_11_18: 2, k_sub_11_18: 1 });
        expect('k_add_20' in stars || 'k_sub_20' in stars).toBe(false);
    });

    it('maps the star even when only the old key exists, and does not lower an existing larger one', () => {
        const only = migrateV3ToV4({ users: { a: { ...v3.users.a, skills: {}, stars: { k_sub_20: 3 } } } }, TODAY).users.a.stars;
        expect(only).toEqual({ k_sub_11_18: 3 });
        const keep = migrateV3ToV4({ users: { a: { ...v3.users.a, skills: {}, stars: { k_add_20: 1, k_add_11_18: 3 } } } }, TODAY).users.a.stars;
        expect(keep).toEqual({ k_add_11_18: 3 });
    });

    it('is idempotent and preserves valid v4 data', () => {
        const withFacts = {
            users: {
                a: {
                    ...v3.users.a,
                    facts: { '3+4': { box: 4, attempts: 9, correct: 8, lastSeenDay: '2026-05-08', lastUpDay: '2026-05-08', bestMs: 1800, paid5: true } },
                    chartClaims: ['add25'], blitzBest: 12, blitzBestDay: '2026-05-09',
                },
            },
            currentUserId: 'a',
        };
        const once = migrateV3ToV4(withFacts, TODAY);
        expect(once.users.a.facts['3+4']).toEqual({ box: 4, attempts: 9, correct: 8, lastSeenDay: '2026-05-08', lastUpDay: '2026-05-08', bestMs: 1800, paid5: true });
        expect(once.users.a).toMatchObject({ chartClaims: ['add25'], blitzBest: 12, blitzBestDay: '2026-05-09' });
        expect(migrateV3ToV4(once, TODAY)).toEqual(once);
    });

    it('repairs garbage without throwing', () => {
        const bad = {
            ...v3.users.a,
            facts: {
                '3+4': { box: 99, attempts: -3, correct: 'x', lastSeenDay: '2099-01-01', lastUpDay: 'nope', bestMs: -5 },
                'bogus': { box: 1 },
                '0+3': { box: 1 },
                '5+5': 'not a record',
            },
            chartClaims: ['add25', 7, 'add25', null], blitzBest: -2, blitzBestDay: 5,
        };
        const out = migrateV3ToV4({ users: { a: bad } }, TODAY).users.a;
        expect(out.facts).toEqual({ '3+4': { box: 5, attempts: 0, correct: 0, lastSeenDay: null, lastUpDay: null, bestMs: null } });
        expect(out.chartClaims).toEqual(['add25']);
        expect(out.blitzBest).toBe(0);
        expect(out.blitzBestDay).toBeNull();
        const inputs: unknown[] = [undefined, null, 1, 'x', [], {}, { users: 3 }, { users: { a: null, b: { facts: 5, chartClaims: 'x' } } }];
        for (const input of inputs) expect(() => migrateV3ToV4(input, TODAY)).not.toThrow();
        expect(migrateV3ToV4({ users: { b: { facts: 5, chartClaims: 'x' } } }, TODAY).users.b).toMatchObject({ facts: {}, chartClaims: [] });
    });

    it('chains from v1 and v2 saves', () => {
        const v1 = { users: { a: { id: 'a', name: 'Amy', avatar: '🦊', coins: 120 } }, currentUserId: 'a', language: 'en' };
        const fromV1 = migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(v1), TODAY), TODAY);
        expect(fromV1.users.a).toMatchObject({ coins: 120, mode: 'grade4', facts: {}, chartClaims: [], blitzBest: 0, stars: {} });
        const v2 = { users: { a: { id: 'a', name: 'Amy', avatar: '🦊', mode: 'kinder', language: 'en', coins: 5, skills: { k_sub_20: { attempts: 3, correct: 3, recent: [], avgTimeMs: 1, lastPlayedAt: 1 } } } } };
        expect(migrateV3ToV4(migrateV2ToV3(v2, TODAY), TODAY).users.a.stars).toEqual({ k_sub_11_18: 1 });
        // Running straight from v2 data also works (the v3 step is applied internally).
        expect(migrateV3ToV4(v2, TODAY).users.a.stars).toEqual({ k_sub_11_18: 1 });
    });
});
