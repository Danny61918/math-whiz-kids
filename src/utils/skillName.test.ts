import { describe, expect, it } from 'vitest';
import { nameParts } from './skillName';

describe('nameParts', () => {
    it('splits an ASCII parenthetical', () => {
        expect(nameParts('Doubles (e.g. 3+3)')).toEqual({ main: 'Doubles', example: '(e.g. 3+3)' });
    });
    it('splits a full-width parenthetical', () => {
        expect(nameParts('雙胞胎數（例：3+3）')).toEqual({ main: '雙胞胎數', example: '（例：3+3）' });
    });
    it('returns the whole name when there is no parenthetical', () => {
        expect(nameParts('Make 10')).toEqual({ main: 'Make 10', example: '' });
    });
    it('trims the space before the example', () => {
        expect(nameParts('Near doubles   (6+7)')).toEqual({ main: 'Near doubles', example: '(6+7)' });
    });
});
