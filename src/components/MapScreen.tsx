import React, { useEffect, useRef, useState } from 'react';
import { REVIEW_SKILL_ID, skillsForMode, specialSkills, type Skill } from '../data/skills';
import { useCurrentUser } from '../store/useGameStore';
import { getMastery, getSkillMastery, recommendedSkillId, type Mastery } from '../utils/mastery';
import { nameParts } from '../utils/skillName';
import { SkillCard } from './SkillCard';
import { StatChip } from './StatChip';
import { TopBar } from './TopBar';
import { isAttempted } from '../utils/factProgress';
import { t, tp } from '../utils/i18n';
import { isSkillUnlocked } from '../utils/stars';
import { dayKey, displayStreak } from '../utils/streak';

/** The daily review appears once this many facts have been attempted. */
const REVIEW_MIN_FACTS = 10;

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
    const recommended = isKinder ? recommendedSkillId(list, user.stars, user.facts) : null;
    const attemptedFacts = Object.values(user.facts).filter(isAttempted).length;
    const review = isKinder && attemptedFacts >= REVIEW_MIN_FACTS ? specialSkills.find((s) => s.id === REVIEW_SKILL_ID) : undefined;

    // Grade 4 has no recommendation: continue with the first unlocked skill that has no stars yet.
    const continueId =
        recommended ?? (isKinder ? null : (list.find((s, i) => isSkillUnlocked(list, user.stars, i) && (user.stars[s.id] ?? 0) === 0)?.id ?? null));
    const continueSkill = continueId ? list.find((s) => s.id === continueId) : undefined;
    const continueName = continueSkill ? nameParts(t(continueSkill.nameKey, lang)).main : '';

    const renderCard = (skill: Skill, unlocked: boolean) => {
        const isReview = skill.id === REVIEW_SKILL_ID;
        const stars = user.stars[skill.id] ?? 0;
        const mastery: Mastery = isKinder ? getSkillMastery(skill.id, user.facts) : getMastery(user.skills[skill.id], undefined);
        const name = t(skill.nameKey, lang);
        return (
            <SkillCard
                key={skill.id}
                skillId={skill.id}
                name={name}
                icon={skillIcon(skill.id)}
                lang={lang}
                unlocked={unlocked}
                recommended={skill.id === recommended}
                pinned={isReview}
                stars={isReview ? null : stars}
                mastery={mastery}
                shaking={shakingId === skill.id}
                onClick={() => (unlocked ? onSelect(skill.id) : tapLocked(skill.id))}
            />
        );
    };

    const bigBtn = isKinder ? 'min-h-[88px]' : 'min-h-[64px]';
    const trioBtn = `flex ${bigBtn} flex-col items-center justify-center gap-0.5 rounded-[18px] px-1 py-2 text-center text-base font-black leading-tight text-white border-b-[5px] transition active:translate-y-1 active:border-b-0`;

    return (
        <div className="min-h-dvh overflow-x-hidden bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 px-4 pb-10 pt-4 font-sans">
            <div className="mx-auto flex w-full max-w-[672px] flex-col gap-3">
                <TopBar
                    lang={lang}
                    isKinder={isKinder}
                    onBack={onBack}
                    right={
                        <div className="truncate rounded-full bg-white px-4 py-2 text-lg font-black text-amber-950">
                            {user.avatar} {user.name}
                        </div>
                    }
                />

                <div className="flex gap-2">
                    <StatChip icon="🪙" value={user.coins} label={t('myCoinsLabel', lang)} />
                    <StatChip icon="🔥" value={displayStreak(user.streak, today)} label={t('streakLabel', lang)} />
                    <StatChip icon="🎫" value={user.tickets} label={t('ticketsLabel', lang)} onClick={onOpenPack} highlight tall={isKinder} />
                </div>

                <div className={`grid gap-3 ${continueSkill ? 'sm:grid-cols-[1.3fr_2.7fr]' : ''}`}>
                    {continueSkill && (
                        <button
                            onClick={() => onSelect(continueSkill.id)}
                            aria-label={`${t('continueAria', lang)}: ${continueName}`}
                            className={`flex ${isKinder ? 'min-h-[84px]' : 'min-h-[72px]'} flex-col items-center justify-center rounded-[20px] border-b-[6px] border-green-800 bg-green-700 px-4 py-3 text-center text-[22px] font-black leading-tight text-white transition active:translate-y-1 active:border-b-0`}
                        >
                            <span>{t('continueLabel', lang)}</span>
                            <span className="text-base font-bold">{continueName}</span>
                        </button>
                    )}
                    <div className={`grid gap-2.5 ${isKinder ? 'grid-cols-3' : 'grid-cols-1'}`}>
                        <button onClick={onAlbum} className={`${trioBtn} border-purple-800 bg-purple-600`}>
                            <span aria-hidden="true" className="text-3xl leading-none">🃏</span>
                            <span>{t('albumTitle', lang)}</span>
                        </button>
                        {isKinder && (
                            <button onClick={onBlitz} className={`${trioBtn} border-orange-900 bg-orange-700`}>
                                <span aria-hidden="true" className="text-3xl leading-none">⚡</span>
                                <span>{t('blitzTitle', lang)}</span>
                                {user.blitzBest > 0 && <span className="text-sm font-bold">{tp('blitzBestLabel', lang, { n: user.blitzBest })}</span>}
                            </button>
                        )}
                        {isKinder && (
                            <button onClick={onChart} aria-label={t('chartButtonLabel', lang)} className={`${trioBtn} border-cyan-900 bg-cyan-700`}>
                                <span aria-hidden="true" className="text-3xl leading-none">🧮</span>
                                <span>{t('chartTitle', lang)}</span>
                            </button>
                        )}
                    </div>
                </div>

                <h1 className="sr-only">{t('chooseSkill', lang)}</h1>

                <div className="grid gap-2.5 sm:grid-cols-2">
                    {review && renderCard(review, true)}
                    {list.map((skill, i) => renderCard(skill, isSkillUnlocked(list, user.stars, i)))}
                </div>
            </div>

            {hint && (
                <p
                    role="status"
                    className="fixed inset-x-4 bottom-4 z-30 mx-auto max-w-sm rounded-2xl border-2 border-amber-400 bg-white px-4 py-3 text-center text-lg font-black text-amber-950 shadow-xl"
                >
                    {t('lockedHint', lang)}
                </p>
            )}
        </div>
    );
};
