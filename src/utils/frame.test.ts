import { describe, expect, it } from 'vitest';
import { parseFactKey } from '../data/facts';
import { frameCells } from './frame';
import { questionFromFact } from './selection';

const q = (key: string, kind: 'sum' | 'diff' | 'missing') => {
    const fact = parseFactKey(key);
    if (!fact) throw new Error(key);
    return questionFromFact('k_mixed', fact, kind);
};

describe('frameCells', () => {
    it('addition: first group colour A, second colour B', () => {
        expect(frameCells(q('3+2', 'sum'))).toEqual(['a', 'a', 'a', 'b', 'b']);
    });
    it('subtraction: minuend filled, last cells crossed', () => {
        expect(frameCells(q('7-3', 'diff'))).toEqual(['a', 'a', 'a', 'a', 'crossed', 'crossed', 'crossed']);
        expect(frameCells(q('7-3', 'diff'))).toHaveLength(7);
    });
    it('missing addend: left filled, the rest outlined up to the total', () => {
        expect(frameCells(q('4+6', 'missing'))).toEqual(['a', 'a', 'a', 'a', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty']);
    });
    it('never needs more than two frames (20 cells)', () => {
        for (const op of ['+', '-'] as const) {
            for (const kind of op === '+' ? (['sum', 'missing'] as const) : (['diff'] as const)) {
                expect(frameCells(q(op === '+' ? '9+9' : '18-9', kind)).length).toBeLessThanOrEqual(20);
            }
        }
    });
});
