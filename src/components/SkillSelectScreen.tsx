import React from 'react';
import { skillsForMode } from '../data/skills';
import { useCurrentUser } from '../store/useGameStore';
import { getMastery, type Mastery } from '../utils/mastery';
import { t, type TranslationKey } from '../utils/i18n';

const KINDER_MASTERY_TIME_MS = 15000;

const masteryLabel: Record<Mastery, TranslationKey> = {
    new: 'masteryNew',
    learning: 'masteryLearning',
    mastered: 'masteryMastered',
};

const masteryClass: Record<Mastery, string> = {
    new: 'bg-neutral-200 text-neutral-700',
    learning: 'bg-amber-200 text-amber-900',
    mastered: 'bg-green-500 text-white',
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
}

export const SkillSelectScreen: React.FC<Props> = ({ onSelect, onBack }) => {
    const user = useCurrentUser();
    if (!user) return null;

    const lang = user.language;
    const isKinder = user.mode === 'kinder';

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 flex flex-col items-center p-4 font-sans">
            <div className="w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={onBack}
                        className="min-h-12 text-amber-900 font-bold text-lg bg-white/70 px-4 rounded-xl border-2 border-amber-900/10"
                    >
                        {t('back', lang)}
                    </button>
                    <div className="text-xl font-black text-amber-800 bg-white/70 px-4 py-2 rounded-xl">
                        {user.avatar} {user.name} · 🪙 {user.coins}
                    </div>
                </div>

                <h1 className="text-3xl font-black text-green-900 text-center mb-4">{t('chooseSkill', lang)}</h1>

                <div className="flex flex-col gap-3">
                    {skillsForMode(user.mode).map((skill) => {
                        const stats = user.skills[skill.id];
                        const mastery = getMastery(stats, isKinder ? KINDER_MASTERY_TIME_MS : undefined);
                        const recent = stats?.recent ?? [];
                        const accuracy = recent.length
                            ? Math.round((recent.filter(Boolean).length / recent.length) * 100)
                            : null;
                        return (
                            <button
                                key={skill.id}
                                onClick={() => onSelect(skill.id)}
                                className={`flex items-center gap-4 w-full px-4 rounded-2xl bg-white/95 border-4 border-[#d4a373] shadow-md text-left transition active:translate-y-1 ${
                                    isKinder ? 'min-h-24' : 'min-h-[72px]'
                                }`}
                            >
                                <span className={isKinder ? 'text-5xl' : 'text-4xl'}>{skillIcon(skill.id)}</span>
                                <span className="flex-1">
                                    <span className={`block font-black text-amber-900 ${isKinder ? 'text-2xl' : 'text-lg'}`}>
                                        {t(skill.nameKey, lang)}
                                    </span>
                                    <span className="block text-sm font-bold text-neutral-600">
                                        {accuracy === null
                                            ? t('noAttempts', lang)
                                            : `${t('accuracy', lang)} ${accuracy}%`}
                                    </span>
                                </span>
                                <span className={`text-sm font-black px-3 py-1 rounded-full ${masteryClass[mastery]}`}>
                                    {t(masteryLabel[mastery], lang)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
