import React from 'react';
import { t, tp, type Language } from '../utils/i18n';
import type { Mastery } from '../utils/mastery';
import { nameParts } from '../utils/skillName';
import { StarRating } from './StarRating';

const PILL: Record<Mastery, { icon: string; key: 'pillNew' | 'pillLearning' | 'pillMastered'; cls: string }> = {
    new: { icon: '🌱', key: 'pillNew', cls: 'bg-slate-100 text-slate-800' },
    learning: { icon: '✏️', key: 'pillLearning', cls: 'bg-amber-100 text-amber-900' },
    mastered: { icon: '🏅', key: 'pillMastered', cls: 'bg-green-100 text-green-900' },
};

interface Props {
    skillId: string;
    name: string;
    icon: string;
    lang: Language;
    unlocked: boolean;
    recommended?: boolean;
    pinned?: boolean;
    /** null hides the stars and the status pill (daily review). */
    stars: number | null;
    mastery: Mastery;
    shaking?: boolean;
    /** Small soft-nudge chip (never blocks the card). */
    hint?: string;
    onClick: () => void;
}

/** One skill in the map list: icon, name, stars and a status pill on an opaque card. */
export const SkillCard: React.FC<Props> = ({ skillId, name, icon, lang, unlocked, recommended = false, pinned = false, stars, mastery, shaking = false, hint, onClick }) => {
    const { main, example } = nameParts(name);
    const surface = !unlocked
        ? 'border-slate-300 bg-slate-100 text-slate-700'
        : recommended
          ? 'border-yellow-400 bg-yellow-50 text-amber-950'
          : pinned
            ? 'border-blue-200 bg-blue-50 text-amber-950'
            : 'border-transparent bg-white text-amber-950';
    const pill = PILL[mastery];
    return (
        <button
            onClick={onClick}
            aria-label={[
                name,
                unlocked && stars !== null ? tp('starsOf', lang, { n: stars }) : '',
                unlocked ? (stars !== null ? t(pill.key, lang) : '') : t('locked', lang),
                recommended ? t('startHere', lang) : '',
                hint && unlocked ? hint : '',
            ]
                .filter(Boolean)
                .join(', ')}
            aria-disabled={!unlocked}
            data-skill={skillId}
            className={`grid min-h-[88px] w-full grid-cols-[56px_1fr] items-center gap-3 rounded-[18px] border-[3px] p-3 text-left shadow-sm transition active:translate-y-0.5 ${surface} ${
                shaking ? 'animate-gentle-shake' : ''
            }`}
        >
            <span
                aria-hidden="true"
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-[32px] leading-none ${unlocked ? 'bg-green-100' : 'bg-slate-200'}`}
            >
                {unlocked ? icon : '🔒'}
            </span>
            <span className="min-w-0">
                <span className="block text-[19px] font-black leading-tight">
                    {main}
                    {recommended && (
                        <span className="ml-1.5 inline-block rounded-lg bg-yellow-400 px-2 py-0.5 align-middle text-sm font-black text-amber-950">
                            {t('startHere', lang)}
                        </span>
                    )}
                </span>
                {example && <span className="block text-sm font-semibold leading-tight text-stone-700">{example}</span>}
                {hint && unlocked && (
                    <span className="mt-1 inline-block rounded-lg bg-sky-100 px-2 py-0.5 text-sm font-extrabold leading-tight text-sky-950">💡 {hint}</span>
                )}
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {unlocked && stars !== null && <StarRating value={stars} size={28} label={tp('starsOf', lang, { n: stars })} />}
                    {!unlocked && (
                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-sm font-extrabold text-slate-800">🔒 {t('locked', lang)}</span>
                    )}
                    {unlocked && stars !== null && (
                        <span className={`rounded-full px-2.5 py-0.5 text-sm font-extrabold ${pill.cls}`}>
                            <span aria-hidden="true">{pill.icon} </span>
                            {t(pill.key, lang)}
                        </span>
                    )}
                </span>
            </span>
        </button>
    );
};
