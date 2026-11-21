import React, { useEffect, useId, useRef, useState } from 'react';
import { factsByKey, factKey, type FactKey } from '../data/facts';
import { useCurrentUser, useGameStore } from '../store/useGameStore';
import { CHART_MILESTONES, CHART_SIZE, chartMasteredCount, claimId, milestoneThreshold, pendingMilestones, type ChartId } from '../utils/chart';
import { factLevel, type FactLevel, type FactStats } from '../utils/factProgress';
import { t, tp, type TranslationKey } from '../utils/i18n';
import { useModal } from '../utils/useModal';
import { STAR_PATH } from '../utils/starPath';
import { TopBar } from './TopBar';

const LEVEL_LABEL: Record<FactLevel, TranslationKey> = {
    unseen: 'levelUnseen',
    learning: 'levelLearning',
    solid: 'levelSolid',
    mastered: 'levelMastered',
};

/** Cell colour + symbol per level, shared by the grid and the legend (symbols keep the state readable without colour). */
const LEVEL_STYLE: Record<FactLevel, { box: string; symbol: string }> = {
    unseen: { box: 'bg-[#E6EAEE] border-[#B8C2CC] text-[#5B6673]', symbol: '' },
    learning: { box: 'bg-[#FFF08A] border-[#E0A800] text-[#6B4700]', symbol: '•' },
    solid: { box: 'bg-[#7FEFA3] border-[#16A34A] text-[#0A5C2A]', symbol: '✓' },
    mastered: { box: 'bg-[#7DD3FC] border-[#0284C7] text-[#052F47]', symbol: '' },
};

const LEGEND_LEVELS: { level: FactLevel; key: TranslationKey }[] = [
    { level: 'unseen', key: 'legendUnseen' },
    { level: 'learning', key: 'legendLearning' },
    { level: 'solid', key: 'legendSolid' },
    { level: 'mastered', key: 'legendMastered' },
];

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Small star shape (not a text glyph) marking a mastered cell. */
const CornerStar: React.FC<{ size: number }> = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
            d={STAR_PATH}
            fill="#F5B301"
            stroke="#8A5A00"
            strokeWidth="1.6"
            strokeLinejoin="round"
        />
    </svg>
);

interface Selected {
    a: number;
    b: number;
}

const FactDialog: React.FC<{
    chart: ChartId;
    selected: Selected;
    stats: FactStats | undefined;
    lang: 'en' | 'zh-TW';
    onClose: () => void;
}> = ({ chart, selected, stats, lang, onClose }) => {
    const ref = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useModal(ref, onClose);
    const { a, b } = selected;
    const level = factLevel(stats);
    const equation = chart === 'add' ? `${a} + ${b} = ${level === 'unseen' ? '?' : a + b}` : `${a + b} - ${a} = ${level === 'unseen' ? '?' : b}`;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                ref={ref}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-3xl border-[6px] border-[#d4a373] bg-white p-5 text-center shadow-2xl"
            >
                <h2 id={titleId} className="mb-2 text-4xl font-black text-amber-950">
                    {equation}
                </h2>
                <p className="text-xl font-bold text-amber-900">{t(LEVEL_LABEL[level], lang)}</p>
                <p className="mt-1 text-lg font-bold text-stone-700">
                    {stats?.bestMs != null ? tp('factBestTime', lang, { s: (stats.bestMs / 1000).toFixed(1) }) : t('factNoBestTime', lang)}
                </p>
                {level !== 'mastered' && <p className="mt-2 text-lg font-bold text-purple-800">{t('practiceHint', lang)}</p>}
                <button
                    data-autofocus
                    onClick={onClose}
                    className="mt-4 min-h-[72px] w-full rounded-2xl border-b-8 border-amber-400 bg-amber-200 text-2xl font-black text-amber-950 transition active:translate-y-1 active:border-b-4"
                >
                    {t('close', lang)}
                </button>
            </div>
        </div>
    );
};

