import React, { useEffect, useId, useRef, useState } from 'react';
import { cardsById } from '../data/cards';
import { useCurrentUser, useGameStore, type PackResult } from '../store/useGameStore';
import { audioService } from '../services/audioService';
import { PACK_PRICE } from '../utils/packs';
import { useModal } from '../utils/useModal';
import { t, tp } from '../utils/i18n';
import { CardView } from './CardView';
import { Confetti } from './Confetti';

type Phase = 'closed' | 'shaking' | 'revealed';

const SHAKE_MS = 800;

export const PackOpenModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const user = useCurrentUser();
    const openPack = useGameStore((s) => s.openPack);
    const [phase, setPhase] = useState<Phase>('closed');
    const [result, setResult] = useState<PackResult | null>(null);
    const [broke, setBroke] = useState(false);
    const timerRef = useRef<number | undefined>(undefined);
    const dialogRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useModal(dialogRef, phase === 'shaking' ? undefined : onClose);

    useEffect(() => {
        if (phase !== 'shaking') dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }, [phase]);

    useEffect(() => () => window.clearTimeout(timerRef.current), []);

    if (!user) return null;
    const lang = user.language;
    const isKinder = user.mode === 'kinder';
    const price = PACK_PRICE[user.mode];
    const canAfford = user.tickets > 0 || user.coins >= price;

    const open = () => {
        if (phase !== 'closed') return;
        const pack = openPack();
        if (!pack) {
            setBroke(true);
            return;
        }
        setBroke(false);
        setResult(pack);
        setPhase('shaking');
        timerRef.current = window.setTimeout(() => {
            setPhase('revealed');
            audioService.playReveal(cardsById[pack.cardId].rarity, isKinder);
        }, SHAKE_MS);
    };

    const again = () => {
        setResult(null);
        setPhase('closed');
    };

    const card = result ? cardsById[result.cardId] : null;
    const bigButton = isKinder ? 'min-h-[72px] text-2xl' : 'min-h-14 text-xl';

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            ref={dialogRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-sans"
        >
            {phase === 'revealed' && card && card.rarity >= 3 && <Confetti count={30} />}
            <div className="relative max-h-full w-full max-w-sm overflow-y-auto rounded-3xl border-[6px] border-[#d4a373] bg-white p-6 text-center shadow-2xl">
                {phase !== 'revealed' && (
                    <>
                        <button
                            onClick={open}
                            aria-label={t('packTapToOpen', lang)}
                            data-autofocus
                        className={`mx-auto block text-[7rem] leading-none ${phase === 'shaking' ? 'animate-pack-shake' : 'animate-node-pulse'}`}
                        >
                            🎁
                        </button>
                        <p id={titleId} className="mt-3 text-2xl font-black text-purple-800">{t('packTapToOpen', lang)}</p>
                        <p className="mt-1 text-lg font-bold text-amber-900">{tp('packCost', lang, { n: price })}</p>
                        <p className="text-lg font-bold text-stone-700">
                            🎫 {user.tickets} · 🪙 {user.coins}
                        </p>
                        {(broke || !canAfford) && (
                            <p className="mt-2 text-lg font-bold text-amber-900">{t('packCannotAfford', lang)}</p>
                        )}
                    </>
                )}

                {phase === 'revealed' && card && result && (
                    <>
                        <h2 id={titleId} className="sr-only">
                            {lang === 'en' ? card.nameEn : card.nameZh}
                        </h2>
                        <div className="animate-card-flip relative flex justify-center">
                            {card.rarity >= 2 &&
                                ['-left-2 top-2', '-right-2 top-10', 'left-2 bottom-4', 'right-4 -top-2'].map((pos, i) => (
                                    <span
                                        key={pos}
                                        aria-hidden="true"
                                        className={`animate-sparkle absolute text-3xl ${pos}`}
                                        style={{ animationDelay: `${i * 0.4}s` }}
                                    >
                                        ✨
                                    </span>
                                ))}
                            <CardView card={card} size="lg" lang={lang} />
                        </div>
                        <div className="mt-3 text-2xl font-black">
                            {result.isNew ? (
                                <span className="rounded-full bg-yellow-300 px-4 py-1 text-amber-900">{t('cardNew', lang)}</span>
                            ) : (
                                <span className="text-amber-900">{tp('duplicateRefund', lang, { n: result.refund })}</span>
                            )}
                        </div>
                        <div className="mt-1 text-lg font-bold text-stone-700">
                            {t(`rarity_${card.rarity}`, lang)} {'⭐'.repeat(card.rarity)}
                        </div>
                    </>
                )}

                <div className="mt-4 flex flex-col gap-3">
                    {phase === 'revealed' && canAfford && (
                        <button
                            onClick={again}
                            data-autofocus
                            className={`${bigButton} w-full rounded-2xl border-b-8 border-purple-900 bg-purple-700 font-black text-white`}
                        >
                            {t('openAnother', lang)}
                        </button>
                    )}
                    {phase !== 'shaking' && (
                        <button
                            onClick={onClose}
                            data-autofocus={phase === 'revealed' && !canAfford ? true : undefined}
                            className={`${bigButton} w-full rounded-2xl border-b-8 border-amber-400 bg-amber-200 font-black text-amber-950`}
                        >
                            {t('close', lang)}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
