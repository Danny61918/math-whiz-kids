import React, { useId, useRef, useState } from 'react';
import { CATEGORIES, cards, type Card, type CardCategory } from '../data/cards';
import { useCurrentUser } from '../store/useGameStore';
import { t, tp, type Language } from '../utils/i18n';
import { useModal } from '../utils/useModal';
import { CardView } from './CardView';
import { TopBar } from './TopBar';

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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-sans"
        >
            <div className="max-h-full w-full max-w-sm overflow-y-auto rounded-3xl border-[6px] border-[#d4a373] bg-white p-5 text-center shadow-2xl">
                <div className="flex justify-center">
                    <CardView card={card} size="lg" />
                </div>
                <h2 id={titleId} className="mt-3 text-2xl font-black leading-tight text-amber-950">{card.nameEn}</h2>
                <div className="text-2xl font-black leading-tight text-amber-950">{card.nameZh}</div>
                <div className="mt-1 text-lg font-bold text-stone-700">
                    {t(`rarity_${card.rarity}`, lang)} {'⭐'.repeat(card.rarity)}
                </div>
                <div className="text-lg font-bold text-stone-700">{tp('copiesOwned', lang, { n: owned })}</div>
                {canSpeak && (
                    <div className="mt-3 flex gap-2">
                        <button onClick={() => speak(card.nameEn, 'en-US')} className={`${tall} flex-1 rounded-xl bg-sky-700 text-lg font-black text-white`}>
                            {t('speakEn', lang)}
                        </button>
                        <button onClick={() => speak(card.nameZh, 'zh-TW')} className={`${tall} flex-1 rounded-xl bg-sky-700 text-lg font-black text-white`}>
                            {t('speakZh', lang)}
                        </button>
                    </div>
                )}
                <button
                    onClick={onClose}
                    data-autofocus
                    className={`mt-3 ${tall} w-full rounded-2xl border-b-8 border-amber-400 bg-amber-200 text-xl font-black text-amber-950`}
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
        <div className="min-h-dvh overflow-x-hidden bg-gradient-to-b from-purple-200 via-sky-100 to-green-200 px-4 pb-10 pt-4 font-sans">
            <div className="mx-auto flex w-full max-w-[672px] flex-col gap-3">
                <TopBar lang={lang} isKinder={isKinder} onBack={onBack} title={t('albumTitle', lang)} />

                <div className="rounded-2xl bg-white px-3 py-2">
                    <div className="flex items-center justify-between text-xl font-black text-purple-950">
                        <span aria-hidden="true">🃏</span>
                        <span>{tp('albumProgress', lang, { owned: totalOwned, total: cards.length })}</span>
                    </div>
                    <div className="mt-1 h-4 w-full overflow-hidden rounded-full bg-purple-100">
                        <div className="h-full bg-purple-600" style={{ width: `${(totalOwned / cards.length) * 100}%` }} />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2" role="tablist">
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
                                className={`${isKinder ? 'min-h-[96px]' : 'min-h-[80px]'} rounded-xl border-b-4 px-1 py-1 text-base font-black leading-tight ${
                                    category === cat ? 'border-purple-900 bg-purple-700 text-white' : 'border-purple-300 bg-white text-purple-950'
                                }`}
                            >
                                <div className="text-2xl leading-none">
                                    {CATEGORY_ICON[cat]}
                                    {complete ? '✨' : ''}
                                </div>
                                <div>{t(`cat_${cat}`, lang)}</div>
                                <div className="text-sm font-bold">
                                    {have}/{items.length}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
                    {list.map((card) => {
                        const discovered = owned(card) > 0;
                        return (
                            <button
                                key={card.id}
                                disabled={!discovered}
                                onClick={() => setSelected(card)}
                                aria-label={discovered ? (lang === 'en' ? card.nameEn : card.nameZh) : t('undiscovered', lang)}
                                className="min-w-0 rounded-2xl disabled:cursor-default"
                            >
                                <CardView card={card} size="sm" fluid silhouette={!discovered} lang={lang} />
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