export const NumberChartScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const user = useCurrentUser();
    const claimChartMilestones = useGameStore((s) => s.claimChartMilestones);
    const [chart, setChart] = useState<ChartId>('add');
    const [selected, setSelected] = useState<Selected | null>(null);
    // Tickets that this visit pays out (computed once on open, before the claim below).
    const [toast] = useState(() => {
        const { users, currentUserId } = useGameStore.getState();
        const u = currentUserId ? users[currentUserId] : undefined;
        return u ? pendingMilestones(u.facts, u.chartClaims).reduce((sum, m) => sum + m.tickets, 0) : 0;
    });

    // Claim anything reached but not yet paid out (idempotent).
    useEffect(() => {
        claimChartMilestones();
    }, [claimChartMilestones]);

    if (!user) return null;
    const lang = user.language;
    const op = chart === 'add' ? '+' : '-';
    const keyOf = (a: number, b: number): FactKey => factKey(op, a, b);
    const mastered = chartMasteredCount(user.facts, chart);
    const tabClass = (id: ChartId) =>
        `min-h-[72px] flex-1 rounded-2xl border-b-[6px] text-xl font-black transition active:translate-y-1 active:border-b-2 ${
            chart === id ? 'border-purple-800 bg-purple-600 text-white' : 'border-yellow-500 bg-yellow-100 text-amber-950'
        }`;

    return (
        <div className="min-h-dvh overflow-x-hidden bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 px-4 pb-8 pt-4 font-sans">
            <div className="mx-auto flex w-full max-w-[672px] flex-col gap-3">
                <TopBar lang={lang} isKinder onBack={onBack} title={t('chartTitle', lang)} />

                {toast > 0 && (
                    <div role="status" data-testid="chart-toast" className="rounded-2xl bg-yellow-200 px-3 py-3 text-center text-xl font-black text-amber-950">
                        🎉 {tp('chartTicketsEarned', lang, { n: toast })}
                    </div>
                )}

                <div role="tablist" className="flex gap-3">
                    <button role="tab" aria-selected={chart === 'add'} onClick={() => setChart('add')} className={tabClass('add')}>
                        {t('chartTabAdd', lang)}
                    </button>
                    <button role="tab" aria-selected={chart === 'sub'} onClick={() => setChart('sub')} className={tabClass('sub')}>
                        {t('chartTabSub', lang)}
                    </button>
                </div>

                <div className="rounded-[18px] bg-white p-3">
                    <div className="mb-1 text-center text-[30px] font-black leading-tight text-amber-950" data-testid="chart-progress">
                        {tp('chartProgress', lang, { n: mastered })}
                    </div>
                    <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={CHART_SIZE}
                        aria-valuenow={mastered}
                        className="h-4 w-full overflow-hidden rounded-full bg-amber-100"
                    >
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${(mastered / CHART_SIZE) * 100}%` }} />
                    </div>
                    <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-sm font-black">
                        {CHART_MILESTONES.map((m) => {
                            const done = user.chartClaims.includes(claimId(chart, m.pct));
                            return (
                                <span
                                    key={m.pct}
                                    title={`${milestoneThreshold(m.pct)} / ${CHART_SIZE}`}
                                    className={`rounded-xl border-2 px-1 py-1.5 text-center leading-tight ${
                                        done ? 'border-green-600 bg-green-100 text-green-900' : 'border-transparent bg-slate-100 text-slate-800'
                                    }`}
                                >
                                    {tp(done ? 'chartMilestoneDone' : 'chartMilestone', lang, { pct: m.pct })}
                                </span>
                            );
                        })}
                    </div>
                </div>

                <ul className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl bg-white px-3 py-2.5">
                    {LEGEND_LEVELS.map(({ level, key }) => (
                        <li key={level} className="flex items-center gap-2 text-base font-bold text-amber-950">
                            <span
                                aria-hidden="true"
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 text-base font-black leading-none ${LEVEL_STYLE[level].box}`}
                            >
                                {level === 'mastered' ? <CornerStar size={16} /> : LEVEL_STYLE[level].symbol}
                            </span>
                            {t(key, lang)}
                        </li>
                    ))}
                </ul>

                <div
                    role="group"
                    aria-label={t(chart === 'add' ? 'chartTabAdd' : 'chartTabSub', lang)}
                    className="-mx-3 grid grid-cols-[16px_repeat(9,minmax(0,1fr))] gap-px sm:mx-auto sm:w-full sm:max-w-[560px] sm:grid-cols-[28px_repeat(9,minmax(0,1fr))] sm:gap-1"
                >
                    <div aria-hidden="true" />
                    {NUMBERS.map((b) => (
                        <div key={b} aria-hidden="true" className="flex h-7 items-center justify-center text-base font-black text-amber-950">
                            {b}
                        </div>
                    ))}
                    {NUMBERS.map((a) => (
                        <React.Fragment key={a}>
                            <div aria-hidden="true" className="flex items-center justify-center text-base font-black text-amber-950">
                                {a}
                            </div>
                            {NUMBERS.map((b) => {
                                const stats = user.facts[keyOf(a, b)];
                                const level = factLevel(stats);
                                const fact = factsByKey[keyOf(a, b)];
                                return (
                                    <button
                                        key={b}
                                        onClick={() => setSelected({ a, b })}
                                        aria-label={`${chart === 'add' ? `${a} + ${b}` : `${a + b} - ${a}`}: ${t(LEVEL_LABEL[level], lang)}`}
                                        data-level={level}
                                        className={`relative flex aspect-square w-full items-center justify-center rounded-lg border-2 text-lg font-black leading-none ${LEVEL_STYLE[level].box}`}
                                    >
                                        {level === 'mastered' && fact ? (
                                            <>
                                                <span>{chart === 'add' ? fact.sum : fact.b}</span>
                                                <span className="absolute -right-1 -top-1.5">
                                                    <CornerStar size={14} />
                                                </span>
                                            </>
                                        ) : (
                                            LEVEL_STYLE[level].symbol
                                        )}
                                    </button>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {selected && (
                <FactDialog
                    chart={chart}
                    selected={selected}
                    stats={user.facts[keyOf(selected.a, selected.b)]}
                    lang={lang}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
};
