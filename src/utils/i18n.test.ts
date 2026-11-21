import { describe, expect, it } from 'vitest';
import { skills } from '../data/skills';
import { t, translations } from './i18n';

describe('i18n', () => {
    it('has identical key sets in both languages', () => {
        expect(Object.keys(translations['zh-TW']).sort()).toEqual(Object.keys(translations.en).sort());
    });
    it('has no empty strings', () => {
        for (const lang of ['zh-TW', 'en'] as const) {
            for (const value of Object.values(translations[lang])) expect(value.length).toBeGreaterThan(0);
        }
    });
    it('has a name for every skill', () => {
        for (const s of skills) {
            expect(t(s.nameKey, 'en')).not.toBe(s.nameKey);
            expect(t(s.nameKey, 'zh-TW')).not.toBe(s.nameKey);
        }
    });
});
