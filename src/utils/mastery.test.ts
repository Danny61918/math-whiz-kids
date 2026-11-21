import { describe, expect, it } from 'vitest';
import type { SkillStats } from '../store/useGameStore';
import { getMastery } from './mastery';

const stats = (over: Partial<SkillStats>): SkillStats => ({
    attempts: 10,
    correct: 10,
    recent: Array<boolean>(10).fill(true),
    avgTimeMs: 8000,
    lastPlayedAt: 0,
    ...over,
});

describe('getMastery', () => {
    it('is new without stats or with < 5 attempts', () => {
        expect(getMastery(undefined)).toBe('new');
        expect(getMastery(stats({ attempts: 4, recent: [true, true, true, true] }))).toBe('new');
    });
    it('is learning with 5 attempts and short history', () => {
        expect(getMastery(stats({ attempts: 5, recent: Array<boolean>(5).fill(true) }))).toBe('learning');
    });
    it('is mastered at 10 recent, 9 correct, fast enough', () => {
        expect(getMastery(stats({}))).toBe('mastered');
        expect(getMastery(stats({ recent: [false, ...Array<boolean>(9).fill(true)] }))).toBe('mastered');
    });
    it('is learning with 2 wrong of last 10', () => {
        expect(getMastery(stats({ recent: [false, false, ...Array<boolean>(8).fill(true)] }))).toBe('learning');
    });
    it('uses the last 10 when recent is longer', () => {
        expect(getMastery(stats({ recent: [false, false, ...Array<boolean>(10).fill(true)] }))).toBe('mastered');
    });
    it('time threshold boundary (default 20000)', () => {
        expect(getMastery(stats({ avgTimeMs: 20000 }))).toBe('mastered');
        expect(getMastery(stats({ avgTimeMs: 20001 }))).toBe('learning');
    });
    it('accepts a custom threshold', () => {
        expect(getMastery(stats({ avgTimeMs: 15000 }), 15000)).toBe('mastered');
        expect(getMastery(stats({ avgTimeMs: 15001 }), 15000)).toBe('learning');
    });
});
