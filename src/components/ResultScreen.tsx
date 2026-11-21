import React, { useEffect, useState } from 'react';
import type { SessionSummary, UserProfile } from '../store/useGameStore';
import { PACK_PRICE } from '../utils/packs';
import { audioService } from '../services/audioService';
import { t, tp } from '../utils/i18n';
import { Confetti } from './Confetti';

interface Props {
    user: UserProfile;
    summary: SessionSummary | null;
    correctCount: number;
    totalQuestions: number;
    coins: number;
    perfect: boolean;
    hasNext: boolean;
    onNext: () => void;
    onMap: () => void;
    onOpenPack: () => void;
}

const STAR_DELAY_MS = 600;

export const ResultScreen: React.FC<Props> = ({
    user, summary, correctCount, totalQuestions, coins, perfect, hasNext, onNext, onMap, onOpenPack,
}) => {
    const lang = user.language;
    const stars = summary?.stars ?? 1;
    const [shownStars, setShownStars] = useState(0);
    const [shownCoins, setShownCoins] = useState(0);

    useEffect(() => {
        const timers = Array.from({ length: stars }, (_, i) =>
            window.setTimeout(() => {
                setShownStars(i + 1);
                audioService.playStar(i);
            }, STAR_DELAY_MS * (i + 1)),
        );
        return () => timers.forEach((id) => window.clearTimeout(id));
    }, [stars]);

    useEffect(() => {
        if (coins <= 0) return;
        const step = Math.max(1, Math.ceil(coins / 30));
        const id = window.setInterval(() => {
            setShownCoins((c) => {
                if (c + step >= coins) {
                    window.clearInterval(id);
                    return coins;
                }
                return c + step;
            });
        }, 40);
        return () => window.clearInterval(id);
    }, [coins]);

    const canOpenPack = user.tickets > 0 || user.coins >= PACK_PRICE[user.mode];
    const big = user.mode === 'kinder' ? 'min-h-[72px] text-2xl' : 'min-h-14 text-xl';

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 flex flex-col items-center justify-center p-4 font-sans">
            {stars === 3 && <Confetti />}
            <div className="bg-white/95 p-6 rounded-3xl shadow-2xl text-center max-w-md w-full border-[6px] border-[#d4a373]">
                <h2 className="text-3xl font-black text-green-800 mb-3">{t('practiceComplete', lang)}</h2>

                <div className="flex justify-center gap-2 mb-3 text-6xl" aria-label={`${stars} / 3`}>
                    {[1, 2, 3].map((n) => (
                        <span key={n} className={n <= shownStars ? 'animate-star-pop' : 'opacity-20 grayscale'}>
                            ⭐
                        </span>
                    ))}
                </div>
                {summary?.isNewBest && shownStars >= stars && (
                    <p className="text-lg font-black text-purple-600 mb-1">{t('newBest', lang)}</p>
                )}

                {user.mode !== 'kinder' && (
                    <p className="text-xl text-amber-800 mb-1 font-bold">
                        {t('correctCount', lang)}: {correctCount} / {totalQuestions}
                    </p>
                )}
                <p className="text-3xl font-black text-amber-600 mb-1">+ {shownCoins} 🪙</p>
                {perfect && <p className="text-base font-bold text-green-700">{t('perfectBonus', lang)}</p>}

                <div className="my-3 flex flex-col gap-1 text-base font-bold text-amber-900">
                    {summary?.streakIncreased && (
                        <div className="bg-orange-100 rounded-xl px-3 py-2">
                            {tp('streakToast', lang, { n: summary.streak.count })}
                        </div>
                    )}
                    {summary?.dailyTicket && (
                        <div className="bg-sky-100 rounded-xl px-3 py-2">{t('dailyTicketEarned', lang)}</div>
                    )}
                    {summary?.milestoneTicket && (
                        <div className="bg-sky-100 rounded-xl px-3 py-2">{t('milestoneTicketEarned', lang)}</div>
                    )}
                    {summary !== null && summary.newMasteredFacts > 0 && (
                        <div className="bg-blue-100 rounded-xl px-3 py-2" data-testid="new-squares">
                            {tp('newSquares', lang, { n: summary.newMasteredFacts })}
                        </div>
                    )}
                    {summary !== null && summary.chartTickets > 0 && (
                        <div className="bg-sky-100 rounded-xl px-3 py-2" data-testid="chart-tickets">
                            {tp('chartTicketsEarned', lang, { n: summary.chartTickets })}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    {canOpenPack && (
                        <button
                            onClick={onOpenPack}
                            className={`${big} w-full bg-purple-500 hover:bg-purple-400 text-white font-black rounded-2xl border-b-8 border-purple-700 transition active:translate-y-1 active:border-b-4 animate-node-pulse`}
                        >
                            {t('openPack', lang)}
                        </button>
                    )}
                    {hasNext && (
                        <button
                            onClick={onNext}
                            className={`${big} w-full bg-green-500 hover:bg-green-400 text-white font-black rounded-2xl border-b-8 border-green-700 transition active:translate-y-1 active:border-b-4`}
                        >
                            {t('nextSkill', lang)}
                        </button>
                    )}
                    <button
                        onClick={onMap}
                        className={`${big} w-full bg-amber-200 hover:bg-amber-100 text-amber-900 font-black rounded-2xl border-b-8 border-amber-400 transition active:translate-y-1 active:border-b-4`}
                    >
                        {t('backToMap', lang)}
                    </button>
                </div>
            </div>
        </div>
    );
};
