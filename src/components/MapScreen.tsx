import React, { useState } from 'react';
import { skillsForMode } from '../data/skills';
import { useCurrentUser } from '../store/useGameStore';
import { getMastery, type Mastery } from '../utils/mastery';
import { t, type TranslationKey } from '../utils/i18n';
import { isSkillUnlocked } from '../utils/stars';

const KINDER_MASTERY_TIME_MS = 15000;

const masteryLabel: Record<Mastery, TranslationKey> = {
    new: 'masteryNew',
    learning: 'masteryLearning',
    mastered: 'masteryMastered',
};

function skillIcon(skillId: string): string {
    if (skillId.includes('make10')) return '🔟';
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
}

export const MapScreen: React.FC<Props> = ({ onSelect, onBack, onAlbum, onOpenPack }) => {
    const user = useCurrentUser();
    const [shakingId, setShakingId] = useState<string | null>(null);
    if (!user) return null;

    const lang = user.language;
    const isKinder = user.mode === 'kinder';
    const list = skillsForMode(user.mode);
    const nodeSize = isKinder ? 'h-24 w-24 text-5xl' : 'h-20 w-20 text-4xl';

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 flex flex-col items-center p-4 font-sans overflow-x-hidden">
            <div className="w-full max-w-md">
                <div className="flex justify-between items-center mb-3 gap-2">
                    <button
                        onClick={onBack}
                        aria-label={t('back', lang)}
                        className="min-h-12 text-amber-900 font-bold text-lg bg-white/70 px-4 rounded-xl border-2 border-amber-900/10"
                    >
                        {isKinder ? '🏠' : t('back', lang)}
                    </button>
                    <div className="text-lg font-black text-amber-800 bg-white/70 px-3 py-2 rounded-xl truncate">
                        {user.avatar} {user.name}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 mb-3 text-lg font-black text-amber-900">
                    <span className="bg-white/80 rounded-xl px-3 py-2" aria-label={t('myCoinsLabel', lang)}>
                        🪙 {user.coins}
                    </span>
                    <span className="bg-white/80 rounded-xl px-3 py-2" aria-label={t('streakLabel', lang)}>
                        🔥 {user.streak.count}
                    </span>
                    <button
                        onClick={onOpenPack}
                        aria-label={t('ticketsLabel', lang)}
                        className="bg-white/80 rounded-xl px-3 min-h-12 border-2 border-amber-300"
                    >
                        🎫 {user.tickets}
                    </button>
                </div>

                <button
                    onClick={onAlbum}
                    className="w-full min-h-[72px] mb-4 rounded-2xl bg-purple-500 text-white text-2xl font-black border-b-8 border-purple-700 transition active:translate-y-1 active:border-b-4"
                >
                    {t('cardsButton', lang)}
                </button>

                <h1 className="text-2xl font-black text-green-900 text-center mb-2">{t('chooseSkill', lang)}</h1>
                {shakingId && <p className="text-center font-bold text-amber-800 mb-2">{t('lockedHint', lang)}</p>}

                <div className="relative flex flex-col items-center gap-6 py-4">
                    <div className="absolute top-0 bottom-0 left-1/2 w-3 -translate-x-1/2 rounded-full bg-amber-700/30" aria-hidden="true" />
                    {list.map((skill, i) => {
                        const unlocked = isSkillUnlocked(list, user.stars, i);
                        const stars = user.stars[skill.id] ?? 0;
                        const isCurrent = unlocked && stars === 0;
                        const mastery = getMastery(user.skills[skill.id], isKinder ? KINDER_MASTERY_TIME_MS : undefined);
                        const offset = i % 2 === 0 ? '-translate-x-12' : 'translate-x-12';
                        const state = !unlocked
                            ? 'bg-neutral-300 border-neutral-400 text-neutral-500'
                            : stars > 0
                              ? 'bg-green-200 border-green-500'
                              : 'bg-amber-200 border-amber-500';
                        return (
                            <div key={skill.id} className={`relative flex flex-col items-center ${offset}`}>
                                <button
                                    onClick={() => {
                                        if (unlocked) onSelect(skill.id);
                                        else setShakingId(skill.id);
                                    }}
                                    onAnimationEnd={() => setShakingId(null)}
                                    aria-label={`${t(skill.nameKey, lang)}${unlocked ? '' : ' 🔒'}`}
                                    aria-disabled={!unlocked}
                                    className={`${nodeSize} rounded-full border-8 shadow-lg flex items-center justify-center transition ${state} ${
                                        isCurrent ? 'animate-node-pulse' : ''
                                    } ${shakingId === skill.id ? 'animate-gentle-shake' : ''}`}
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
                                    {unlocked && stars > 0 && (
                                        <div className="text-[11px] font-bold text-neutral-600">{t(masteryLabel[mastery], lang)}</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
