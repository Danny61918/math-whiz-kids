import React, { useEffect, useId, useRef, useState } from 'react';
import { factsByKey, factKey, type FactKey } from '../data/facts';
import { useCurrentUser, useGameStore } from '../store/useGameStore';
import { CHART_MILESTONES, CHART_SIZE, chartMasteredCount, claimId, milestoneThreshold, pendingMilestones, type ChartId } from '../utils/chart';
import { factLevel, type FactLevel, type FactStats } from '../utils/factProgress';
import { t, tp, type TranslationKey } from '../utils/i18n';
import { useModal } from '../utils/useModal';

const LEVEL_LABEL: Record<FactLevel, TranslationKey> = {
    unseen: 'levelUnseen',
    learning: 'levelLearning',
    solid: 'levelSolid',
    mastered: 'levelMastered',
};

const LEVEL_CELL: Record<FactLevel, string> = {
    unseen: 'bg-neutral-200 border-neutral-300',
    learning: 'bg-yellow-200 border-yellow-400',
    solid: 'bg-green-300 border-green-500',
    mastered: 'bg-sky-300 border-sky-500 text-sky-900',
};

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

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
                className="w-full max-w-xs rounded-3xl border-[6px] border-[#d4a373] bg-white p-5 text-center shadow-2xl"
            >
                <h2 id={titleId} className="mb-2 text-4xl font-black text-amber-900">
                    {equation}
                </h2>
                <p className="text-xl font-bold text-amber-800">{t(LEVEL_LABEL[level], lang)}</p>
                <p className="mt-1 text-lg font-bold text-neutral-600">
                    {stats?.bestMs != null ? tp('factBestTime', lang, { s: (stats.bestMs / 1000).toFixed(1) }) : t('factNoBestTime', lang)}
                </p>
                {level !== 'mastered' && <p className="mt-2 text-base font-bold text-purple-700">{t('practiceHint', lang)}</p>}
                <button
                    data-autofocus
                    onClick={onClose}
                    className="mt-4 min-h-[72px] w-full rounded-2xl border-b-8 border-amber-400 bg-amber-200 text-2xl font-black text-amber-900 transition active:translate-y-1 active:border-b-4"
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
        `min-h-[72px] flex-1 rounded-2xl border-b-8 text-2xl font-black transition active:translate-y-1 active:border-b-4 ${
            chart === id ? 'border-purple-700 bg-purple-500 text-white' : 'border-amber-400 bg-amber-100 text-amber-900'
        }`;

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 p-4 font-sans">
            <div className="mx-auto w-full max-w-md">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                        onClick={onBack}
                        aria-label={t('back', lang)}
                        className="min-h-[72px] min-w-[72px] rounded-xl border-2 border-amber-900/10 bg-white/70 px-4 text-3xl font-bold text-amber-900"
                    >
                        🏠
                    </button>
                    <h1 className="text-2xl font-black text-green-900">{t('chartTitle', lang)}</h1>
                    <div className="min-w-[72px]" aria-hidden="true" />
                </div>

                {toast > 0 && (
                    <div role="status" data-testid="chart-toast" className="mb-3 rounded-2xl bg-yellow-200 px-3 py-3 text-center text-xl font-black text-amber-900">
                        🎉 {tp('chartTicketsEarned', lang, { n: toast })}
                    </div>
                )}

                <div role="tablist" className="mb-3 flex gap-3">
                    <button role="tab" aria-selected={chart === 'add'} onClick={() => setChart('add')} className={tabClass('add')}>
                        {t('chartTabAdd', lang)}
                    </button>
                    <button role="tab" aria-selected={chart === 'sub'} onClick={() => setChart('sub')} className={tabClass('sub')}>
                        {t('chartTabSub', lang)}
                    </button>
                </div>

                <div className="mb-3 rounded-2xl bg-white/80 p-3">
                    <div className="mb-1 text-center text-2xl font-black text-amber-900" data-testid="chart-progress">
                        {tp('chartProgress', lang, { n: mastered })}
                    </div>
                    <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={CHART_SIZE}
                        aria-valuenow={mastered}
                        className="h-3 w-full overflow-hidden rounded-full bg-amber-100"
                    >
                        <div className="h-full rounded-full bg-sky-400" style={{ width: `${(mastered / CHART_SIZE) * 100}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between gap-1 text-sm font-black">
                        {CHART_MILESTONES.map((m) => {
                            const done = user.chartClaims.includes(claimId(chart, m.pct));
                            return (
                                <span
                                    key={m.pct}
                                    title={`${milestoneThreshold(m.pct)} / ${CHART_SIZE}`}
                                    className={`rounded-full px-2 py-1 ${done ? 'bg-green-200 text-green-900' : 'bg-neutral-200 text-neutral-600'}`}
                                >
                                    {tp(done ? 'chartMilestoneDone' : 'chartMilestone', lang, { pct: m.pct })}
                                </span>
                            );
                        })}
                    </div>
                </div>

                <div role="group" aria-label={t(chart === 'add' ? 'chartTabAdd' : 'chartTabSub', lang)} className="grid grid-cols-10 gap-[2px]">
                    <div aria-hidden="true" />
                    {NUMBERS.map((b) => (
                        <div key={b} aria-hidden="true" className="flex aspect-square items-center justify-center text-sm font-black text-amber-900">
                            {b}
                        </div>
                    ))}
                    {NUMBERS.map((a) => (
                        <React.Fragment key={a}>
                            <div aria-hidden="true" className="flex aspect-square items-center justify-center text-sm font-black text-amber-900">
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
                                        className={`flex aspect-square min-h-8 min-w-8 items-center justify-center rounded-md border-2 text-xs font-black leading-none ${LEVEL_CELL[level]}`}
                                    >
                                        {level === 'mastered' && fact ? (
                                            <span className="flex flex-col items-center">
                                                <span aria-hidden="true" className="text-[8px] leading-none">✨</span>
                                                <span className="text-sm leading-none">{chart === 'add' ? fact.sum : fact.b}</span>
                                            </span>
                                        ) : null}
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
