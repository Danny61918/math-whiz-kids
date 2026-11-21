import React, { useEffect, useRef, useState } from 'react';
import { REVIEW_SKILL_ID, skillsForMode, specialSkills, type Skill } from '../data/skills';
import { useCurrentUser } from '../store/useGameStore';
import { getMastery, getSkillMastery, recommendedSkillId, type Mastery } from '../utils/mastery';
import { isAttempted } from '../utils/factProgress';
import { t, tp, type TranslationKey } from '../utils/i18n';
import { isSkillUnlocked } from '../utils/stars';
import { dayKey, displayStreak } from '../utils/streak';

/** The daily review appears once this many facts have been attempted. */
const REVIEW_MIN_FACTS = 10;

const masteryLabel: Record<Mastery, TranslationKey> = {
    new: 'masteryNew',
    learning: 'masteryLearning',
    mastered: 'masteryMastered',
};

const SKILL_ICONS: Record<string, string> = {
    k_plus12: '➕',
    k_doubles: '👯',
    k_make10: '🔟',
    k_family_10: '👪',
    k_near_doubles: '🤝',
    k_plus89: '🚀',
    k_mixed: '🏆',
    k_review: '🔁',
};

function skillIcon(skillId: string): string {
    const special = SKILL_ICONS[skillId];
    if (special) return special;
    if (skillId.includes('_add_')) return '➕';
    if (skillId.includes('_sub_')) return '➖';
    if (skillId.includes('_mul_')) return '✖️';
    return '➗';
}

interface Props {
    onSelect: (skillId: string) => void;
    onBack: () => void;
    onAlbum: () => void;
    onOpenPack: () => void;
    onChart: () => void;
    onBlitz: () => void;
}

