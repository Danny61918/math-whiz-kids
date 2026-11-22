import React, { useEffect, useRef, useState } from 'react';
import { REVIEW_SKILL_ID, TABLE_REVIEW_SKILL, skillsForMode, skillsForTrack, specialSkills, type Skill } from '../data/skills';
import { useCurrentUser } from '../store/useGameStore';
import { getMastery, getSkillMastery, recommendedSkillId, type Mastery } from '../utils/mastery';
import { nameParts } from '../utils/skillName';
import { SkillCard } from './SkillCard';
import { StatChip } from './StatChip';
import { TopBar } from './TopBar';
import { isAttempted } from '../utils/factProgress';
import { t, tp } from '../utils/i18n';
import { isSkillUnlocked } from '../utils/stars';
import { hasTableHistory, isTableTrackSkill, recommendedGrade4SkillId, showTablesHint, tableReviewAvailable } from '../utils/tracks';
import { dayKey, displayStreak } from '../utils/streak';

/** The daily review appears once this many facts have been attempted. */
const REVIEW_MIN_FACTS = 10;
/** Locked table skills shown after the unlocked ones; the rest collapses into one "more to unlock" row. */
const LOCKED_TABLE_PREVIEW = 2;

/** Users who dismissed the first-run times-table check card (until the page is reloaded). */
const dismissedDiagnosticCard = new Set<string>();

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
    if (/^g_x/.test(skillId)) return '✖️';
    if (/^g_d(25|34|69|mix)$/.test(skillId)) return '➗';
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
    onDiagnostic: () => void;
}

