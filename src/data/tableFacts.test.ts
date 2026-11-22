import { describe, expect, it } from 'vitest';
import { allTableFacts, DIV_FAST_MS, MUL_FAST_MS, parseTableKey, tableFactsByKey, tableFastMs, tableKey, tablePoolFor, TABLE_LADDER_IDS } from './tableFacts';
import { parseFactKey } from './facts';

describe('table facts', () => {
    it('has 81 multiplication and 81 division facts with unique keys', () => {
        expect(allTableFacts.filter((f) => f.op === '×')).toHaveLength(81);
        expect(allTableFacts.filter((f) => f.op === '÷')).toHaveLength(81);
        expect(new Set(allTableFacts.map((f) => f.key)).size).toBe(162);
        expect(Object.keys(tableFactsByKey)).toHaveLength(162);
    });

    it('formats and parses keys (3x4 and 4x3 are separate; 12/3 and 12/4 are separate)', () => {
        for (const f of allTableFacts) expect(parseTableKey(f.key)).toEqual(f);
        expect(tableKey('×', 3, 4)).toBe('3x4');
        expect(tableKey('×', 4, 3)).toBe('4x3');
        expect(tableKey('÷', 3, 4)).toBe('12/3');
        expect(tableKey('÷', 4, 3)).toBe('12/4');
        expect(parseTableKey('12/3')).toMatchObject({ op: '÷', a: 3, b: 4, product: 12 });
        expect(parseTableKey('7x8')).toMatchObject({ op: '×', a: 7, b: 8, product: 56 });
    });

    it('rejects malformed keys and never collides with kinder keys', () => {
        for (const k of ['0x3', '10x2', '03x4', '12/5', '5/0', '90/9', '9/10', '3+4', '7-3', '', 'x', '3x']) expect(parseTableKey(k), k).toBeNull();
        for (const f of allTableFacts) expect(parseFactKey(f.key)).toBeNull();
    });

    it('builds the pools of the table skills', () => {
        const keys = (id: string) => tablePoolFor(id).map((f) => f.key);
        expect(tablePoolFor('g_x25').every((f) => f.op === '×' && (f.a === 2 || f.b === 2 || f.a === 5 || f.b === 5))).toBe(true);
        expect(tablePoolFor('g_x25')).toHaveLength(81 - 7 * 7);
        expect(tablePoolFor('g_x34')).toHaveLength(81 - 7 * 7);
        for (const id of ['g_x6', 'g_x7', 'g_x8', 'g_x9']) expect(tablePoolFor(id)).toHaveLength(17);
        expect(tablePoolFor('g_xmix')).toHaveLength(81);
        expect(tablePoolFor('g_d25').every((f) => f.op === '÷' && (f.a === 2 || f.a === 5))).toBe(true);
        expect(tablePoolFor('g_d25')).toHaveLength(18);
        expect(tablePoolFor('g_d34')).toHaveLength(18);
        expect(tablePoolFor('g_d69')).toHaveLength(36);
        expect(tablePoolFor('g_dmix')).toHaveLength(81);
        expect(tablePoolFor('g_review')).toHaveLength(162);
        expect(tablePoolFor('nope')).toEqual([]);
        for (const id of TABLE_LADDER_IDS) expect(new Set(keys(id)).size).toBe(keys(id).length);
        expect(new Set(TABLE_LADDER_IDS.flatMap(keys)).size).toBe(162);
    });

    it('uses 4000 ms for x and 5000 ms for / and nothing for kinder keys', () => {
        expect(tableFastMs('3x4')).toBe(MUL_FAST_MS);
        expect(tableFastMs('12/3')).toBe(DIV_FAST_MS);
        expect(MUL_FAST_MS).toBe(4000);
        expect(DIV_FAST_MS).toBe(5000);
        expect(tableFastMs('3+4')).toBeUndefined();
        expect(tableFastMs('7-3')).toBeUndefined();
    });
});
