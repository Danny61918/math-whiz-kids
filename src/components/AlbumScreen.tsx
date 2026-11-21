import React, { useId, useRef, useState } from 'react';
import { CATEGORIES, cards, type Card, type CardCategory } from '../data/cards';
import { useCurrentUser } from '../store/useGameStore';
import { t, tp, type Language } from '../utils/i18n';
import { useModal } from '../utils/useModal';
import { CardView } from './CardView';

const CATEGORY_ICON: Record<CardCategory, string> = {
    dino: '🦖', car: '🚗', plane: '✈️', ship_train: '🚂', space: '🚀', rescue: '🚒',
};

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

function speak(text: string, lang: 'en-US' | 'zh-TW') {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
}

const CardDetail: React.FC<{ card: Card; owned: number; lang: Language; isKinder: boolean; onClose: () => void }> = ({
    card, owned, lang, isKinder, onClose,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useModal(ref, onClose);
    const tall = isKinder ? 'min-h-[72px]' : 'min-h-14';
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            ref={ref}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
            <div className="w-full max-w-sm rounded-3xl border-[6px] border-[#d4a373] bg-white p-5 text-center shadow-2xl">
                <div className="flex justify-center">
                    <CardView card={card} size="lg" />
                </div>
                <h2 id={titleId} className="mt-3 text-2xl font-black text-amber-900">{card.nameEn}</h2>
                <div className="text-2xl font-black text-amber-900">{card.nameZh}</div>
                <div className="mt-1 font-bold text-neutral-600">
                    {t(`rarity_${card.rarity}`, lang)} {'⭐'.repeat(card.rarity)}
                </div>
                <div className="font-bold text-neutral-600">{tp('copiesOwned', lang, { n: owned })}</div>
                {canSpeak && (
                    <div className="mt-3 flex gap-2">
                        <button onClick={() => speak(card.nameEn, 'en-US')} className={`${tall} flex-1 rounded-xl bg-sky-500 text-lg font-black text-white`}>
                            {t('speakEn', lang)}
                        </button>
                        <button onClick={() => speak(card.nameZh, 'zh-TW')} className={`${tall} flex-1 rounded-xl bg-sky-500 text-lg font-black text-white`}>
                            {t('speakZh', lang)}
                        </button>
                    </div>
                )}
                <button
                    onClick={onClose}
                    data-autofocus
                    className={`mt-3 ${tall} w-full rounded-2xl border-b-8 border-amber-400 bg-amber-200 text-xl font-black text-amber-900`}
                >
                    {t('close', lang)}
                </button>
            </div>
        </div>
    );
};

export const AlbumScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const user = useCurrentUser();
    const [category, setCategory] = useState<CardCategory>('dino');
    const [selected, setSelected] = useState<Card | null>(null);
    if (!user) return null;

    const lang = user.language;
    const isKinder = user.mode === 'kinder';
    const owned = (c: Card) => user.cards[c.id] ?? 0;
    const totalOwned = cards.filter((c) => owned(c) > 0).length;
    const list = cards.filter((c) => c.category === category);

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-200 via-sky-100 to-green-200 flex flex-col items-center p-4 font-sans overflow-x-hidden">
            <div className="w-full max-w-md">
                <div className="flex items-center justify-between mb-3 gap-2">
                    <button
                        onClick={onBack}
                        aria-label={t('back', lang)}
                        className={`${isKinder ? 'min-h-[72px] min-w-[72px] text-3xl' : 'min-h-12'} rounded-xl border-2 border-amber-900/10 bg-white/70 px-4 text-lg font-bold text-amber-900`}
                    >
                        {isKinder ? '🏠' : t('back', lang)}
                    </button>
                    <h1 className="text-2xl font-black text-purple-900">{t('albumTitle', lang)}</h1>
                </div>

                <div className="mb-3">
                    <div className="flex justify-between text-lg font-black text-purple-900">
                        <span>🃏</span>
                        <span>{tp('albumProgress', lang, { owned: totalOwned, total: cards.length })}</span>
                    </div>
                    <div className="h-4 w-full overflow-hidden rounded-full bg-white/80">
                        <div className="h-full bg-purple-500" style={{ width: `${(totalOwned / cards.length) * 100}%` }} />
                    </div>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2" role="tablist">
                    {CATEGORIES.map((cat) => {
                        const items = cards.filter((c) => c.category === cat);
                        const have = items.filter((c) => owned(c) > 0).length;
                        const complete = have === items.length;
                        return (
                            <button
                                key={cat}
                                role="tab"
                                aria-selected={category === cat}
                                onClick={() => setCategory(cat)}
                                className={`${isKinder ? 'min-h-[88px]' : 'min-h-16'} rounded-xl border-b-4 px-1 py-1 text-sm font-black leading-tight ${
                                    category === cat
                                        ? 'border-purple-700 bg-purple-500 text-white'
                                        : 'border-purple-200 bg-white/90 text-purple-900'
                                }`}
                            >
                                <div className="text-2xl">{CATEGORY_ICON[cat]}{complete ? '✨' : ''}</div>
                                <div>{t(`cat_${cat}`, lang)}</div>
                                <div className="text-xs">{have}/{items.length}</div>
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-3 justify-items-center gap-2">
                    {list.map((card) => {
                        const discovered = owned(card) > 0;
                        return (
                            <button
                                key={card.id}
                                disabled={!discovered}
                                onClick={() => setSelected(card)}
                                aria-label={discovered ? (lang === 'en' ? card.nameEn : card.nameZh) : t('undiscovered', lang)}
                                className="rounded-2xl disabled:cursor-default"
                            >
                                <CardView card={card} size="sm" silhouette={!discovered} lang={lang} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {selected && (
                <CardDetail card={selected} owned={owned(selected)} lang={lang} isKinder={isKinder} onClose={() => setSelected(null)} />
            )}
        </div>
    );
};