export const MapScreen: React.FC<Props> = ({ onSelect, onBack, onAlbum, onOpenPack, onChart, onBlitz, onDiagnostic }) => {
    const user = useCurrentUser();
    const [shakingId, setShakingId] = useState<string | null>(null);
    const [hint, setHint] = useState(false);
    const [cardDismissed, setCardDismissed] = useState(false);
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
    const tableList = skillsForTrack(user.mode, 'table');
    // Kinder: the ladder recommendation. Grade 4: the cross-track rule (table track first, see tracks.ts).
    const recommended = isKinder ? recommendedSkillId(list, user.stars, user.facts) : recommendedGrade4SkillId(user.stars, user.facts, today);
    const attemptedFacts = Object.values(user.facts).filter(isAttempted).length;
    const review = isKinder && attemptedFacts >= REVIEW_MIN_FACTS ? specialSkills.find((s) => s.id === REVIEW_SKILL_ID) : undefined;
    const tableReview = !isKinder && tableReviewAvailable(user.facts, today) ? TABLE_REVIEW_SKILL : undefined;
    const showDiagnosticCard = !isKinder && !hasTableHistory(user.facts) && !cardDismissed && !dismissedDiagnosticCard.has(user.id);

    const continueId = recommended;
    const continueSkill = continueId ? [...list, ...tableList, TABLE_REVIEW_SKILL].find((s) => s.id === continueId) : undefined;
    const continueName = continueSkill ? nameParts(t(continueSkill.nameKey, lang)).main : '';

    const renderCard = (skill: Skill, unlocked: boolean) => {
        const isReview = skill.id === REVIEW_SKILL_ID || skill.id === TABLE_REVIEW_SKILL.id;
        const stars = user.stars[skill.id] ?? 0;
        const mastery: Mastery = isKinder || isTableTrackSkill(skill.id) ? getSkillMastery(skill.id, user.facts) : getMastery(user.skills[skill.id], undefined);
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
                hint={!isKinder && showTablesHint(skill.id, user.stars) ? t('tablesHint', lang) : undefined}
                onClick={() => (unlocked ? onSelect(skill.id) : tapLocked(skill.id))}
            />
        );
    };

    // Table track: every unlocked skill, the next LOCKED_TABLE_PREVIEW locked ones, then one "more to unlock" row.
    const tableCards: React.ReactNode[] = [];
    let lockedShown = 0;
    let hiddenLocked = 0;
    tableList.forEach((skill, i) => {
        const unlocked = isSkillUnlocked(tableList, user.stars, i);
        if (!unlocked && lockedShown >= LOCKED_TABLE_PREVIEW) {
            hiddenLocked++;
            return;
        }
        if (!unlocked) lockedShown++;
        tableCards.push(renderCard(skill, unlocked));
    });
    if (hiddenLocked > 0) {
        tableCards.push(
            <div key="more" className="flex min-h-[48px] items-center justify-center rounded-[18px] border-[3px] border-dashed border-slate-500 bg-white/80 px-3 py-2 text-center text-base font-extrabold text-slate-800 sm:col-span-2">
                🔒 {tp('moreToUnlock', lang, { n: hiddenLocked })}
            </div>,
        );
    }

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
                    <div className="grid grid-cols-3 gap-2.5">
                        <button onClick={onAlbum} className={`${trioBtn} border-purple-800 bg-purple-600`}>
                            <span aria-hidden="true" className="text-3xl leading-none">🃏</span>
                            <span>{t('albumTitle', lang)}</span>
                        </button>
                        <button onClick={onBlitz} className={`${trioBtn} border-orange-900 bg-orange-700`}>
                            <span aria-hidden="true" className="text-3xl leading-none">⚡</span>
                            <span>{t('blitzTitle', lang)}</span>
                            {user.blitzBest > 0 && <span className="text-sm font-bold">{tp('blitzBestLabel', lang, { n: user.blitzBest })}</span>}
                        </button>
                        <button onClick={onChart} aria-label={t(isKinder ? 'chartButtonLabel' : 'timesChartButtonLabel', lang)} className={`${trioBtn} border-cyan-900 bg-cyan-700`}>
                            <span aria-hidden="true" className="text-3xl leading-none">{isKinder ? '🧮' : '✖️'}</span>
                            <span>{t(isKinder ? 'chartTitle' : 'timesChartTitle', lang)}</span>
                        </button>
                    </div>
                </div>

                <h1 className="sr-only">{t('chooseSkill', lang)}</h1>

                {isKinder ? (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                        {review && renderCard(review, true)}
                        {list.map((skill, i) => renderCard(skill, isSkillUnlocked(list, user.stars, i)))}
                    </div>
                ) : (
                    <>
                        {showDiagnosticCard && (
                            <div role="region" aria-label={t('diagCardTitle', lang)} className="rounded-[18px] border-[3px] border-sky-300 bg-white p-3 text-amber-950">
                                <p className="text-lg font-black leading-tight">{t('diagCardTitle', lang)}</p>
                                <p className="mt-0.5 text-base font-semibold leading-snug">{t('diagCardBody', lang)}</p>
                                <div className="mt-2 flex gap-2">
                                    <button onClick={onDiagnostic} className="min-h-[48px] flex-1 rounded-2xl border-b-[5px] border-sky-900 bg-sky-700 px-3 text-base font-black text-white transition active:translate-y-1 active:border-b-0">
                                        {t('diagButton', lang)}
                                    </button>
                                    <button
                                        onClick={() => {
                                            dismissedDiagnosticCard.add(user.id);
                                            setCardDismissed(true);
                                        }}
                                        className="min-h-[48px] rounded-2xl border-2 border-slate-300 bg-slate-100 px-4 text-base font-black text-amber-950"
                                    >
                                        {t('diagCardDismiss', lang)}
                                    </button>
                                </div>
                            </div>
                        )}

                        <section aria-labelledby="table-track-title" className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <h2 id="table-track-title" className="text-xl font-black leading-tight text-amber-950">
                                    {t('tableTrackTitle', lang)}
                                </h2>
                                <button onClick={onDiagnostic} className="min-h-[48px] shrink-0 rounded-2xl border-b-[5px] border-sky-900 bg-sky-700 px-3 text-base font-black text-white transition active:translate-y-1 active:border-b-0">
                                    🔍 {t('diagButton', lang)}
                                </button>
                            </div>
                            <div className="grid gap-2.5 sm:grid-cols-2">
                                {tableReview && renderCard(tableReview, true)}
                                {tableCards}
                            </div>
                        </section>

                        <section aria-labelledby="big-numbers-title" className="flex flex-col gap-2.5">
                            <h2 id="big-numbers-title" className="text-xl font-black leading-tight text-amber-950">
                                {t('bigNumbersTitle', lang)}
                            </h2>
                            <div className="grid gap-2.5 sm:grid-cols-2">
                                {list.map((skill, i) => renderCard(skill, isSkillUnlocked(list, user.stars, i)))}
                            </div>
                        </section>
                    </>
                )}
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
