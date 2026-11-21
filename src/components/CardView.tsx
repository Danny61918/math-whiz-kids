import React, { useState } from 'react';
import type { Card } from '../data/cards';
import type { Language } from '../utils/i18n';
import { cardArtUrl } from '../utils/cardArt';

export type CardSize = 'sm' | 'md' | 'lg';

// Pixel box of the picture area per size; the card is 5:7.
const SIZES: Record<CardSize, { width: number; art: number; emoji: string; name: string }> = {
    sm: { width: 88, art: 72, emoji: 'text-4xl', name: 'text-[10px]' },
    md: { width: 140, art: 116, emoji: 'text-6xl', name: 'text-sm' },
    lg: { width: 220, art: 190, emoji: 'text-8xl', name: 'text-xl' },
};

interface Props {
    card: Card;
    size?: CardSize;
    silhouette?: boolean;
    lang?: Language; // when given, the card name is printed on the card
    className?: string;
}

const Face: React.FC<Props> = ({ card, size = 'md', silhouette = false, lang, className = '' }) => {
    // Art is user-supplied: public/cards/<id>.webp. Falls back to emoji + hue when missing or broken.
    const [imageState, setImageState] = useState<'loading' | 'loaded' | 'failed'>('loading');
    const dim = SIZES[size];
    const hue = card.hue ?? 0;
    const background = silhouette ? '#1f2937' : `hsl(${hue} 70% 88%)`;
    const artUrl = card.art ?? cardArtUrl(card.id);
    const name = lang ? (lang === 'en' ? card.nameEn : card.nameZh) : null;

    return (
        <div
            className={`inline-flex flex-col items-center justify-center rounded-2xl border-4 p-1 select-none card-frame-${card.rarity} ${className}`}
            style={{ width: dim.width, backgroundColor: background, ['--card-bg' as string]: background }}
        >
            <div
                className="flex items-center justify-center overflow-hidden rounded-xl"
                style={{ width: dim.art, height: dim.art }}
            >
                {silhouette ? (
                    <span className={`${dim.emoji} font-black text-gray-500`}>?</span>
                ) : (
                    <>
                        {imageState !== 'loaded' && <span className={dim.emoji}>{card.emoji}</span>}
                        {imageState !== 'failed' && (
                            <img
                                src={artUrl}
                                alt=""
                                loading="lazy"
                                width={dim.art}
                                height={dim.art}
                                onLoad={() => setImageState('loaded')}
                                onError={() => setImageState('failed')}
                                className={imageState === 'loaded' ? 'h-full w-full object-contain' : 'hidden'}
                            />
                        )}
                    </>
                )}
            </div>
            {name && !silhouette && (
                <div className={`mt-1 w-full truncate text-center font-black text-amber-900 ${dim.name}`}>{name}</div>
            )}
        </div>
    );
};

/** One reusable card face: emoji or art, hue tint, rarity frame, or a dark silhouette. */
export const CardView: React.FC<Props> = (props) => <Face key={props.card.id} {...props} />;
