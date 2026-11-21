import React, { useEffect, useRef, useState } from 'react';
import { cardsById } from '../data/cards';
import { useCurrentUser, useGameStore, type PackResult } from '../store/useGameStore';
import { audioService } from '../services/audioService';
import { PACK_PRICE } from '../utils/packs';
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-sans"
        >
            {phase === 'revealed' && card && card.rarity >= 3 && <Confetti count={30} />}
            <div className="relative w-full max-w-sm rounded-3xl border-[6px] border-[#d4a373] bg-white p-6 text-center shadow-2xl">
                {phase !== 'revealed' && (
                    <>
                        <button
                            onClick={open}
                            aria-label={t('packTapToOpen', lang)}
                            className={`mx-auto block text-[7rem] leading-none ${phase === 'shaking' ? 'animate-pack-shake' : 'animate-node-pulse'}`}
                        >
                            🎁
                        </button>
                        <p className="mt-3 text-2xl font-black text-purple-700">{t('packTapToOpen', lang)}</p>
                        <p className="mt-1 text-lg font-bold text-amber-800">{tp('packCost', lang, { n: price })}</p>
                        <p className="text-base font-bold text-neutral-600">
                            🎫 {user.tickets} · 🪙 {user.coins}
                        </p>
                        {(broke || !canAfford) && (
                            <p className="mt-2 font-bold text-amber-700">{t('packCannotAfford', lang)}</p>
                        )}
                    </>
                )}

                {phase === 'revealed' && card && result && (
                    <>
                        <div className="animate-card-flip flex justify-center">
                            <CardView card={card} size="lg" lang={lang} />
                        </div>
                        <div className="mt-3 text-2xl font-black">
                            {result.isNew ? (
                                <span className="rounded-full bg-yellow-300 px-4 py-1 text-amber-900">{t('cardNew', lang)}</span>
                            ) : (
                                <span className="text-amber-700">{tp('duplicateRefund', lang, { n: result.refund })}</span>
                            )}
                        </div>
                        <div className="mt-1 text-lg font-bold text-neutral-600">
                            {t(`rarity_${card.rarity}`, lang)} {'⭐'.repeat(card.rarity)}
                        </div>
                    </>
                )}

                <div className="mt-4 flex flex-col gap-3">
                    {phase === 'revealed' && canAfford && (
                        <button
                            onClick={again}
                            className={`${bigButton} w-full rounded-2xl border-b-8 border-purple-700 bg-purple-500 font-black text-white`}
                        >
                            {t('openAnother', lang)}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className={`${bigButton} w-full rounded-2xl border-b-8 border-amber-400 bg-amber-200 font-black text-amber-900`}
                    >
                        {t('close', lang)}
                    </button>
                </div>
            </div>
        </div>
    );
};
