import { describe, expect, it } from 'vitest';
import { arrayLayout, arrayShape } from './arrayLayout';
import { fullEquation } from './equation';
import { allTableFacts } from '../data/tableFacts';
import { questionFromTableFact } from './selection';

describe('arrayLayout', () => {
    it('uses the smaller factor as rows', () => {
        expect(arrayShape(7, 3)).toEqual({ rows: 3, cols: 7 });
        expect(arrayShape(4, 9)).toEqual({ rows: 4, cols: 9 });
    });
    it('keeps dots >= 12 px for small facts and switches to groups for 9 x 9 on a short phone', () => {
        expect(arrayLayout(3, 4, 312, 128).compact).toBe(false);
        expect(arrayLayout(9, 9, 312, 128).compact).toBe(true);
        expect(arrayLayout(9, 9, 312, 170).compact).toBe(false);
        expect(arrayLayout(9, 9, 312, 170).dot).toBeGreaterThanOrEqual(12);
    });
});

describe('fullEquation', () => {
    it('fills the missing slot for every form', () => {
        const mul = allTableFacts.find((f) => f.key === '7x8');
        const div = allTableFacts.find((f) => f.key === '12/3');
        if (!mul || !div) throw new Error('missing fact');
        expect(fullEquation(questionFromTableFact('s', mul, 'direct'))).toBe('7 × 8 = 56');
        expect(fullEquation(questionFromTableFact('s', mul, 'missingMul'))).toBe('7 × 8 = 56');
        expect(fullEquation(questionFromTableFact('s', div, 'direct'))).toBe('12 ÷ 3 = 4');
        expect(fullEquation(questionFromTableFact('s', div, 'missingMul'))).toBe('3 × 4 = 12');
        expect(fullEquation(questionFromTableFact('s', div, 'missingDiv'))).toBe('12 ÷ 3 = 4');
    });
});