export const MapScreen: React.FC<Props> = ({ onSelect, onBack, onAlbum, onOpenPack, onChart, onBlitz }) => {
    const user = useCurrentUser();
    const [shakingId, setShakingId] = useState<string | null>(null);
    const [hint, setHint] = useState(false);
    const [today] = useState(() => dayKey(new Date()));
    const timers = useRef<number[]>([]);

    useEffect(() => {
        const pending = timers.current;
        return () => pending.forEach((id) => window.clearTimeout(id));
    }, []);

    if (!user) return null;

    const tapLocked = (id: string) => {
        setShakingId(id);
        setHint(true);
        timers.current.push(
            window.setTimeout(() => setShakingId(null), 500),
            window.setTimeout(() => setHint(false), 2000),
        );
    };

    const lang = user.language;
    const isKinder = user.mode === 'kinder';
    const list = skillsForMode(user.mode);
    const nodeSize = isKinder ? 'h-24 w-24 text-5xl' : 'h-20 w-20 text-4xl';
    const bigButton = isKinder ? 'min-h-[72px] min-w-[72px]' : 'min-h-12';
    const recommended = isKinder ? recommendedSkillId(list, user.stars, user.facts) : null;
    const attemptedFacts = Object.values(user.facts).filter(isAttempted).length;
    const review = isKinder && attemptedFacts >= REVIEW_MIN_FACTS ? specialSkills.find((s) => s.id === REVIEW_SKILL_ID) : undefined;

    const renderNode = (skill: Skill, unlocked: boolean, offset: string) => {
        const stars = user.stars[skill.id] ?? 0;
        const isRecommended = skill.id === recommended;
        const isCurrent = unlocked && (isRecommended || (!isKinder && stars === 0));
        const mastery = isKinder
            ? getSkillMastery(skill.id, user.facts)
            : getMastery(user.skills[skill.id], undefined);
        const state = !unlocked
            ? 'bg-neutral-300 border-neutral-400 text-neutral-500'
            : stars > 0
              ? 'bg-green-200 border-green-500'
              : 'bg-amber-200 border-amber-500';
        return (
            <div key={skill.id} className={`relative flex flex-col items-center ${offset}`}>
                {isRecommended && (
                    <div className="mb-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-amber-900 shadow">
                        {t('startHere', lang)}
                    </div>
                )}
                <button
                    onClick={() => {
                        if (unlocked) onSelect(skill.id);
                        else tapLocked(skill.id);
                    }}
                    aria-label={`${t(skill.nameKey, lang)}${unlocked ? '' : ` (${t('locked', lang)})`}${isRecommended ? ` - ${t('startHere', lang)}` : ''}`}
                    aria-disabled={!unlocked}
                    data-skill={skill.id}
                    className={`${nodeSize} rounded-full border-8 shadow-lg flex items-center justify-center transition ${state} ${
                        isCurrent ? 'animate-node-pulse' : ''
                    } ${isRecommended ? 'ring-8 ring-yellow-300 shadow-yellow-300' : ''} ${shakingId === skill.id ? 'animate-gentle-shake' : ''}`}
                >
                    {unlocked ? skillIcon(skill.id) : '🔒'}
                </button>
                <div className="mt-1 text-center w-40 bg-white/80 rounded-lg px-2 py-1">
                    <div className={`font-black text-amber-900 leading-tight ${isKinder ? 'text-base' : 'text-sm'}`}>
                        {t(skill.nameKey, lang)}
                    </div>
                    <div className="text-lg leading-none" aria-label={`${stars} / 3`}>
                        {[1, 2, 3].map((n) => (n <= stars ? '⭐' : '☆')).join('')}
                    </div>
                    {unlocked && (isKinder ? mastery !== 'new' || stars > 0 : stars > 0) && (
                        <div className="text-[11px] font-bold text-neutral-600">{t(masteryLabel[mastery], lang)}</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 flex flex-col items-center p-4 font-sans overflow-x-hidden">
            <div className="w-full max-w-md">
                <div className="flex justify-between items-center mb-3 gap-2">
                    <button
                        onClick={onBack}
                        aria-label={t('back', lang)}
                        className={`${bigButton} ${isKinder ? 'text-3xl' : ''} text-amber-900 font-bold text-lg bg-white/70 px-4 rounded-xl border-2 border-amber-900/10`}
                    >
                        {isKinder ? '🏠' : t('back', lang)}
                    </button>
                    <div className="text-lg font-black text-amber-800 bg-white/70 px-3 py-2 rounded-xl truncate">
                        {user.avatar} {user.name}
                    </div>
                    {isKinder && (
                        <button
                            onClick={onChart}
                            aria-label={t('chartButtonLabel', lang)}
                            className="min-h-[72px] min-w-[72px] text-3xl bg-white/70 px-3 rounded-xl border-2 border-amber-900/10"
                        >
                            🧮
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2 mb-3 text-lg font-black text-amber-900">
                    <span className="bg-white/80 rounded-xl px-3 py-2" aria-label={t('myCoinsLabel', lang)}>
                        🪙 {user.coins}
                    </span>
                    <span className="bg-white/80 rounded-xl px-3 py-2" aria-label={t('streakLabel', lang)}>
                        🔥 {displayStreak(user.streak, today)}
                    </span>
                    <button
                        onClick={onOpenPack}
                        aria-label={t('ticketsLabel', lang)}
                        className={`bg-white/80 rounded-xl px-3 border-2 border-amber-300 ${isKinder ? 'min-h-[72px]' : 'min-h-12'}`}
                    >
                        🎫 {user.tickets}
                    </button>
                </div>

                <button
                    onClick={onAlbum}
                    className="w-full min-h-[72px] mb-3 rounded-2xl bg-purple-500 text-white text-2xl font-black border-b-8 border-purple-700 transition active:translate-y-1 active:border-b-4"
                >
                    {t('cardsButton', lang)}
                </button>

                {isKinder && (
                    <button
                        onClick={onBlitz}
                        className="w-full min-h-[72px] mb-4 rounded-2xl bg-orange-500 text-white text-2xl font-black border-b-8 border-orange-700 transition active:translate-y-1 active:border-b-4"
                    >
                        {t('blitzButton', lang)}
                        {user.blitzBest > 0 && <span className="ml-2 text-lg">({tp('blitzBestLabel', lang, { n: user.blitzBest })})</span>}
                    </button>
                )}

                <h1 className="text-2xl font-black text-green-900 text-center mb-2">{t('chooseSkill', lang)}</h1>
                {hint && <p className="text-center font-bold text-amber-800 mb-2">{t('lockedHint', lang)}</p>}

                <div className="relative flex flex-col items-center gap-6 py-4">
                    <div className="absolute top-0 bottom-0 left-1/2 w-3 -translate-x-1/2 rounded-full bg-amber-700/30" aria-hidden="true" />
                    {review && renderNode(review, true, '')}
                    {list.map((skill, i) =>
                        renderNode(skill, isSkillUnlocked(list, user.stars, i), i % 2 === 0 ? '-translate-x-12' : 'translate-x-12'),
                    )}
                </div>
            </div>
        </div>
    );
};
